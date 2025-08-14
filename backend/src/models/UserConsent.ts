import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError';

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing' | 'ferpa_disclosure';
  consent_given: boolean;
  consent_version: string;
  ip_address: string;
  user_agent: string;
  consent_date: Date;
  withdrawal_date?: Date;
  legal_basis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task';
  purpose: string;
  data_categories: string[];
  retention_period: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConsentRequest {
  user_id: string;
  consent_type: ConsentRecord['consent_type'];
  consent_given: boolean;
  consent_version: string;
  ip_address: string;
  user_agent: string;
  legal_basis: ConsentRecord['legal_basis'];
  purpose: string;
  data_categories: string[];
  retention_period: string;
}

export class UserConsentModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async recordConsent(consentData: ConsentRequest): Promise<ConsentRecord> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO user_consents (
        id, user_id, consent_type, consent_given, consent_version, 
        ip_address, user_agent, consent_date, legal_basis, purpose, 
        data_categories, retention_period, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      id,
      consentData.user_id,
      consentData.consent_type,
      consentData.consent_given,
      consentData.consent_version,
      consentData.ip_address,
      consentData.user_agent,
      now,
      consentData.legal_basis,
      consentData.purpose,
      JSON.stringify(consentData.data_categories),
      consentData.retention_period,
      now,
      now
    ];

    try {
      const result = await this.db.query(query, values);
      const consent = result.rows[0];
      consent.data_categories = JSON.parse(consent.data_categories);
      return consent;
    } catch (error) {
      throw new AppError('Failed to record consent', 500);
    }
  }

  async withdrawConsent(userId: string, consentType: ConsentRecord['consent_type'], ipAddress: string, userAgent: string): Promise<ConsentRecord> {
    const now = new Date();

    // First, record the withdrawal
    const withdrawalRecord = await this.recordConsent({
      user_id: userId,
      consent_type: consentType,
      consent_given: false,
      consent_version: '1.0',
      ip_address: ipAddress,
      user_agent: userAgent,
      legal_basis: 'consent',
      purpose: 'Consent withdrawal',
      data_categories: [],
      retention_period: 'indefinite'
    });

    // Update the original consent record
    const updateQuery = `
      UPDATE user_consents 
      SET withdrawal_date = $1, updated_at = $2
      WHERE user_id = $3 AND consent_type = $4 AND consent_given = true AND withdrawal_date IS NULL
    `;

    try {
      await this.db.query(updateQuery, [now, now, userId, consentType]);
      return withdrawalRecord;
    } catch (error) {
      throw new AppError('Failed to withdraw consent', 500);
    }
  }

  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        data_categories: JSON.parse(row.data_categories)
      }));
    } catch (error) {
      throw new AppError('Failed to retrieve user consents', 500);
    }
  }

  async getActiveConsents(userId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 AND consent_given = true AND withdrawal_date IS NULL
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        data_categories: JSON.parse(row.data_categories)
      }));
    } catch (error) {
      throw new AppError('Failed to retrieve active consents', 500);
    }
  }

  async hasValidConsent(userId: string, consentType: ConsentRecord['consent_type']): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM user_consents 
      WHERE user_id = $1 AND consent_type = $2 AND consent_given = true AND withdrawal_date IS NULL
    `;

    try {
      const result = await this.db.query(query, [userId, consentType]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw new AppError('Failed to check consent status', 500);
    }
  }

  async getConsentAuditTrail(userId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 
      ORDER BY created_at ASC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        data_categories: JSON.parse(row.data_categories)
      }));
    } catch (error) {
      throw new AppError('Failed to retrieve consent audit trail', 500);
    }
  }

  async bulkConsentCheck(userIds: string[], consentType: ConsentRecord['consent_type']): Promise<Record<string, boolean>> {
    if (userIds.length === 0) return {};

    const placeholders = userIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      SELECT user_id, COUNT(*) as count FROM user_consents 
      WHERE user_id IN (${placeholders}) AND consent_type = $1 AND consent_given = true AND withdrawal_date IS NULL
      GROUP BY user_id
    `;

    try {
      const result = await this.db.query(query, [consentType, ...userIds]);
      const consentMap: Record<string, boolean> = {};
      
      // Initialize all users as false
      userIds.forEach(userId => {
        consentMap[userId] = false;
      });
      
      // Set true for users with valid consent
      result.rows.forEach(row => {
        consentMap[row.user_id] = parseInt(row.count) > 0;
      });
      
      return consentMap;
    } catch (error) {
      throw new AppError('Failed to perform bulk consent check', 500);
    }
  }
}