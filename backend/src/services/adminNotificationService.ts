import { Pool } from 'pg';
import { EmailService } from './emailService';
import { WebSocketService } from './websocketService';
import { SubmissionAnalyticsService } from './submissionAnalyticsService';

export interface NotificationRule {
  id: string;
  name: string;
  type: 'submission_failure' | 'high_failure_rate' | 'queue_backlog' | 'system_health' | 'university_down';
  enabled: boolean;
  conditions: {
    threshold?: number;
    timeWindow?: number; // minutes
    consecutiveFailures?: number;
    universities?: string[];
  };
  actions: {
    email?: {
      recipients: string[];
      template: string;
    };
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers?: Record<string, string>;
    };
    websocket?: {
      channel: string;
      message: string;
    };
  };
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface NotificationEvent {
  id: string;
  ruleId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class AdminNotificationService {
  private db: Pool;
  private emailService: EmailService;
  private websocketService?: WebSocketService;
  private analyticsService: SubmissionAnalyticsService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(
    db: Pool, 
    emailService: EmailService, 
    websocketService?: WebSocketService
  ) {
    this.db = db;
    this.emailService = emailService;
    this.websocketService = websocketService;
    this.analyticsService = new SubmissionAnalyticsService(db);
  }

  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting admin notification monitoring (${intervalMinutes} minute intervals)...`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllRules();
      } catch (error) {
        console.error('Error in notification monitoring:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Run initial check
    await this.checkAllRules();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Stopped admin notification monitoring');
  }

  async createNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<NotificationRule> {
    const query = `
      INSERT INTO notification_rules (name, type, enabled, conditions, actions, cooldown_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      rule.name,
      rule.type,
      rule.enabled,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.cooldownMinutes
    ];

    const result = await this.db.query(query, values);
    const savedRule = result.rows[0];

    return {
      ...savedRule,
      conditions: JSON.parse(savedRule.conditions),
      actions: JSON.parse(savedRule.actions)
    };
  }

  async updateNotificationRule(id: string, updates: Partial<NotificationRule>): Promise<NotificationRule> {
    const updateFields = [];
    const values = [id];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramIndex}`);
      values.push(updates.enabled);
      paramIndex++;
    }

    if (updates.conditions !== undefined) {
      updateFields.push(`conditions = $${paramIndex}`);
      values.push(JSON.stringify(updates.conditions));
      paramIndex++;
    }

    if (updates.actions !== undefined) {
      updateFields.push(`actions = $${paramIndex}`);
      values.push(JSON.stringify(updates.actions));
      paramIndex++;
    }

    if (updates.cooldownMinutes !== undefined) {
      updateFields.push(`cooldown_minutes = $${paramIndex}`);
      values.push(updates.cooldownMinutes);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE notification_rules 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Notification rule not found');
    }

    const updatedRule = result.rows[0];
    return {
      ...updatedRule,
      conditions: JSON.parse(updatedRule.conditions),
      actions: JSON.parse(updatedRule.actions)
    };
  }

  async getNotificationRules(): Promise<NotificationRule[]> {
    const query = 'SELECT * FROM notification_rules ORDER BY created_at DESC';
    const result = await this.db.query(query);

    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions),
      actions: JSON.parse(row.actions)
    }));
  }

  async deleteNotificationRule(id: string): Promise<void> {
    const query = 'DELETE FROM notification_rules WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Notification rule not found');
    }
  }

  private async checkAllRules(): Promise<void> {
    const rules = await this.getNotificationRules();
    const enabledRules = rules.filter(rule => rule.enabled);

    for (const rule of enabledRules) {
      try {
        await this.checkRule(rule);
      } catch (error) {
        console.error(`Error checking rule ${rule.name}:`, error);
      }
    }
  }

  private async checkRule(rule: NotificationRule): Promise<void> {
    // Check cooldown
    if (rule.lastTriggered) {
      const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60 * 1000);
      if (new Date() < cooldownEnd) {
        return; // Still in cooldown
      }
    }

    let shouldTrigger = false;
    let eventData: any = {};
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let title = '';
    let message = '';

    switch (rule.type) {
      case 'submission_failure':
        const failureResult = await this.checkSubmissionFailures(rule);
        shouldTrigger = failureResult.shouldTrigger;
        eventData = failureResult.data;
        severity = failureResult.severity;
        title = failureResult.title;
        message = failureResult.message;
        break;

      case 'high_failure_rate':
        const failureRateResult = await this.checkHighFailureRate(rule);
        shouldTrigger = failureRateResult.shouldTrigger;
        eventData = failureRateResult.data;
        severity = failureRateResult.severity;
        title = failureRateResult.title;
        message = failureRateResult.message;
        break;

      case 'queue_backlog':
        const backlogResult = await this.checkQueueBacklog(rule);
        shouldTrigger = backlogResult.shouldTrigger;
        eventData = backlogResult.data;
        severity = backlogResult.severity;
        title = backlogResult.title;
        message = backlogResult.message;
        break;

      case 'system_health':
        const healthResult = await this.checkSystemHealth(rule);
        shouldTrigger = healthResult.shouldTrigger;
        eventData = healthResult.data;
        severity = healthResult.severity;
        title = healthResult.title;
        message = healthResult.message;
        break;

      case 'university_down':
        const universityResult = await this.checkUniversityStatus(rule);
        shouldTrigger = universityResult.shouldTrigger;
        eventData = universityResult.data;
        severity = universityResult.severity;
        title = universityResult.title;
        message = universityResult.message;
        break;
    }

    if (shouldTrigger) {
      await this.triggerNotification(rule, {
        type: rule.type,
        severity,
        title,
        message,
        data: eventData
      });
    }
  }

  private async checkSubmissionFailures(rule: NotificationRule): Promise<{
    shouldTrigger: boolean;
    data: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }> {
    const timeWindow = rule.conditions.timeWindow || 60; // minutes
    const threshold = rule.conditions.threshold || 5;

    const query = `
      SELECT COUNT(*) as failure_count,
             array_agg(DISTINCT u.name) as affected_universities
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE s.status = 'failed' 
        AND s.updated_at >= NOW() - INTERVAL '${timeWindow} minutes'
    `;

    const result = await this.db.query(query);
    const failureCount = parseInt(result.rows[0].failure_count);
    const affectedUniversities = result.rows[0].affected_universities || [];

    const shouldTrigger = failureCount >= threshold;
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (failureCount >= threshold * 3) severity = 'critical';
    else if (failureCount >= threshold * 2) severity = 'high';

    return {
      shouldTrigger,
      data: {
        failureCount,
        affectedUniversities,
        timeWindow
      },
      severity,
      title: `High Submission Failure Rate`,
      message: `${failureCount} submission failures in the last ${timeWindow} minutes across ${affectedUniversities.length} universities`
    };
  }

  private async checkHighFailureRate(rule: NotificationRule): Promise<{
    shouldTrigger: boolean;
    data: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }> {
    const timeWindow = rule.conditions.timeWindow || 60; // minutes
    const threshold = rule.conditions.threshold || 50; // percentage

    const query = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_submissions
      FROM submissions
      WHERE created_at >= NOW() - INTERVAL '${timeWindow} minutes'
    `;

    const result = await this.db.query(query);
    const totalSubmissions = parseInt(result.rows[0].total_submissions);
    const failedSubmissions = parseInt(result.rows[0].failed_submissions);
    
    const failureRate = totalSubmissions > 0 ? (failedSubmissions / totalSubmissions) * 100 : 0;
    const shouldTrigger = totalSubmissions >= 10 && failureRate >= threshold;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (failureRate >= 80) severity = 'critical';
    else if (failureRate >= 70) severity = 'high';

    return {
      shouldTrigger,
      data: {
        failureRate: Math.round(failureRate * 100) / 100,
        totalSubmissions,
        failedSubmissions,
        timeWindow
      },
      severity,
      title: `High Failure Rate Alert`,
      message: `${failureRate.toFixed(1)}% failure rate (${failedSubmissions}/${totalSubmissions}) in the last ${timeWindow} minutes`
    };
  }

  private async checkQueueBacklog(rule: NotificationRule): Promise<{
    shouldTrigger: boolean;
    data: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }> {
    const threshold = rule.conditions.threshold || 100;

    const query = `
      SELECT COUNT(*) as pending_count
      FROM submissions
      WHERE status = 'pending'
    `;

    const result = await this.db.query(query);
    const pendingCount = parseInt(result.rows[0].pending_count);
    
    const shouldTrigger = pendingCount >= threshold;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (pendingCount >= threshold * 3) severity = 'critical';
    else if (pendingCount >= threshold * 2) severity = 'high';

    return {
      shouldTrigger,
      data: {
        pendingCount,
        threshold
      },
      severity,
      title: `Queue Backlog Alert`,
      message: `${pendingCount} submissions pending in queue (threshold: ${threshold})`
    };
  }

  private async checkSystemHealth(rule: NotificationRule): Promise<{
    shouldTrigger: boolean;
    data: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }> {
    const healthMetrics = await this.analyticsService.getSystemHealthMetrics();
    
    const shouldTrigger = healthMetrics.overallHealth === 'critical' || 
                         (healthMetrics.overallHealth === 'warning' && rule.conditions.threshold === 1);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (healthMetrics.overallHealth === 'critical') severity = 'critical';
    else if (healthMetrics.overallHealth === 'warning') severity = 'high';

    return {
      shouldTrigger,
      data: {
        overallHealth: healthMetrics.overallHealth,
        metrics: healthMetrics.metrics,
        alerts: healthMetrics.alerts
      },
      severity,
      title: `System Health Alert`,
      message: `System health is ${healthMetrics.overallHealth}. ${healthMetrics.alerts.length} active alerts.`
    };
  }

  private async checkUniversityStatus(rule: NotificationRule): Promise<{
    shouldTrigger: boolean;
    data: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }> {
    const timeWindow = rule.conditions.timeWindow || 30; // minutes
    const consecutiveFailures = rule.conditions.consecutiveFailures || 5;
    const universities = rule.conditions.universities || [];

    let universityFilter = '';
    let queryParams: any[] = [timeWindow, consecutiveFailures];
    
    if (universities.length > 0) {
      universityFilter = 'AND u.id = ANY($3)';
      queryParams.push(universities);
    }

    const query = `
      WITH recent_failures AS (
        SELECT 
          u.id,
          u.name,
          COUNT(*) as failure_count,
          COUNT(*) FILTER (WHERE s.status = 'confirmed') as success_count
        FROM submissions s
        JOIN universities u ON s.university_id = u.id
        WHERE s.created_at >= NOW() - INTERVAL '${timeWindow} minutes'
          ${universityFilter}
        GROUP BY u.id, u.name
      )
      SELECT *
      FROM recent_failures
      WHERE failure_count >= $2 AND success_count = 0
    `;

    const result = await this.db.query(query, queryParams);
    const downUniversities = result.rows;
    
    const shouldTrigger = downUniversities.length > 0;

    return {
      shouldTrigger,
      data: {
        downUniversities,
        timeWindow,
        consecutiveFailures
      },
      severity: 'high',
      title: `University Integration Down`,
      message: `${downUniversities.length} universities appear to be down: ${downUniversities.map(u => u.name).join(', ')}`
    };
  }

  private async triggerNotification(
    rule: NotificationRule, 
    event: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      message: string;
      data: any;
    }
  ): Promise<void> {
    // Create notification event record
    const notificationEvent = await this.createNotificationEvent(rule.id, event);

    // Update rule's last triggered time
    await this.updateRuleLastTriggered(rule.id);

    // Execute actions
    if (rule.actions.email) {
      await this.sendEmailNotification(rule.actions.email, event);
    }

    if (rule.actions.webhook) {
      await this.sendWebhookNotification(rule.actions.webhook, event);
    }

    if (rule.actions.websocket && this.websocketService) {
      await this.sendWebSocketNotification(rule.actions.websocket, event);
    }

    console.log(`Triggered notification: ${event.title} (Rule: ${rule.name})`);
  }

  private async createNotificationEvent(
    ruleId: string, 
    event: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      message: string;
      data: any;
    }
  ): Promise<NotificationEvent> {
    const query = `
      INSERT INTO notification_events (rule_id, type, severity, title, message, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      ruleId,
      event.type,
      event.severity,
      event.title,
      event.message,
      JSON.stringify(event.data)
    ];

    const result = await this.db.query(query, values);
    const savedEvent = result.rows[0];

    return {
      ...savedEvent,
      data: JSON.parse(savedEvent.data)
    };
  }

  private async updateRuleLastTriggered(ruleId: string): Promise<void> {
    const query = `
      UPDATE notification_rules 
      SET last_triggered = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [ruleId]);
  }

  private async sendEmailNotification(
    emailConfig: { recipients: string[]; template: string },
    event: any
  ): Promise<void> {
    try {
      for (const recipient of emailConfig.recipients) {
        await this.emailService.sendEmail({
          to: recipient,
          subject: `[StellarRec Alert] ${event.title}`,
          template: emailConfig.template,
          data: {
            title: event.title,
            message: event.message,
            severity: event.severity,
            timestamp: new Date().toISOString(),
            data: event.data
          }
        });
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private async sendWebhookNotification(
    webhookConfig: { url: string; method: 'POST' | 'PUT'; headers?: Record<string, string> },
    event: any
  ): Promise<void> {
    try {
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers
        },
        body: JSON.stringify({
          title: event.title,
          message: event.message,
          severity: event.severity,
          type: event.type,
          timestamp: new Date().toISOString(),
          data: event.data
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  private async sendWebSocketNotification(
    websocketConfig: { channel: string; message: string },
    event: any
  ): Promise<void> {
    try {
      this.websocketService?.broadcast(websocketConfig.channel, {
        type: 'admin_notification',
        title: event.title,
        message: event.message,
        severity: event.severity,
        timestamp: new Date().toISOString(),
        data: event.data
      });
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
    }
  }

  async getNotificationEvents(
    limit: number = 50,
    offset: number = 0,
    severity?: string
  ): Promise<{
    events: NotificationEvent[];
    total: number;
  }> {
    let whereClause = '';
    const queryParams: any[] = [limit, offset];
    
    if (severity) {
      whereClause = 'WHERE severity = $3';
      queryParams.push(severity);
    }

    const countQuery = `SELECT COUNT(*) as total FROM notification_events ${whereClause}`;
    const eventsQuery = `
      SELECT ne.*, nr.name as rule_name
      FROM notification_events ne
      JOIN notification_rules nr ON ne.rule_id = nr.id
      ${whereClause}
      ORDER BY ne.triggered_at DESC
      LIMIT $1 OFFSET $2
    `;

    const [countResult, eventsResult] = await Promise.all([
      this.db.query(countQuery, severity ? [severity] : []),
      this.db.query(eventsQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const events = eventsResult.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));

    return { events, total };
  }

  async acknowledgeEvent(eventId: string, acknowledgedBy: string): Promise<void> {
    const query = `
      UPDATE notification_events 
      SET acknowledged = true, acknowledged_by = $2, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.db.query(query, [eventId, acknowledgedBy]);
    
    if (result.rowCount === 0) {
      throw new Error('Notification event not found');
    }
  }

  async getDefaultNotificationRules(): Promise<Omit<NotificationRule, 'id'>[]> {
    return [
      {
        name: 'High Submission Failures',
        type: 'submission_failure',
        enabled: true,
        conditions: {
          threshold: 10,
          timeWindow: 30
        },
        actions: {
          email: {
            recipients: ['admin@stellarrec.com'],
            template: 'admin_alert'
          }
        },
        cooldownMinutes: 30
      },
      {
        name: 'Critical Failure Rate',
        type: 'high_failure_rate',
        enabled: true,
        conditions: {
          threshold: 75,
          timeWindow: 60
        },
        actions: {
          email: {
            recipients: ['admin@stellarrec.com', 'tech@stellarrec.com'],
            template: 'critical_alert'
          }
        },
        cooldownMinutes: 60
      },
      {
        name: 'Queue Backlog Alert',
        type: 'queue_backlog',
        enabled: true,
        conditions: {
          threshold: 100
        },
        actions: {
          email: {
            recipients: ['admin@stellarrec.com'],
            template: 'admin_alert'
          }
        },
        cooldownMinutes: 60
      },
      {
        name: 'System Health Critical',
        type: 'system_health',
        enabled: true,
        conditions: {
          threshold: 1
        },
        actions: {
          email: {
            recipients: ['admin@stellarrec.com', 'tech@stellarrec.com'],
            template: 'critical_alert'
          }
        },
        cooldownMinutes: 30
      }
    ];
  }
}

// Database table creation functions
export async function createNotificationTables(db: Pool): Promise<void> {
  const createRulesTable = `
    CREATE TABLE IF NOT EXISTS notification_rules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      conditions JSONB NOT NULL,
      actions JSONB NOT NULL,
      cooldown_minutes INTEGER NOT NULL DEFAULT 60,
      last_triggered TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(type);
    CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(enabled);
  `;

  const createEventsTable = `
    CREATE TABLE IF NOT EXISTS notification_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      rule_id UUID NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      acknowledged BOOLEAN DEFAULT false,
      acknowledged_by VARCHAR(255),
      acknowledged_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_notification_events_rule_id ON notification_events(rule_id);
    CREATE INDEX IF NOT EXISTS idx_notification_events_severity ON notification_events(severity);
    CREATE INDEX IF NOT EXISTS idx_notification_events_triggered_at ON notification_events(triggered_at);
    CREATE INDEX IF NOT EXISTS idx_notification_events_acknowledged ON notification_events(acknowledged);
  `;

  await db.query(createRulesTable);
  await db.query(createEventsTable);
}