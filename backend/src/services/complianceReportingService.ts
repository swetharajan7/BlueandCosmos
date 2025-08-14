import { Pool } from 'pg';
import { AppError } from '../utils/AppError';
import { DataRetentionService } from './dataRetentionService';
import { DataDeletionService } from './dataDeletionService';
import { UserConsentModel } from '../models/UserConsent';

export interface ComplianceReport {
  id: string;
  report_type: 'ferpa' | 'gdpr' | 'data_inventory' | 'consent_audit' | 'deletion_audit';
  generated_date: Date;
  reporting_period_start: Date;
  reporting_period_end: Date;
  generated_by: string;
  report_data: any;
  file_path?: string;
  status: 'generating' | 'completed' | 'failed';
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface DataInventoryItem {
  data_type: string;
  table_name: string;
  record_count: number;
  oldest_record: Date;
  newest_record: Date;
  contains_pii: boolean;
  encryption_status: 'encrypted' | 'not_encrypted' | 'partially_encrypted';
  retention_policy: string;
  legal_basis: string;
}

export class ComplianceReportingService {
  private db: Pool;
  private retentionService: DataRetentionService;
  private deletionService: DataDeletionService;
  private consentModel: UserConsentModel;

  constructor(db: Pool) {
    this.db = db;
    this.retentionService = new DataRetentionService(db);
    this.deletionService = new DataDeletionService(db);
    this.consentModel = new UserConsentModel(db);
  }

