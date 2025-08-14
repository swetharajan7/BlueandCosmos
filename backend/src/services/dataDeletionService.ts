import { Pool } from 'pg';
import { AppError } from '../utils/AppError';
import { DataRetentionService } from './dataRetentionService';
import { UserConsentModel } from '../models/UserConsent';
import { EncryptionService } from './encryptionService';

export interface DeletionRequest {
  id: string;
  user_id: string;
  request_type: 'full_account' | 'specific_data' | 'anonymization';
  data_categories: string[];
  reason: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  requested_date: Date;
  approved_date?: Date;
  completed_date?: Date;
  approved_by?: string;
  verification_token: string;
  notes?: string;
}

export interface DeletionVerification {
  user_id: string;
  verification_method: 'email' | 'identity_document' | 'security_questions';
  verification_data: string;
  verified_at: Date;
  ip_address: string;
  user_agent: string;
}

export class DataDeletionService {
  private db: Pool;
  private retentionService: DataRetentionService;
  private consentModel: UserConsentModel;

  constructor(db: Pool) {
    this.db = db;
    this.retentionService = new DataRetentionService(db);
    this.consentModel = new UserConsentModel(db);
  }

  /**
   * Submit a data deletion request
   */
  async submitDeletionRequest(
    userId: string,
    requestType: DeletionRequest['request_type'],
    dataCategories: string[],
    reason: string,
    ipAddress: string,
    userAgent: string
  ): Promise<DeletionRequest> {
    const id = require('uuid').v4();
    const verificationToken = EncryptionService.generateSecureToken();
    const now = new Date();

    // Validate user exists
    const userQuery = 'SELECT id FROM users WHERE id = $1';
    const userResult = await this.db.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const query = `
      INSERT INTO deletion_requests (
        id, user_id, request_type, data_categories, reason, status,
        requested_date, verification_token, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      userId,
      requestType,
      JSON.stringify(dataCategories),
      reason,
      'pending',
      now,
      verificationToken,
      now,
      now
    ];

    try {
      const result = await this.db.query(query, values);
      const request = result.rows[0];
      request.data_categories = JSON.parse(request.data_categories);

      // Log the deletion request
      await this.logDeletionActivity(userId, 'deletion_requested', {
        request_id: id,
        request_type: requestType,
        data_categories: dataCategories,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return request;
    } catch (error) {
      throw new AppError('Failed to submit deletion request', 500);
    }
  }

  /**
   * Verify user identity for deletion request
   */
  async verifyDeletionRequest(
    requestId: string,
    verificationToken: string,
    verificationMethod: DeletionVerification['verification_method'],
    verificationData: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    // Get the deletion request
    const requestQuery = 'SELECT * FROM deletion_requests WHERE id = $1 AND verification_token = $2';
    const requestResult = await this.db.query(requestQuery, [requestId, verificationToken]);
    
    if (requestResult.rows.length === 0) {
      throw new AppError('Invalid deletion request or verification token', 400);
    }

    const request = requestResult.rows[0];
    
    // Record verification
    const verificationQuery = `
      INSERT INTO deletion_verifications (
        id, request_id, user_id, verification_method, verification_data,
        verified_at, ip_address, user_agent
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
    `;

    const encryptedVerificationData = EncryptionService.encrypt(verificationData);
    
    try {
      await this.db.query(verificationQuery, [
        requestId,
        request.user_id,
        verificationMethod,
        encryptedVerificationData,
        new Date(),
        ipAddress,
        userAgent
      ]);

      // Update request status to approved
      await this.updateDeletionRequestStatus(requestId, 'approved', 'system');

      return true;
    } catch (error) {
      throw new AppError('Failed to verify deletion request', 500);
    }
  }

  /**
   * Process approved deletion requests
   */
  async processDeletionRequest(requestId: string, performedBy: string): Promise<void> {
    const request = await this.getDeletionRequest(requestId);
    
    if (!request) {
      throw new AppError('Deletion request not found', 404);
    }

    if (request.status !== 'approved') {
      throw new AppError('Deletion request must be approved before processing', 400);
    }

    await this.updateDeletionRequestStatus(requestId, 'processing', performedBy);

    try {
      let deletedRecordsCount = 0;

      switch (request.request_type) {
        case 'full_account':
          deletedRecordsCount = await this.performFullAccountDeletion(request.user_id);
          break;
        case 'specific_data':
          deletedRecordsCount = await this.performSpecificDataDeletion(request.user_id, request.data_categories);
          break;
        case 'anonymization':
          deletedRecordsCount = await this.performDataAnonymization(request.user_id, request.data_categories);
          break;
      }

      // Log the deletion
      await this.retentionService.logDataDeletion({
        user_id: request.user_id,
        data_type: request.request_type,
        deletion_reason: 'user_request',
        deleted_records_count: deletedRecordsCount,
        performed_by: performedBy
      });

      await this.updateDeletionRequestStatus(requestId, 'completed', performedBy);

      // Log completion
      await this.logDeletionActivity(request.user_id, 'deletion_completed', {
        request_id: requestId,
        deleted_records_count: deletedRecordsCount,
        performed_by: performedBy
      });

    } catch (error) {
      await this.updateDeletionRequestStatus(requestId, 'rejected', performedBy);
      throw new AppError('Failed to process deletion request', 500);
    }
  }

  /**
   * Perform full account deletion
   */
  private async performFullAccountDeletion(userId: string): Promise<number> {
    const client = await this.db.connect();
    let totalDeleted = 0;

    try {
      await client.query('BEGIN');

      // Delete in order to respect foreign key constraints
      const deletionOrder = [
        'user_sessions',
        'email_logs',
        'audit_logs',
        'user_consents',
        'deletion_verifications',
        'deletion_requests',
        'submissions',
        'recommendations',
        'applications',
        'recommenders',
        'users'
      ];

      for (const table of deletionOrder) {
        const result = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        totalDeleted += result.rowCount || 0;
      }

      // Special case for users table (no user_id column)
      if (deletionOrder.includes('users')) {
        const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
        totalDeleted += result.rowCount || 0;
      }

      await client.query('COMMIT');
      return totalDeleted;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform specific data deletion
   */
  private async performSpecificDataDeletion(userId: string, dataCategories: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const category of dataCategories) {
      let query = '';
      let params = [userId];

      switch (category) {
        case 'profile_data':
          query = 'UPDATE users SET first_name = $2, last_name = $3, phone = NULL WHERE id = $1';
          params = [userId, '[DELETED]', '[DELETED]'];
          break;
        case 'recommendations':
          query = 'DELETE FROM recommendations WHERE application_id IN (SELECT id FROM applications WHERE student_id = $1)';
          break;
        case 'applications':
          query = 'DELETE FROM applications WHERE student_id = $1';
          break;
        case 'session_data':
          query = 'DELETE FROM user_sessions WHERE user_id = $1';
          break;
        case 'email_logs':
          query = 'DELETE FROM email_logs WHERE user_id = $1';
          break;
        default:
          continue;
      }

      try {
        const result = await this.db.query(query, params);
        totalDeleted += result.rowCount || 0;
      } catch (error) {
        console.error(`Error deleting ${category} for user ${userId}:`, error);
      }
    }

    return totalDeleted;
  }

  /**
   * Perform data anonymization
   */
  private async performDataAnonymization(userId: string, dataCategories: string[]): Promise<number> {
    let totalAnonymized = 0;
    const anonymousId = `anon_${EncryptionService.generateSecureToken(8)}`;

    for (const category of dataCategories) {
      let query = '';
      let params: any[] = [];

      switch (category) {
        case 'profile_data':
          query = `
            UPDATE users 
            SET first_name = $2, last_name = $3, email = $4, phone = NULL 
            WHERE id = $1
          `;
          params = [userId, 'Anonymous', 'User', `${anonymousId}@anonymized.local`];
          break;
        case 'recommendations':
          query = `
            UPDATE recommendations 
            SET content = '[ANONYMIZED RECOMMENDATION]'
            WHERE application_id IN (SELECT id FROM applications WHERE student_id = $1)
          `;
          params = [userId];
          break;
        case 'applications':
          query = `
            UPDATE applications 
            SET legal_name = $2
            WHERE student_id = $1
          `;
          params = [userId, 'Anonymous User'];
          break;
        default:
          continue;
      }

      try {
        const result = await this.db.query(query, params);
        totalAnonymized += result.rowCount || 0;
      } catch (error) {
        console.error(`Error anonymizing ${category} for user ${userId}:`, error);
      }
    }

    return totalAnonymized;
  }

  /**
   * Get deletion request by ID
   */
  async getDeletionRequest(requestId: string): Promise<DeletionRequest | null> {
    const query = 'SELECT * FROM deletion_requests WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [requestId]);
      if (result.rows.length === 0) return null;
      
      const request = result.rows[0];
      request.data_categories = JSON.parse(request.data_categories);
      return request;
    } catch (error) {
      throw new AppError('Failed to retrieve deletion request', 500);
    }
  }

  /**
   * Get user's deletion requests
   */
  async getUserDeletionRequests(userId: string): Promise<DeletionRequest[]> {
    const query = 'SELECT * FROM deletion_requests WHERE user_id = $1 ORDER BY requested_date DESC';
    
    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        data_categories: JSON.parse(row.data_categories)
      }));
    } catch (error) {
      throw new AppError('Failed to retrieve user deletion requests', 500);
    }
  }

  /**
   * Update deletion request status
   */
  private async updateDeletionRequestStatus(
    requestId: string,
    status: DeletionRequest['status'],
    performedBy: string
  ): Promise<void> {
    const now = new Date();
    let additionalFields = '';
    const values = [requestId, status, now];

    if (status === 'approved') {
      additionalFields = ', approved_date = $4, approved_by = $5';
      values.push(now, performedBy);
    } else if (status === 'completed') {
      additionalFields = ', completed_date = $4';
      values.push(now);
    }

    const query = `
      UPDATE deletion_requests 
      SET status = $2, updated_at = $3${additionalFields}
      WHERE id = $1
    `;

    try {
      await this.db.query(query, values);
    } catch (error) {
      throw new AppError('Failed to update deletion request status', 500);
    }
  }

  /**
   * Log deletion activity
   */
  private async logDeletionActivity(
    userId: string,
    activity: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'deletion_request', $3, $4, $5)
    `;

    try {
      await this.db.query(query, [
        userId,
        activity,
        userId,
        JSON.stringify(metadata),
        new Date()
      ]);
    } catch (error) {
      console.error('Failed to log deletion activity:', error);
    }
  }

  /**
   * Get deletion statistics
   */
  async getDeletionStatistics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    rejectedRequests: number;
    averageProcessingTime: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
          AVG(EXTRACT(EPOCH FROM (completed_date - requested_date))/3600) as avg_processing_hours
        FROM deletion_requests
      `;

      const result = await this.db.query(statsQuery);
      const stats = result.rows[0];

      return {
        totalRequests: parseInt(stats.total_requests),
        pendingRequests: parseInt(stats.pending_requests),
        completedRequests: parseInt(stats.completed_requests),
        rejectedRequests: parseInt(stats.rejected_requests),
        averageProcessingTime: parseFloat(stats.avg_processing_hours) || 0
      };
    } catch (error) {
      throw new AppError('Failed to retrieve deletion statistics', 500);
    }
  }
}