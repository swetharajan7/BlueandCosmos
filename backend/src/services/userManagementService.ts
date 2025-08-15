import { Pool } from 'pg';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import { EmailService } from './emailService';

export interface UserFilters {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  applications?: any[];
  recommendations?: any[];
  sessions?: any[];
}

export class UserManagementService {
  private db: Pool;
  private emailService: EmailService;

  constructor() {
    this.db = pool;
    this.emailService = new EmailService();
  }

  async getUsers(filters: UserFilters): Promise<any> {
    try {
      const { page, limit, role, status, search } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (role) {
        whereClause += ` AND role = $${params.length + 1}`;
        params.push(role);
      }

      if (status === 'active') {
        whereClause += ` AND is_active = true`;
      } else if (status === 'inactive') {
        whereClause += ` AND is_active = false`;
      } else if (status === 'verified') {
        whereClause += ` AND is_verified = true`;
      } else if (status === 'unverified') {
        whereClause += ` AND is_verified = false`;
      }

      if (search) {
        whereClause += ` AND (
          first_name ILIKE $${params.length + 1} OR 
          last_name ILIKE $${params.length + 1} OR 
          email ILIKE $${params.length + 1}
        )`;
        params.push(`%${search}%`);
      }

      const query = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.role,
          u.is_verified,
          u.is_active,
          u.created_at,
          u.updated_at,
          us.last_activity as last_login,
          CASE 
            WHEN u.role = 'student' THEN (
              SELECT COUNT(*) FROM applications WHERE student_id = u.id
            )
            WHEN u.role = 'recommender' THEN (
              SELECT COUNT(*) FROM recommendations r 
              JOIN recommenders rec ON r.recommender_id = rec.id 
              WHERE rec.user_id = u.id
            )
            ELSE 0
          END as activity_count
        FROM users u
        LEFT JOIN (
          SELECT user_id, MAX(last_activity) as last_activity
          FROM user_sessions
          GROUP BY user_id
        ) us ON u.id = us.user_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `;

      const [users, count] = await Promise.all([
        this.db.query(query, params),
        this.db.query(countQuery, params.slice(0, -2))
      ]);

      return {
        users: users.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserDetails(userId: string): Promise<UserDetails> {
    try {
      const userQuery = `
        SELECT 
          u.*,
          us.last_activity as last_login
        FROM users u
        LEFT JOIN (
          SELECT user_id, MAX(last_activity) as last_activity
          FROM user_sessions
          WHERE user_id = $1
          GROUP BY user_id
        ) us ON u.id = us.user_id
        WHERE u.id = $1
      `;

      const userResult = await this.db.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get user-specific data based on role
      let applications = [];
      let recommendations = [];
      let sessions = [];

      if (user.role === 'student') {
        const applicationsQuery = `
          SELECT 
            a.*,
            COUNT(r.id) as recommendation_count,
            array_agg(
              json_build_object(
                'id', u.id,
                'name', u.name
              )
            ) FILTER (WHERE u.id IS NOT NULL) as universities
          FROM applications a
          LEFT JOIN recommendations r ON a.id = r.application_id
          LEFT JOIN application_universities au ON a.id = au.application_id
          LEFT JOIN universities u ON au.university_id = u.id
          WHERE a.student_id = $1
          GROUP BY a.id
          ORDER BY a.created_at DESC
        `;
        
        const applicationsResult = await this.db.query(applicationsQuery, [userId]);
        applications = applicationsResult.rows;
      }

      if (user.role === 'recommender') {
        const recommendationsQuery = `
          SELECT 
            r.*,
            a.legal_name as applicant_name,
            a.program_type,
            a.application_term,
            COUNT(s.id) as submission_count
          FROM recommendations r
          JOIN recommenders rec ON r.recommender_id = rec.id
          JOIN applications a ON r.application_id = a.id
          LEFT JOIN submissions s ON r.id = s.recommendation_id
          WHERE rec.user_id = $1
          GROUP BY r.id, a.legal_name, a.program_type, a.application_term
          ORDER BY r.created_at DESC
        `;
        
        const recommendationsResult = await this.db.query(recommendationsQuery, [userId]);
        recommendations = recommendationsResult.rows;
      }

      // Get recent sessions
      const sessionsQuery = `
        SELECT 
          session_id,
          ip_address,
          user_agent,
          created_at,
          last_activity,
          is_active
        FROM user_sessions
        WHERE user_id = $1
        ORDER BY last_activity DESC
        LIMIT 10
      `;
      
      const sessionsResult = await this.db.query(sessionsQuery, [userId]);
      sessions = sessionsResult.rows;

      return {
        ...user,
        applications,
        recommendations,
        sessions
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: string, reason?: string): Promise<any> {
    try {
      let updateQuery = '';
      let params = [userId];

      switch (status) {
        case 'activate':
          updateQuery = 'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1';
          break;
        case 'deactivate':
          updateQuery = 'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1';
          break;
        case 'verify':
          updateQuery = 'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1';
          break;
        case 'unverify':
          updateQuery = 'UPDATE users SET is_verified = false, updated_at = NOW() WHERE id = $1';
          break;
        default:
          throw new Error('Invalid status');
      }

      await this.db.query(updateQuery, params);

      // Log the action
      await this.logUserAction(userId, status, reason);

      // Send notification email to user
      await this.sendStatusChangeNotification(userId, status, reason);

      return { success: true, message: `User ${status} successfully` };
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async resetUserPassword(userId: string): Promise<any> {
    try {
      // Generate temporary password
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user password and force password change on next login
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            must_change_password = true,
            updated_at = NOW()
        WHERE id = $2
      `;

      await this.db.query(updateQuery, [hashedPassword, userId]);

      // Get user email
      const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
      const userResult = await this.db.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(user.email, user.first_name, tempPassword);

      // Log the action
      await this.logUserAction(userId, 'password_reset', 'Admin initiated password reset');

      return { 
        success: true, 
        message: 'Password reset successfully. Temporary password sent to user email.' 
      };
    } catch (error) {
      console.error('Error resetting user password:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, reason?: string): Promise<any> {
    try {
      // Start transaction
      await this.db.query('BEGIN');

      try {
        // Check if user has active applications or recommendations
        const activeDataQuery = `
          SELECT 
            (SELECT COUNT(*) FROM applications WHERE student_id = $1) as applications,
            (SELECT COUNT(*) FROM recommendations r 
             JOIN recommenders rec ON r.recommender_id = rec.id 
             WHERE rec.user_id = $1) as recommendations
        `;

        const activeDataResult = await this.db.query(activeDataQuery, [userId]);
        const activeData = activeDataResult.rows[0];

        if (activeData.applications > 0 || activeData.recommendations > 0) {
          // Soft delete - anonymize data instead of hard delete
          await this.anonymizeUser(userId);
        } else {
          // Hard delete if no active data
          await this.hardDeleteUser(userId);
        }

        // Log the action
        await this.logUserAction(userId, 'deleted', reason);

        await this.db.query('COMMIT');

        return { success: true, message: 'User deleted successfully' };
      } catch (error) {
        await this.db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  private async logUserAction(userId: string, action: string, reason?: string): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO admin_audit_log (
          user_id, 
          action, 
          reason, 
          performed_by, 
          performed_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `;

      // In a real implementation, you'd get the admin user ID from the request context
      const adminUserId = 'system'; // Placeholder

      await this.db.query(logQuery, [userId, action, reason, adminUserId]);
    } catch (error) {
      console.error('Error logging user action:', error);
      // Don't throw error here as it's not critical
    }
  }

  private async sendStatusChangeNotification(userId: string, status: string, reason?: string): Promise<void> {
    try {
      const userQuery = 'SELECT email, first_name FROM users WHERE id = $1';
      const userResult = await this.db.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return;
      }

      const user = userResult.rows[0];
      
      // Send appropriate notification based on status change
      switch (status) {
        case 'activate':
          await this.emailService.sendAccountActivatedEmail(user.email, user.first_name);
          break;
        case 'deactivate':
          await this.emailService.sendAccountDeactivatedEmail(user.email, user.first_name, reason);
          break;
        case 'verify':
          await this.emailService.sendAccountVerifiedEmail(user.email, user.first_name);
          break;
      }
    } catch (error) {
      console.error('Error sending status change notification:', error);
      // Don't throw error here as it's not critical
    }
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async anonymizeUser(userId: string): Promise<void> {
    const anonymizeQuery = `
      UPDATE users 
      SET 
        email = 'deleted_' || id || '@deleted.com',
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        is_active = false,
        is_verified = false,
        password_hash = 'deleted',
        updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(anonymizeQuery, [userId]);
  }

  private async hardDeleteUser(userId: string): Promise<void> {
    // Delete user sessions first
    await this.db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    
    // Delete user
    await this.db.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}