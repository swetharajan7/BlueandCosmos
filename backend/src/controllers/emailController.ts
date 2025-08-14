import { Request, Response } from 'express';
import { getEmailService } from '../services/emailService';
import { getNotificationService } from '../services/notificationService';
import { AppError } from '../utils/AppError';

export class EmailController {
  /**
   * Get user email preferences
   */
  async getEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const emailService = getEmailService();
      const preferences = await emailService.getUserEmailPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error: any) {
      console.error('❌ Error getting email preferences:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get email preferences'
      });
    }
  }

  /**
   * Update user email preferences
   */
  async updateEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { preferences } = req.body;
      if (!preferences || typeof preferences !== 'object') {
        throw new AppError('Invalid preferences data', 400);
      }

      const emailService = getEmailService();
      await emailService.updateEmailPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Email preferences updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Error updating email preferences:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update email preferences'
      });
    }
  }

  /**
   * Get email templates (admin only)
   */
  async getEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Access denied', 403);
      }

      const emailService = getEmailService();
      const templates = await emailService.getAllEmailTemplates();

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('❌ Error getting email templates:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get email templates'
      });
    }
  }

  /**
   * Update email template (admin only)
   */
  async updateEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Access denied', 403);
      }

      const { templateId } = req.params;
      const templateData = req.body;

      const emailService = getEmailService();
      const updatedTemplate = await emailService.updateEmailTemplate(templateId, templateData);

      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Email template updated successfully'
      });
    } catch (error: any) {
      console.error('❌ Error updating email template:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update email template'
      });
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.role === 'admin' ? undefined : req.user?.id;
      
      const notificationService = getNotificationService();
      const stats = await notificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('❌ Error getting notification stats:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get notification statistics'
      });
    }
  }

  /**
   * Handle SendGrid webhook events
   */
  async handleSendGridWebhook(req: Request, res: Response): Promise<void> {
    try {
      const events = req.body;
      if (!Array.isArray(events)) {
        throw new AppError('Invalid webhook payload', 400);
      }

      const emailService = getEmailService();

      for (const event of events) {
        const { event: eventType, sg_message_id, timestamp, ...eventData } = event;
        
        if (sg_message_id && ['delivered', 'bounce', 'dropped', 'open', 'click'].includes(eventType)) {
          await emailService.updateEmailNotificationStatus(
            sg_message_id,
            eventType === 'bounce' ? 'bounced' : 
            eventType === 'dropped' ? 'failed' :
            eventType === 'open' ? 'opened' :
            eventType === 'click' ? 'clicked' : 'delivered',
            eventData
          );
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('❌ Error handling SendGrid webhook:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to process webhook'
      });
    }
  }

  /**
   * Retry failed emails (admin only)
   */
  async retryFailedEmails(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Access denied', 403);
      }

      const emailService = getEmailService();
      await emailService.retryFailedEmails();

      res.json({
        success: true,
        message: 'Failed emails retry initiated'
      });
    } catch (error: any) {
      console.error('❌ Error retrying failed emails:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to retry emails'
      });
    }
  }

  /**
   * Send test email (admin only)
   */
  async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Access denied', 403);
      }

      const { to, templateName, templateData } = req.body;
      if (!to || !templateName) {
        throw new AppError('Missing required fields: to, templateName', 400);
      }

      const emailService = getEmailService();
      const messageId = await emailService.sendTemplateEmail(templateName, to, templateData || {});

      res.json({
        success: true,
        data: { messageId },
        message: 'Test email sent successfully'
      });
    } catch (error: any) {
      console.error('❌ Error sending test email:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to send test email'
      });
    }
  }
}

export const emailController = new EmailController();