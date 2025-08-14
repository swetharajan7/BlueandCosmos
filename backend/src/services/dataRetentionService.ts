import { Pool } from 'pg';
import { AppError } from '../utils/AppError';
import { UserConsentModel } from '../models/UserConsent';

export interface RetentionPolicy {
  id: string;
  data_type: string;
  retention_period_days: number;
  legal_basis: string;
  description: string;
  auto_delete: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DataDeletionLog {
  id: string;
  user_id: string;
  data_type: string;
  deletion_reason: 'retention_expired' | 'user_request' | 'consent_withdrawn' | 'account_deleted';
  deleted_records_count: number;
  deletion_date: Date;
  performed_by: string;
  verification_hash: string;
}

export class DataRetentionService {
  private db: Pool;
  private userConsentModel: UserConsentModel;

  constructor(db: Pool) {
    this.db = db;
    this.userConsentModel = new UserConsentModel(db);
  }

  /**
   * Default retention policies for different data types
   */
  private static readonly DEFAULT_POLICIES: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>[] = [
    {
      data_type: 'user_profile',
      retention_period_days: 2555, // 7 years for FERPA compliance
      legal_basis: 'FERPA educational records retention',
      description: 'Student profile and educational data',
      auto_delete: false // Manual review required for educational records
    },
    {
      data_type: 'recommendations',
      retention_period_days: 2555, // 7 years for FERPA compliance
      legal_basis: 'FERPA educational records retention',
      description: 'Recommendation letters and related data',
      auto_delete: false
    },
    {
      data_type: 'application_data',
      retention_period_days: 2555, // 7 years for FERPA compliance
      legal_basis: 'FERPA educational records retention',
      description: 'University application information',
      auto_delete: false
    },
    {
      data_type: 'audit_logs',
      retention_period_days: 2555, // 7 years for compliance
      legal_basis: 'Legal compliance and security',
      description: 'System audit and security logs',
      auto_delete: true
    },
    {
      data_type: 'session_data',
      retention_period_days: 90, // 3 months
      legal_basis: 'Legitimate interest - security',
      description: 'User session and authentication data',
      auto_delete: true
    },
    {
      data_type: 'email_logs',
      retention_period_days: 365, // 1 year
      legal_basis: 'Legitimate interest - communication records',
      description: 'Email notification logs',
      auto_delete: true
    },
    {
      data_type: 'consent_records',
      retention_period_days: 2555, // 7 years - must retain proof of consent
      legal_basis: 'Legal obligation - GDPR compliance',
      description: 'User consent and withdrawal records',
      auto_delete: false // Never auto-delete consent records
    },
    {
      data_type: 'marketing_data',
      retention_period_days: 1095, // 3 years
      legal_basis: 'Consent',
      description: 'Marketing preferences and communication',
      auto_delete: true
    }
  ];

  async initializeRetentionPolicies(): Promise<void> {
    for (const policy of DataRetentionService.DEFAULT_POLICIES) {
      await this.createOrUpdateRetentionPolicy(policy);
    }
  }

