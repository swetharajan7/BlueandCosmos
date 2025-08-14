import { Pool } from 'pg';
import { getEmailService } from './emailService';
import { getNotificationService } from './notificationService';
import { AppError } from '../utils/AppError';

export class CronJobService {
  private db: Pool;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('⏰ Cron jobs already running');
      return;
    }

    this.isRunning = true;
    console.log('⏰ Starting cron jobs...');

    // Run every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        await this.runScheduledTasks();
      } catch (error) {
        console.error('❌ Error running scheduled tasks:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Run immediately on start
    this.runScheduledTasks().catch(error => {
      console.error('❌ Error running initial scheduled tasks:', error);
    });

    console.log('✅ Cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    console.log('⏰ Cron jobs stopped');
  }

  /**
   * Run all scheduled tasks
   */
  private async runScheduledTasks(): Promise<void> {
    console.log('⏰ Running scheduled tasks...');

    try {
      // Process due reminders
      await this.processDueReminders();

      // Retry failed emails
      await this.retryFailedEmails();

      // Clean up old notifications
      await this.cleanupOldNotifications();

      // Schedule upcoming reminders
      await this.scheduleUpcomingReminders();

      console.log('✅ Scheduled tasks completed');
    } catch (error) {
      console.error('❌ Error in scheduled tasks:', error);
    }
  }

  /**
   * Process due reminders
   */
  private async processDueReminders(): Promise<void> {
    try {
      const notificationService = getNotificationService();
      await notificationService.processDueReminders();
      console.log('✅ Due reminders processed');
    } catch (error) {
      console.error('❌ Error processing due reminders:', error);
    }
  }

  /**
   * Retry failed emails
   */
  private async retryFailedEmails(): Promise<void> {
    try {
      const emailService = getEmailService();
      await emailService.retryFailedEmails();
      console.log('✅ Failed emails retry completed');
    } catch (error) {
      console.error('❌ Error retrying failed emails:', error);
    }
  }

  /**
   * Clean up old notifications and events
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const client = await this.db.connect();
      
      try {
        await client.query('BEGIN');

        // Delete email notifications older than 90 days
        const deleteNotificationsQuery = `
          DELETE FROM email_notifications 
          WHERE created_at < NOW() - INTERVAL '90 days'
        `;
        const notificationsResult = await client.query(deleteNotificationsQuery);

        // Delete email events older than 90 days
        const deleteEventsQuery = `
          DELETE FROM email_events 
          WHERE created_at < NOW() - INTERVAL '90 days'
        `;
        const eventsResult = await client.query(deleteEventsQuery);

        // Delete processed scheduled notifications older than 30 days
        const deleteScheduledQuery = `
          DELETE FROM scheduled_notifications 
          WHERE status IN ('sent', 'failed') AND created_at < NOW() - INTERVAL '30 days'
        `;
        const scheduledResult = await client.query(deleteScheduledQuery);

        await client.query('COMMIT');

        console.log(`✅ Cleanup completed: ${notificationsResult.rowCount} notifications, ${eventsResult.rowCount} events, ${scheduledResult.rowCount} scheduled notifications deleted`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error cleaning up old notifications:', error);
    }
  }

  /**
   * Schedule upcoming reminders
   */
  private async scheduleUpcomingReminders(): Promise<void> {
    try {
      await this.scheduleInvitationExpiryReminders();
      await this.scheduleRecommendationOverdueReminders();
      await this.scheduleApplicationDeadlineReminders();
      console.log('✅ Upcoming reminders scheduled');
    } catch (error) {
      console.error('❌ Error scheduling upcoming reminders:', error);
    }
  }

  /**
   * Schedule reminders for expiring invitations
   */
  private async scheduleInvitationExpiryReminders(): Promise<void> {
    try {
      const query = `
        SELECT r.id, r.professional_email, r.first_name, r.last_name, r.invitation_expires,
               app.legal_name as student_name, app.program_type, app.application_term,
               array_agg(u.name) as universities
        FROM recommenders r
        JOIN applications app ON r.application_id = app.id
        JOIN application_universities au ON app.id = au.application_id
        JOIN universities u ON au.university_id = u.id
        WHERE r.confirmed_at IS NULL 
          AND r.invitation_expires > NOW()
          AND r.invitation_expires <= NOW() + INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1 FROM scheduled_notifications sn 
            WHERE sn.recipient_email = r.professional_email 
              AND sn.reminder_type = 'invitation_expiring'
              AND sn.status = 'pending'
          )
        GROUP BY r.id, r.professional_email, r.first_name, r.last_name, r.invitation_expires,
                 app.legal_name, app.program_type, app.application_term
      `;

      const result = await this.db.query(query);
      const notificationService = getNotificationService();

      for (const row of result.rows) {
        const reminderTime = new Date(row.invitation_expires.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before expiry
        
        if (reminderTime > new Date()) {
          await notificationService.scheduleReminder(
            'invitation_expiring',
            row.professional_email,
            `${row.first_name} ${row.last_name}`,
            reminderTime,
            {
              studentName: row.student_name,
              universities: row.universities,
              programType: row.program_type,
              applicationTerm: row.application_term,
              expiresAt: row.invitation_expires.toISOString()
            }
          );
        }
      }
    } catch (error) {
      console.error('❌ Error scheduling invitation expiry reminders:', error);
    }
  }

  /**
   * Schedule reminders for overdue recommendations
   */
  private async scheduleRecommendationOverdueReminders(): Promise<void> {
    try {
      const query = `
        SELECT r.id, r.professional_email, r.first_name, r.last_name,
               app.legal_name as student_name, app.program_type, app.application_term,
               array_agg(u.name) as universities
        FROM recommenders r
        JOIN applications app ON r.application_id = app.id
        JOIN application_universities au ON app.id = au.application_id
        JOIN universities u ON au.university_id = u.id
        LEFT JOIN recommendations rec ON r.id = rec.recommender_id
        WHERE r.confirmed_at IS NOT NULL 
          AND (rec.id IS NULL OR rec.status = 'draft')
          AND r.invitation_expires < NOW() - INTERVAL '1 day'
          AND NOT EXISTS (
            SELECT 1 FROM scheduled_notifications sn 
            WHERE sn.recipient_email = r.professional_email 
              AND sn.reminder_type = 'recommendation_overdue'
              AND sn.created_at > NOW() - INTERVAL '7 days'
          )
        GROUP BY r.id, r.professional_email, r.first_name, r.last_name,
                 app.legal_name, app.program_type, app.application_term
      `;

      const result = await this.db.query(query);
      const notificationService = getNotificationService();

      for (const row of result.rows) {
        await notificationService.scheduleReminder(
          'recommendation_overdue',
          row.professional_email,
          `${row.first_name} ${row.last_name}`,
          new Date(), // Send immediately
          {
            studentName: row.student_name,
            universities: row.universities,
            programType: row.program_type,
            applicationTerm: row.application_term
          }
        );
      }
    } catch (error) {
      console.error('❌ Error scheduling recommendation overdue reminders:', error);
    }
  }

  /**
   * Schedule reminders for approaching application deadlines
   */
  private async scheduleApplicationDeadlineReminders(): Promise<void> {
    try {
      // This would require deadline information in the database
      // For now, we'll schedule generic reminders for applications with pending recommendations
      const query = `
        SELECT DISTINCT u.email, u.first_name || ' ' || u.last_name as full_name,
               app.legal_name, app.program_type, app.application_term,
               array_agg(univ.name) as universities
        FROM users u
        JOIN applications app ON u.id = app.student_id
        JOIN application_universities au ON app.id = au.application_id
        JOIN universities univ ON au.university_id = univ.id
        JOIN recommenders r ON app.id = r.application_id
        LEFT JOIN recommendations rec ON r.id = rec.recommender_id
        WHERE (rec.id IS NULL OR rec.status = 'draft')
          AND app.created_at < NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM scheduled_notifications sn 
            WHERE sn.recipient_email = u.email 
              AND sn.reminder_type = 'application_deadline_approaching'
              AND sn.created_at > NOW() - INTERVAL '7 days'
          )
        GROUP BY u.email, u.first_name, u.last_name, app.legal_name, app.program_type, app.application_term
      `;

      const result = await this.db.query(query);
      const notificationService = getNotificationService();

      for (const row of result.rows) {
        await notificationService.scheduleReminder(
          'application_deadline_approaching',
          row.email,
          row.full_name,
          new Date(), // Send immediately
          {
            studentName: row.legal_name,
            universities: row.universities,
            programType: row.program_type,
            applicationTerm: row.application_term
          }
        );
      }
    } catch (error) {
      console.error('❌ Error scheduling application deadline reminders:', error);
    }
  }

  /**
   * Get cron job status
   */
  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 5 * 60 * 1000) : undefined
    };
  }
}

// Create singleton instance
let cronJobServiceInstance: CronJobService | null = null;

export const initializeCronJobService = (db: Pool): CronJobService => {
  cronJobServiceInstance = new CronJobService(db);
  return cronJobServiceInstance;
};

export const getCronJobService = (): CronJobService => {
  if (!cronJobServiceInstance) {
    throw new Error('Cron job service not initialized. Call initializeCronJobService first.');
  }
  return cronJobServiceInstance;
};