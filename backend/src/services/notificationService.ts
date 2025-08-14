import { Pool } from 'pg';
import { getEmailService } from './emailService';
import { AppError } from '../utils/AppError';

export interface NotificationTrigger {
  event: string;
  userId?: string;
  data: Record<string, any>;
}

export class NotificationService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Handle notification triggers based on system events
   */
  async handleNotification(trigger: NotificationTrigger): Promise<void> {
    try {
      const emailService = getEmailService();

      switch (trigger.event) {
        case 'user_registered':
          await this.handleUserRegistered(trigger);
          break;

        case 'invitation_sent':
          await this.handleInvitationSent(trigger);
          break;

        case 'recommendation_submitted':
          await this.handleRecommendationSubmitted(trigger);
          break;

        case 'submission_confirmed':
          await this.handleSubmissionConfirmed(trigger);
          break;

        case 'submission_failed':
          await this.handleSubmissionFailed(trigger);
          break;

        case 'application_status_changed':
          await this.handleApplicationStatusChanged(trigger);
          break;

        case 'reminder_due':
          await this.handleReminderDue(trigger);
          break;

        default:
          console.log(`📧 Unknown notification event: ${trigger.event}`);
      }
    } catch (error: any) {
      console.error(`❌ Error handling notification for event ${trigger.event}:`, error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Handle user registration notification
   */
  private async handleUserRegistered(trigger: NotificationTrigger): Promise<void> {
    const { userId, firstName, email } = trigger.data;
    const emailService = getEmailService();

    await emailService.sendTemplateEmail('welcome', email, {
      firstName
    }, userId);
  }

  /**
   * Handle invitation sent notification
   */
  private async handleInvitationSent(trigger: NotificationTrigger): Promise<void> {
    const {
      recommenderEmail,
      recommenderName,
      studentName,
      universities,
      programType,
      applicationTerm,
      invitationUrl,
      studentId
    } = trigger.data;

    const emailService = getEmailService();

    await emailService.sendRecommendationInvitation(
      recommenderEmail,
      recommenderName,
      studentName,
      universities,
      programType,
      applicationTerm,
      invitationUrl,
      studentId
    );
  }

  /**
   * Handle recommendation submitted notification
   */
  private async handleRecommendationSubmitted(trigger: NotificationTrigger): Promise<void> {
    const {
      studentEmail,
      studentName,
      recommenderName,
      universities,
      submittedAt,
      studentId
    } = trigger.data;

    const emailService = getEmailService();

    await emailService.sendRecommendationSubmitted(
      studentEmail,
      studentName,
      recommenderName,
      universities,
      submittedAt,
      studentId
    );
  }

  /**
   * Handle submission confirmed notification
   */
  private async handleSubmissionConfirmed(trigger: NotificationTrigger): Promise<void> {
    const {
      studentEmail,
      studentName,
      universityName,
      confirmedAt,
      externalReference,
      studentId
    } = trigger.data;

    const emailService = getEmailService();

    await emailService.sendSubmissionConfirmed(
      studentEmail,
      studentName,
      universityName,
      confirmedAt,
      externalReference,
      studentId
    );
  }

  /**
   * Handle submission failed notification
   */
  private async handleSubmissionFailed(trigger: NotificationTrigger): Promise<void> {
    const {
      studentEmail,
      studentName,
      universityName,
      errorMessage,
      nextRetryAt,
      studentId
    } = trigger.data;

    const emailService = getEmailService();

    await emailService.sendSubmissionFailed(
      studentEmail,
      studentName,
      universityName,
      errorMessage,
      nextRetryAt,
      studentId
    );
  }

  /**
   * Handle application status change notification
   */
  private async handleApplicationStatusChanged(trigger: NotificationTrigger): Promise<void> {
    const { applicationId, oldStatus, newStatus, studentId } = trigger.data;

    // Get application details
    const application = await this.getApplicationDetails(applicationId);
    if (!application) return;

    const emailService = getEmailService();

    // Send status update email
    await emailService.sendTemplateEmail('application_status_update', application.student_email, {
      studentName: application.student_name,
      applicationId,
      oldStatus,
      newStatus,
      universities: application.universities.join(', '),
      programType: application.program_type,
      applicationTerm: application.application_term
    }, studentId);
  }

  /**
   * Handle reminder due notification
   */
  private async handleReminderDue(trigger: NotificationTrigger): Promise<void> {
    const { reminderType, recipientEmail, recipientName, data } = trigger.data;

    const emailService = getEmailService();

    let templateData: Record<string, any> = {
      recipientName,
      ...data
    };

    switch (reminderType) {
      case 'invitation_expiring':
        templateData = {
          ...templateData,
          reminderType: 'Your invitation to write a recommendation is expiring soon',
          actionRequired: 'Please complete your recommendation before the deadline'
        };
        break;

      case 'recommendation_overdue':
        templateData = {
          ...templateData,
          reminderType: 'Your recommendation is overdue',
          actionRequired: 'Please submit your recommendation as soon as possible'
        };
        break;

      case 'application_deadline_approaching':
        templateData = {
          ...templateData,
          reminderType: 'Application deadline is approaching',
          actionRequired: 'Please ensure all recommendations are submitted'
        };
        break;
    }

    await emailService.sendTemplateEmail('reminder', recipientEmail, templateData);
  }

  /**
   * Get application details for notifications
   */
  private async getApplicationDetails(applicationId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          a.id,
          a.legal_name,
          a.program_type,
          a.application_term,
          a.status,
          u.email as student_email,
          u.first_name || ' ' || u.last_name as student_name,
          array_agg(univ.name) as universities
        FROM applications a
        JOIN users u ON a.student_id = u.id
        JOIN application_universities au ON a.id = au.application_id
        JOIN universities univ ON au.university_id = univ.id
        WHERE a.id = $1
        GROUP BY a.id, a.legal_name, a.program_type, a.application_term, a.status, u.email, u.first_name, u.last_name
      `;

      const result = await this.db.query(query, [applicationId]);
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('❌ Error getting application details:', error);
      return null;
    }
  }

  /**
   * Schedule reminder notifications
   */
  async scheduleReminder(
    reminderType: string,
    recipientEmail: string,
    recipientName: string,
    scheduledFor: Date,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO scheduled_notifications (
          reminder_type, recipient_email, recipient_name, scheduled_for, data, status
        )
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `;

      await this.db.query(query, [
        reminderType,
        recipientEmail,
        recipientName,
        scheduledFor,
        JSON.stringify(data)
      ]);

      console.log(`📅 Reminder scheduled for ${recipientEmail} at ${scheduledFor}`);
    } catch (error: any) {
      console.error('❌ Error scheduling reminder:', error);
    }
  }

  /**
   * Process due reminders
   */
  async processDueReminders(): Promise<void> {
    try {
      const query = `
        SELECT id, reminder_type, recipient_email, recipient_name, data
        FROM scheduled_notifications
        WHERE status = 'pending' AND scheduled_for <= CURRENT_TIMESTAMP
        ORDER BY scheduled_for ASC
        LIMIT 50
      `;

      const result = await this.db.query(query);

      for (const reminder of result.rows) {
        try {
          await this.handleNotification({
            event: 'reminder_due',
            data: {
              reminderType: reminder.reminder_type,
              recipientEmail: reminder.recipient_email,
              recipientName: reminder.recipient_name,
              ...JSON.parse(reminder.data)
            }
          });

          // Mark as sent
          await this.db.query(
            'UPDATE scheduled_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', reminder.id]
          );
        } catch (error) {
          // Mark as failed
          await this.db.query(
            'UPDATE scheduled_notifications SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', (error as Error).message, reminder.id]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Error processing due reminders:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<any> {
    try {
      let query = `
        SELECT 
          status,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM email_notifications
      `;
      
      const params: any[] = [];
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }
      
      query += `
        GROUP BY status, DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error getting notification stats:', error);
      throw new AppError('Failed to get notification statistics', 500);
    }
  }
}

// Create singleton instance
let notificationServiceInstance: NotificationService | null = null;

export const initializeNotificationService = (db: Pool): NotificationService => {
  notificationServiceInstance = new NotificationService(db);
  return notificationServiceInstance;
};

export const getNotificationService = (): NotificationService => {
  if (!notificationServiceInstance) {
    throw new Error('Notification service not initialized. Call initializeNotificationService first.');
  }
  return notificationServiceInstance;
};