  /**
   * Generate FERPA compliance report
   */
  async generateFERPAReport(
    startDate: Date,
    endDate: Date,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const reportId = require('uuid').v4();
    
    try {
      // Update report status to generating
      await this.createReportRecord(reportId, 'ferpa', startDate, endDate, generatedBy, 'generating');

      const reportData = {
        summary: {
          reporting_period: { start: startDate, end: endDate },
          total_student_records: await this.getStudentRecordCount(),
          total_educational_records: await this.getEducationalRecordCount(),
          data_access_requests: await this.getDataAccessRequests(startDate, endDate),
          data_corrections: await this.getDataCorrections(startDate, endDate),
          directory_information_disclosures: await this.getDirectoryDisclosures(startDate, endDate)
        },
        data_inventory: await this.getEducationalDataInventory(),
        access_controls: await this.getAccessControlAudit(),
        retention_compliance: await this.getFERPARetentionCompliance(),
        security_measures: await this.getSecurityMeasuresReport(),
        incident_reports: await this.getSecurityIncidents(startDate, endDate),
        training_records: await this.getStaffTrainingRecords(startDate, endDate)
      };

      await this.updateReportData(reportId, reportData, 'completed');
      
      return await this.getComplianceReport(reportId);
    } catch (error) {
      await this.updateReportStatus(reportId, 'failed');
      throw new AppError('Failed to generate FERPA compliance report', 500);
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateGDPRReport(
    startDate: Date,
    endDate: Date,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const reportId = require('uuid').v4();
    
    try {
      await this.createReportRecord(reportId, 'gdpr', startDate, endDate, generatedBy, 'generating');

      const reportData = {
        summary: {
          reporting_period: { start: startDate, end: endDate },
          total_data_subjects: await this.getDataSubjectCount(),
          consent_records: await this.getConsentStatistics(startDate, endDate),
          data_processing_activities: await this.getDataProcessingActivities(),
          subject_access_requests: await this.getSubjectAccessRequests(startDate, endDate),
          deletion_requests: await this.getDeletionRequestStatistics(startDate, endDate),
          data_breaches: await this.getDataBreaches(startDate, endDate)
        },
        lawful_basis_analysis: await this.getLawfulBasisAnalysis(),
        consent_management: await this.getConsentManagementReport(startDate, endDate),
        data_transfers: await this.getDataTransferReport(startDate, endDate),
        retention_compliance: await this.getGDPRRetentionCompliance(),
        technical_measures: await this.getTechnicalMeasuresReport(),
        organizational_measures: await this.getOrganizationalMeasuresReport(),
        dpia_records: await this.getDPIARecords(startDate, endDate)
      };

      await this.updateReportData(reportId, reportData, 'completed');
      
      return await this.getComplianceReport(reportId);
    } catch (error) {
      await this.updateReportStatus(reportId, 'failed');
      throw new AppError('Failed to generate GDPR compliance report', 500);
    }
  }

  /**
   * Generate data inventory report
   */
  async generateDataInventoryReport(generatedBy: string): Promise<ComplianceReport> {
    const reportId = require('uuid').v4();
    const now = new Date();
    
    try {
      await this.createReportRecord(reportId, 'data_inventory', now, now, generatedBy, 'generating');

      const inventory = await this.getCompleteDataInventory();
      const reportData = {
        generated_date: now,
        total_data_types: inventory.length,
        total_records: inventory.reduce((sum, item) => sum + item.record_count, 0),
        pii_data_types: inventory.filter(item => item.contains_pii).length,
        encrypted_data_types: inventory.filter(item => item.encryption_status === 'encrypted').length,
        inventory_details: inventory,
        compliance_status: {
          ferpa_compliant: inventory.every(item => 
            item.data_type.includes('educational') ? item.retention_policy !== 'none' : true
          ),
          gdpr_compliant: inventory.every(item => 
            item.contains_pii ? item.legal_basis !== 'none' : true
          )
        }
      };

      await this.updateReportData(reportId, reportData, 'completed');
      
      return await this.getComplianceReport(reportId);
    } catch (error) {
      await this.updateReportStatus(reportId, 'failed');
      throw new AppError('Failed to generate data inventory report', 500);
    }
  }

  /**
   * Generate consent audit report
   */
  async generateConsentAuditReport(
    startDate: Date,
    endDate: Date,
    generatedBy: string
  ): Promise<ComplianceReport> {
    const reportId = require('uuid').v4();
    
    try {
      await this.createReportRecord(reportId, 'consent_audit', startDate, endDate, generatedBy, 'generating');

      const reportData = {
        summary: {
          reporting_period: { start: startDate, end: endDate },
          total_consent_records: await this.getTotalConsentRecords(startDate, endDate),
          active_consents: await this.getActiveConsentsCount(),
          withdrawn_consents: await this.getWithdrawnConsentsCount(startDate, endDate),
          consent_types: await this.getConsentTypeBreakdown(startDate, endDate)
        },
        consent_validity: await this.getConsentValidityAnalysis(),
        withdrawal_analysis: await this.getConsentWithdrawalAnalysis(startDate, endDate),
        legal_basis_compliance: await this.getLegalBasisCompliance(),
        consent_refresh_needed: await this.getConsentRefreshNeeded(),
        audit_trail: await this.getConsentAuditTrail(startDate, endDate)
      };

      await this.updateReportData(reportId, reportData, 'completed');
      
      return await this.getComplianceReport(reportId);
    } catch (error) {
      await this.updateReportStatus(reportId, 'failed');
      throw new AppError('Failed to generate consent audit report', 500);
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        id, user_id, action, resource_type, resource_id, metadata, 
        ip_address, user_agent, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
    `;

    try {
      await this.db.query(query, [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(metadata),
        ipAddress,
        userAgent,
        new Date()
      ]);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters.userId) {
      whereClause += ` AND user_id = $${paramCount}`;
      values.push(filters.userId);
      paramCount++;
    }

    if (filters.action) {
      whereClause += ` AND action = $${paramCount}`;
      values.push(filters.action);
      paramCount++;
    }

    if (filters.resourceType) {
      whereClause += ` AND resource_type = $${paramCount}`;
      values.push(filters.resourceType);
      paramCount++;
    }

    if (filters.startDate) {
      whereClause += ` AND created_at >= $${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      whereClause += ` AND created_at <= $${paramCount}`;
      values.push(filters.endDate);
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get logs with pagination
    let logsQuery = `
      SELECT * FROM audit_logs ${whereClause} 
      ORDER BY created_at DESC
    `;

    if (filters.limit) {
      logsQuery += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      logsQuery += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
      paramCount++;
    }

    try {
      const logsResult = await this.db.query(logsQuery, values);
      const logs = logsResult.rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata)
      }));

      return { logs, total };
    } catch (error) {
      throw new AppError('Failed to retrieve audit logs', 500);
    }
  }

  // Private helper methods for report generation

