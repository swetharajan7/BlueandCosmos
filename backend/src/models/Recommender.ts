import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Recommender } from '../types';
import { AppError } from '../utils/AppError';

export class RecommenderModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Create a new recommender invitation
   */
  async createInvitation(invitationData: {
    application_id: string;
    professional_email: string;
    title?: string;
    organization?: string;
    relationship_duration?: string;
    relationship_type?: string;
    mobile_phone?: string;
  }): Promise<{ recommender: Recommender; invitation_token: string }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Generate secure invitation token
      const invitation_token = crypto.randomBytes(32).toString('hex');
      const invitation_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Check if recommender already exists for this application
      const existingQuery = `
        SELECT r.* FROM recommenders r
        JOIN application_recommenders ar ON r.id = ar.recommender_id
        WHERE ar.application_id = $1 AND r.professional_email = $2
      `;
      const existingResult = await client.query(existingQuery, [
        invitationData.application_id,
        invitationData.professional_email.toLowerCase().trim()
      ]);

      if (existingResult.rows.length > 0) {
        throw new AppError('Recommender already invited for this application', 409);
      }

      // Create user account for recommender (if doesn't exist)
      let userId: string;
      const userQuery = 'SELECT id FROM users WHERE email = $1';
      const userResult = await client.query(userQuery, [invitationData.professional_email.toLowerCase().trim()]);
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else {
        // Create new user account
        userId = uuidv4();
        const createUserQuery = `
          INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        // Generate temporary password hash (will be set when they accept invitation)
        const tempPasswordHash = crypto.randomBytes(32).toString('hex');
        
        await client.query(createUserQuery, [
          userId,
          invitationData.professional_email.toLowerCase().trim(),
          tempPasswordHash,
          'Recommender', // Temporary first name
          'User', // Temporary last name
          'recommender',
          false
        ]);
      }

      // Create recommender record
      const recommenderId = uuidv4();
      const recommenderQuery = `
        INSERT INTO recommenders (
          id, user_id, title, organization, relationship_duration, 
          relationship_type, mobile_phone, professional_email, 
          invitation_token, invitation_expires
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const recommenderResult = await client.query(recommenderQuery, [
        recommenderId,
        userId,
        invitationData.title || '',
        invitationData.organization || '',
        invitationData.relationship_duration || '',
        invitationData.relationship_type || '',
        invitationData.mobile_phone || null,
        invitationData.professional_email.toLowerCase().trim(),
        invitation_token,
        invitation_expires
      ]);

      // Link recommender to application
      const linkQuery = `
        INSERT INTO application_recommenders (application_id, recommender_id, status)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(linkQuery, [
        invitationData.application_id,
        recommenderId,
        'invited'
      ]);

      await client.query('COMMIT');

      return {
        recommender: recommenderResult.rows[0],
        invitation_token
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find recommender by invitation token
   */
  async findByInvitationToken(token: string): Promise<Recommender | null> {
    const query = `
      SELECT * FROM recommenders 
      WHERE invitation_token = $1 AND invitation_expires > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.db.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to find recommender by token', 500);
    }
  }

  /**
   * Confirm recommender invitation and update profile
   */
  async confirmInvitation(
    token: string,
    profileData: {
      first_name: string;
      last_name: string;
      title: string;
      organization: string;
      relationship_duration: string;
      relationship_type: string;
      mobile_phone?: string;
      password: string;
    }
  ): Promise<Recommender> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Find recommender by token
      const recommender = await this.findByInvitationToken(token);
      if (!recommender) {
        throw new AppError('Invalid or expired invitation token', 404);
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const password_hash = await bcrypt.hash(profileData.password, 12);

      // Update user account
      const updateUserQuery = `
        UPDATE users 
        SET first_name = $1, last_name = $2, password_hash = $3, is_verified = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `;
      
      await client.query(updateUserQuery, [
        profileData.first_name.trim(),
        profileData.last_name.trim(),
        password_hash,
        recommender.user_id
      ]);

      // Update recommender profile
      const updateRecommenderQuery = `
        UPDATE recommenders 
        SET title = $1, organization = $2, relationship_duration = $3, 
            relationship_type = $4, mobile_phone = $5, confirmed_at = CURRENT_TIMESTAMP,
            invitation_token = NULL, invitation_expires = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;

      const result = await client.query(updateRecommenderQuery, [
        profileData.title.trim(),
        profileData.organization.trim(),
        profileData.relationship_duration.trim(),
        profileData.relationship_type.trim(),
        profileData.mobile_phone?.trim() || null,
        recommender.id
      ]);

      // Update application_recommenders status
      const updateStatusQuery = `
        UPDATE application_recommenders 
        SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE recommender_id = $1
      `;
      
      await client.query(updateStatusQuery, [recommender.id]);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get recommenders for an application
   */
  async getByApplicationId(applicationId: string): Promise<Array<Recommender & { status: string }>> {
    const query = `
      SELECT r.*, ar.status, ar.created_at as invited_at
      FROM recommenders r
      JOIN application_recommenders ar ON r.id = ar.recommender_id
      WHERE ar.application_id = $1
      ORDER BY ar.created_at DESC
    `;

    try {
      const result = await this.db.query(query, [applicationId]);
      return result.rows;
    } catch (error) {
      throw new AppError('Failed to get recommenders for application', 500);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(recommenderId: string): Promise<{ recommender: Recommender; invitation_token: string }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Generate new invitation token
      const invitation_token = crypto.randomBytes(32).toString('hex');
      const invitation_expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Update recommender with new token
      const updateQuery = `
        UPDATE recommenders 
        SET invitation_token = $1, invitation_expires = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND confirmed_at IS NULL
        RETURNING *
      `;

      const result = await client.query(updateQuery, [invitation_token, invitation_expires, recommenderId]);
      
      if (result.rows.length === 0) {
        throw new AppError('Recommender not found or already confirmed', 404);
      }

      // Update application_recommenders status
      const updateStatusQuery = `
        UPDATE application_recommenders 
        SET status = 'invited', updated_at = CURRENT_TIMESTAMP
        WHERE recommender_id = $1
      `;
      
      await client.query(updateStatusQuery, [recommenderId]);

      await client.query('COMMIT');

      return {
        recommender: result.rows[0],
        invitation_token
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete recommender invitation
   */
  async deleteInvitation(recommenderId: string, applicationId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if recommender has already submitted a recommendation
      const recommendationQuery = `
        SELECT id FROM recommendations 
        WHERE application_id = $1 AND recommender_id = $2 AND status != 'draft'
      `;
      
      const recommendationResult = await client.query(recommendationQuery, [applicationId, recommenderId]);
      
      if (recommendationResult.rows.length > 0) {
        throw new AppError('Cannot delete recommender who has already submitted a recommendation', 409);
      }

      // Delete application_recommenders link
      const deleteLinkQuery = `
        DELETE FROM application_recommenders 
        WHERE application_id = $1 AND recommender_id = $2
      `;
      
      const linkResult = await client.query(deleteLinkQuery, [applicationId, recommenderId]);
      
      if (linkResult.rowCount === 0) {
        throw new AppError('Recommender not found for this application', 404);
      }

      // Check if recommender is linked to other applications
      const otherLinksQuery = `
        SELECT COUNT(*) as count FROM application_recommenders 
        WHERE recommender_id = $1
      `;
      
      const otherLinksResult = await client.query(otherLinksQuery, [recommenderId]);
      
      // If no other applications, delete the recommender record
      if (parseInt(otherLinksResult.rows[0].count) === 0) {
        await client.query('DELETE FROM recommenders WHERE id = $1', [recommenderId]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get invitation status
   */
  async getInvitationStatus(recommenderId: string): Promise<{
    status: 'invited' | 'confirmed' | 'expired';
    invitation_expires?: Date;
    confirmed_at?: Date;
  }> {
    const query = `
      SELECT invitation_expires, confirmed_at
      FROM recommenders 
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [recommenderId]);
      
      if (result.rows.length === 0) {
        throw new AppError('Recommender not found', 404);
      }

      const { invitation_expires, confirmed_at } = result.rows[0];

      if (confirmed_at) {
        return { status: 'confirmed', confirmed_at };
      }

      if (invitation_expires && new Date() > new Date(invitation_expires)) {
        return { status: 'expired', invitation_expires };
      }

      return { status: 'invited', invitation_expires };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get invitation status', 500);
    }
  }

  /**
   * Get applications for a recommender
   */
  async getApplicationsForRecommender(recommenderId: string): Promise<string[]> {
    const query = `
      SELECT application_id FROM application_recommenders 
      WHERE recommender_id = $1
    `;

    try {
      const result = await this.db.query(query, [recommenderId]);
      return result.rows.map(row => row.application_id);
    } catch (error) {
      throw new AppError('Failed to get applications for recommender', 500);
    }
  }

  /**
   * Find recommender by user ID
   */
  async findByUserId(userId: string): Promise<Recommender | null> {
    const query = `
      SELECT * FROM recommenders 
      WHERE user_id = $1
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to find recommender by user ID', 500);
    }
  }

  /**
   * Update recommender profile
   */
  async updateProfile(
    userId: string,
    updates: {
      title?: string;
      organization?: string;
      relationship_duration?: string;
      relationship_type?: string;
      mobile_phone?: string;
    }
  ): Promise<Recommender> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramCount++}`);
        values.push(updates.title.trim());
      }
      if (updates.organization !== undefined) {
        updateFields.push(`organization = $${paramCount++}`);
        values.push(updates.organization.trim());
      }
      if (updates.relationship_duration !== undefined) {
        updateFields.push(`relationship_duration = $${paramCount++}`);
        values.push(updates.relationship_duration.trim());
      }
      if (updates.relationship_type !== undefined) {
        updateFields.push(`relationship_type = $${paramCount++}`);
        values.push(updates.relationship_type.trim());
      }
      if (updates.mobile_phone !== undefined) {
        updateFields.push(`mobile_phone = $${paramCount++}`);
        values.push(updates.mobile_phone?.trim() || null);
      }

      if (updateFields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const query = `
        UPDATE recommenders 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new AppError('Recommender not found', 404);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm application details are correct
   */
  async confirmApplicationDetails(recommenderId: string, applicationId: string): Promise<void> {
    const query = `
      UPDATE application_recommenders 
      SET details_confirmed = true, details_confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE recommender_id = $1 AND application_id = $2
    `;

    try {
      const result = await this.db.query(query, [recommenderId, applicationId]);
      
      if (result.rowCount === 0) {
        throw new AppError('Application not found for recommender', 404);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to confirm application details', 500);
    }
  }

  /**
   * Get recommendation by application ID
   */
  async getRecommendationByApplicationId(applicationId: string): Promise<any | null> {
    const query = `
      SELECT * FROM recommendations 
      WHERE application_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [applicationId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to get recommendation by application ID', 500);
    }
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendationById(recommendationId: string): Promise<any | null> {
    const query = `
      SELECT * FROM recommendations 
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [recommendationId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new AppError('Failed to get recommendation by ID', 500);
    }
  }

  /**
   * Create a new recommendation
   */
  async createRecommendation(data: {
    application_id: string;
    recommender_id: string;
    content: string;
    word_count: number;
    ai_assistance_used: boolean;
  }): Promise<any> {
    const recommendationId = uuidv4();
    const query = `
      INSERT INTO recommendations (
        id, application_id, recommender_id, content, word_count, 
        ai_assistance_used, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [
        recommendationId,
        data.application_id,
        data.recommender_id,
        data.content,
        data.word_count,
        data.ai_assistance_used,
        'draft'
      ]);

      return result.rows[0];
    } catch (error) {
      throw new AppError('Failed to create recommendation', 500);
    }
  }

  /**
   * Update an existing recommendation
   */
  async updateRecommendation(recommendationId: string, data: {
    content: string;
    word_count: number;
  }): Promise<any> {
    const query = `
      UPDATE recommendations 
      SET content = $1, word_count = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [
        data.content,
        data.word_count,
        recommendationId
      ]);

      if (result.rows.length === 0) {
        throw new AppError('Recommendation not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update recommendation', 500);
    }
  }

  /**
   * Submit a recommendation
   */
  async submitRecommendation(recommendationId: string): Promise<any> {
    const query = `
      UPDATE recommendations 
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [recommendationId]);

      if (result.rows.length === 0) {
        throw new AppError('Recommendation not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to submit recommendation', 500);
    }
  }
}