  async createOrUpdateRetentionPolicy(policyData: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<RetentionPolicy> {
    const now = new Date();
    
    const query = `
      INSERT INTO data_retention_policies (
        id, data_type, retention_period_days, legal_basis, description, auto_delete, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (data_type) 
      DO UPDATE SET 
        retention_period_days = EXCLUDED.retention_period_days,
        legal_basis = EXCLUDED.legal_basis,
        description = EXCLUDED.description,
        auto_delete = EXCLUDED.auto_delete,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const values = [
      policyData.data_type,
      policyData.retention_period_days,
      policyData.legal_basis,
      policyData.description,
      policyData.auto_delete,
      now,
      now
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create/update retention policy', 500);
    }
  }

  async getRetentionPolicy(dataType: string): Promise<RetentionPolicy | null> {
    const query = 'SELECT * FROM data_retention_policies WHERE data_type = $1';
    
    try {
      const result = await this.db.query(query, [dataType]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to retrieve retention policy', 500);
    }
  }

  async getAllRetentionPolicies(): Promise<RetentionPolicy[]> {
    const query = 'SELECT * FROM data_retention_policies ORDER BY data_type';
    
    try {
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to retrieve retention policies', 500);
    }
  }

  async identifyExpiredData(): Promise<{ dataType: string; expiredRecords: any[] }[]> {
    const policies = await this.getAllRetentionPolicies();
    const expiredData: { dataType: string; expiredRecords: any[] }[] = [];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      let query = '';
      let tableName = '';

      switch (policy.data_type) {
        case 'user_profile':
          tableName = 'users';
          query = `SELECT id, email, created_at FROM users WHERE created_at < $1 AND deleted_at IS NULL`;
          break;
        case 'recommendations':
          tableName = 'recommendations';
          query = `SELECT id, application_id, created_at FROM recommendations WHERE created_at < $1`;
          break;
        case 'application_data':
          tableName = 'applications';
          query = `SELECT id, student_id, created_at FROM applications WHERE created_at < $1`;
          break;
        case 'audit_logs':
          tableName = 'audit_logs';
          query = `SELECT id, user_id, created_at FROM audit_logs WHERE created_at < $1`;
          break;
        case 'session_data':
          tableName = 'user_sessions';
          query = `SELECT id, user_id, created_at FROM user_sessions WHERE created_at < $1`;
          break;
        case 'email_logs':
          tableName = 'email_logs';
          query = `SELECT id, user_id, created_at FROM email_logs WHERE created_at < $1`;
          break;
        case 'marketing_data':
          tableName = 'marketing_preferences';
          query = `SELECT id, user_id, created_at FROM marketing_preferences WHERE created_at < $1`;
          break;
        default:
          continue;
      }

      try {
        const result = await this.db.query(query, [cutoffDate]);
        if (result.rows.length > 0) {
          expiredData.push({
            dataType: policy.data_type,
            expiredRecords: result.rows
          });
        }
      } catch (error) {
        console.error(`Error identifying expired data for ${policy.data_type}:`, error);
      }
    }

    return expiredData;
  }

  async performAutomaticCleanup(): Promise<DataDeletionLog[]> {
    const expiredData = await this.identifyExpiredData();
    const deletionLogs: DataDeletionLog[] = [];

    for (const { dataType, expiredRecords } of expiredData) {
      const policy = await this.getRetentionPolicy(dataType);
      
      if (!policy || !policy.auto_delete || expiredRecords.length === 0) {
        continue;
      }

      try {
        const deletedCount = await this.deleteExpiredData(dataType, expiredRecords);
        
        if (deletedCount > 0) {
          const deletionLog = await this.logDataDeletion({
            user_id: 'system',
            data_type: dataType,
            deletion_reason: 'retention_expired',
            deleted_records_count: deletedCount,
            performed_by: 'system_auto_cleanup'
          });
          
          deletionLogs.push(deletionLog);
        }
      } catch (error) {
        console.error(`Error during automatic cleanup of ${dataType}:`, error);
      }
    }

    return deletionLogs;
  }

  private async deleteExpiredData(dataType: string, expiredRecords: any[]): Promise<number> {
    if (expiredRecords.length === 0) return 0;

    const recordIds = expiredRecords.map(record => record.id);
    let query = '';

    switch (dataType) {
      case 'audit_logs':
        query = `DELETE FROM audit_logs WHERE id = ANY($1)`;
        break;
      case 'session_data':
        query = `DELETE FROM user_sessions WHERE id = ANY($1)`;
        break;
      case 'email_logs':
        query = `DELETE FROM email_logs WHERE id = ANY($1)`;
        break;
      case 'marketing_data':
        query = `DELETE FROM marketing_preferences WHERE id = ANY($1)`;
        break;
      default:
        throw new AppError(`Automatic deletion not supported for data type: ${dataType}`, 400);
    }

    try {
      const result = await this.db.query(query, [recordIds]);
      return result.rowCount || 0;
    } catch (error) {
      throw new AppError(`Failed to delete expired ${dataType} data`, 500);
    }
  }

  async logDataDeletion(deletionData: Omit<DataDeletionLog, 'id' | 'deletion_date' | 'verification_hash'>): Promise<DataDeletionLog> {
    const id = require('uuid').v4();
    const deletionDate = new Date();
    const verificationHash = require('crypto')
      .createHash('sha256')
      .update(`${deletionData.user_id}:${deletionData.data_type}:${deletionData.deleted_records_count}:${deletionDate.toISOString()}`)
      .digest('hex');

    const query = `
      INSERT INTO data_deletion_logs (
        id, user_id, data_type, deletion_reason, deleted_records_count, 
        deletion_date, performed_by, verification_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      id,
      deletionData.user_id,
      deletionData.data_type,
      deletionData.deletion_reason,
      deletionData.deleted_records_count,
      deletionDate,
      deletionData.performed_by,
      verificationHash
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to log data deletion', 500);
    }
  }

  async getDeletionLogs(userId?: string): Promise<DataDeletionLog[]> {
    let query = 'SELECT * FROM data_deletion_logs';
    const values: any[] = [];

    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
    }

    query += ' ORDER BY deletion_date DESC';

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to retrieve deletion logs', 500);
    }
  }