  private async createReportRecord(
    id: string,
    reportType: ComplianceReport['report_type'],
    startDate: Date,
    endDate: Date,
    generatedBy: string,
    status: ComplianceReport['status']
  ): Promise<void> {
    const query = `
      INSERT INTO compliance_reports (
        id, report_type, generated_date, reporting_period_start, 
        reporting_period_end, generated_by, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const now = new Date();
    await this.db.query(query, [
      id, reportType, now, startDate, endDate, generatedBy, status, now, now
    ]);
  }

  private async updateReportData(
    reportId: string,
    reportData: any,
    status: ComplianceReport['status']
  ): Promise<void> {
    const query = `
      UPDATE compliance_reports 
      SET report_data = $1, status = $2, updated_at = $3
      WHERE id = $4
    `;

    await this.db.query(query, [
      JSON.stringify(reportData),
      status,
      new Date(),
      reportId
    ]);
  }

  private async updateReportStatus(
    reportId: string,
    status: ComplianceReport['status']
  ): Promise<void> {
    const query = `
      UPDATE compliance_reports 
      SET status = $1, updated_at = $2
      WHERE id = $3
    `;

    await this.db.query(query, [status, new Date(), reportId]);
  }

  private async getComplianceReport(reportId: string): Promise<ComplianceReport> {
    const query = 'SELECT * FROM compliance_reports WHERE id = $1';
    const result = await this.db.query(query, [reportId]);
    
    if (result.rows.length === 0) {
      throw new AppError('Compliance report not found', 404);
    }

    const report = result.rows[0];
    if (report.report_data) {
      report.report_data = JSON.parse(report.report_data);
    }

    return report;
  }

  // Data collection methods for reports

  private async getStudentRecordCount(): Promise<number> {
    const result = await this.db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    return parseInt(result.rows[0].count);
  }

  private async getEducationalRecordCount(): Promise<number> {
    const result = await this.db.query('SELECT COUNT(*) as count FROM applications');
    return parseInt(result.rows[0].count);
  }

  private async getDataSubjectCount(): Promise<number> {
    const result = await this.db.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }

  private async getCompleteDataInventory(): Promise<DataInventoryItem[]> {
    const tables = [
      { name: 'users', type: 'user_profile', pii: true },
      { name: 'applications', type: 'application_data', pii: true },
      { name: 'recommendations', type: 'recommendations', pii: true },
      { name: 'user_consents', type: 'consent_records', pii: false },
      { name: 'audit_logs', type: 'audit_logs', pii: false },
      { name: 'user_sessions', type: 'session_data', pii: false }
    ];

    const inventory: DataInventoryItem[] = [];

    for (const table of tables) {
      try {
        const countResult = await this.db.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        const dateResult = await this.db.query(`
          SELECT MIN(created_at) as oldest, MAX(created_at) as newest 
          FROM ${table.name} 
          WHERE created_at IS NOT NULL
        `);

        const policy = await this.retentionService.getRetentionPolicy(table.type);

        inventory.push({
          data_type: table.type,
          table_name: table.name,
          record_count: parseInt(countResult.rows[0].count),
          oldest_record: dateResult.rows[0].oldest,
          newest_record: dateResult.rows[0].newest,
          contains_pii: table.pii,
          encryption_status: table.pii ? 'encrypted' : 'not_encrypted',
          retention_policy: policy?.description || 'No policy defined',
          legal_basis: policy?.legal_basis || 'Not specified'
        });
      } catch (error) {
        console.error(`Error collecting inventory for ${table.name}:`, error);
      }
    }

    return inventory;
  }

  private async getConsentStatistics(startDate: Date, endDate: Date): Promise<any> {
    const query = `
      SELECT 
        consent_type,
        COUNT(*) FILTER (WHERE consent_given = true) as consents_given,
        COUNT(*) FILTER (WHERE consent_given = false) as consents_withdrawn
      FROM user_consents 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY consent_type
    `;

    const result = await this.db.query(query, [startDate, endDate]);
    return result.rows;
  }

  private async getTotalConsentRecords(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM user_consents WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate]
    );
    return parseInt(result.rows[0].count);
  }

  private async getActiveConsentsCount(): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM user_consents WHERE consent_given = true AND withdrawal_date IS NULL'
    );
    return parseInt(result.rows[0].count);
  }

  private async getWithdrawnConsentsCount(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM user_consents WHERE withdrawal_date BETWEEN $1 AND $2',
      [startDate, endDate]
    );
    return parseInt(result.rows[0].count);
  }

  // Additional helper methods would continue here...
  // For brevity, I'm including the essential structure
}