  async scheduleDataForDeletion(userId: string, dataTypes: string[], reason: DataDeletionLog['deletion_reason']): Promise<void> {
    const query = `
      INSERT INTO scheduled_deletions (id, user_id, data_types, deletion_reason, scheduled_date, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending')
    `;

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30-day grace period

    try {
      await this.db.query(query, [userId, JSON.stringify(dataTypes), reason, scheduledDate]);
    } catch (error) {
      throw new AppError('Failed to schedule data for deletion', 500);
    }
  }

  async getDataRetentionReport(): Promise<{
    totalRecords: number;
    expiredRecords: number;
    scheduledDeletions: number;
    recentDeletions: number;
    policyCompliance: { dataType: string; compliant: boolean; expiredCount: number }[];
  }> {
    try {
      // Get total records across all tables
      const totalQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users) +
          (SELECT COUNT(*) FROM applications) +
          (SELECT COUNT(*) FROM recommendations) +
          (SELECT COUNT(*) FROM audit_logs) +
          (SELECT COUNT(*) FROM user_sessions) +
          (SELECT COUNT(*) FROM email_logs) as total_records
      `;
      const totalResult = await this.db.query(totalQuery);
      const totalRecords = parseInt(totalResult.rows[0].total_records);

      // Get expired records count
      const expiredData = await this.identifyExpiredData();
      const expiredRecords = expiredData.reduce((sum, data) => sum + data.expiredRecords.length, 0);

      // Get scheduled deletions
      const scheduledQuery = 'SELECT COUNT(*) as count FROM scheduled_deletions WHERE status = $1';
      const scheduledResult = await this.db.query(scheduledQuery, ['pending']);
      const scheduledDeletions = parseInt(scheduledResult.rows[0].count);

      // Get recent deletions (last 30 days)
      const recentQuery = 'SELECT COUNT(*) as count FROM data_deletion_logs WHERE deletion_date > $1';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentResult = await this.db.query(recentQuery, [thirtyDaysAgo]);
      const recentDeletions = parseInt(recentResult.rows[0].count);

      // Policy compliance check
      const policies = await this.getAllRetentionPolicies();
      const policyCompliance = expiredData.map(data => ({
        dataType: data.dataType,
        compliant: data.expiredRecords.length === 0,
        expiredCount: data.expiredRecords.length
      }));

      // Add policies with no expired data
      policies.forEach(policy => {
        if (!policyCompliance.find(pc => pc.dataType === policy.data_type)) {
          policyCompliance.push({
            dataType: policy.data_type,
            compliant: true,
            expiredCount: 0
          });
        }
      });

      return {
        totalRecords,
        expiredRecords,
        scheduledDeletions,
        recentDeletions,
        policyCompliance
      };
    } catch (error) {
      throw new AppError('Failed to generate data retention report', 500);
    }
  }
}