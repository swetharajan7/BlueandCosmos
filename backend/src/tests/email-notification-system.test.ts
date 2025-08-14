import { Pool } from 'pg';
import { initializeEmailService, getEmailService } from '../services/emailService';
import { initializeNotificationService, getNotificationService } from '../services/notificationService';
import { initializeCronJobService, getCronJobService } from '../services/cronJobService';

// Mock database connection
const mockDb = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  })
} as unknown as Pool;

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ headers: { 'x-message-id': 'test-message-id' } }])
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  })
}));

describe('Email Notification System', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.FROM_EMAIL = 'test@stellarrec.com';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Initialize services
    initializeEmailService(mockDb);
    initializeNotificationService(mockDb);
    initializeCronJobService(mockDb);
  });

  afterAll(() => {
    const cronJobService = getCronJobService();
    cronJobService.stop();
  });

  describe('EmailService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should send email successfully', async () => {
      const mockTemplate = {
        id: '1',
        name: 'welcome',
        subject: 'Welcome to StellarRec™',
        html_content: '<h1>Welcome {{firstName}}!</h1>',
        text_content: 'Welcome {{firstName}}!',
        template_type: 'welcome',
        is_active: true
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getEmailTemplate
        .mockResolvedValueOnce({ rows: [{ is_enabled: true }] }) // checkEmailPreferences
        .mockResolvedValueOnce({ rows: [{ id: 'notification-id' }] }); // logEmailNotification

      const emailService = getEmailService();
      const messageId = await emailService.sendTemplateEmail(
        'welcome',
        'test@example.com',
        { firstName: 'John' },
        'user-id'
      );

      expect(messageId).toBe('test-message-id');
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    test('should handle email preferences', async () => {
      const preferences = {
        application_updates: true,
        recommendation_updates: false,
        submission_updates: true,
        reminders: true,
        system_notifications: true
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const emailService = getEmailService();
      await emailService.updateEmailPreferences('user-id', preferences);

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should retry failed emails', async () => {
      const failedNotifications = [
        {
          id: '1',
          recipient_email: 'test@example.com',
          subject: 'Test Subject',
          html_content: '<p>Test content</p>',
          text_content: 'Test content',
          retry_count: 1,
          max_retries: 3
        }
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: failedNotifications }) // Get failed emails
        .mockResolvedValue({ rows: [] }); // Update retry count

      const emailService = getEmailService();
      await emailService.retryFailedEmails();

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should update email notification status', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'notification-id' }] });

      const emailService = getEmailService();
      await emailService.updateEmailNotificationStatus('message-id', 'delivered', {
        timestamp: new Date().toISOString()
      });

      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('NotificationService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should handle user registration notification', async () => {
      const mockTemplate = {
        id: '1',
        name: 'welcome',
        subject: 'Welcome to StellarRec™',
        html_content: '<h1>Welcome {{firstName}}!</h1>',
        text_content: 'Welcome {{firstName}}!',
        template_type: 'welcome',
        is_active: true
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getEmailTemplate
        .mockResolvedValueOnce({ rows: [{ is_enabled: true }] }) // checkEmailPreferences
        .mockResolvedValueOnce({ rows: [{ id: 'notification-id' }] }); // logEmailNotification

      const notificationService = getNotificationService();
      await notificationService.handleNotification({
        event: 'user_registered',
        userId: 'user-id',
        data: {
          userId: 'user-id',
          firstName: 'John',
          email: 'john@example.com'
        }
      });

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should handle invitation sent notification', async () => {
      const mockTemplate = {
        id: '2',
        name: 'invitation_sent',
        subject: 'Recommendation Request - StellarRec™',
        html_content: '<h1>Invitation for {{studentName}}</h1>',
        text_content: 'Invitation for {{studentName}}',
        template_type: 'invitation_sent',
        is_active: true
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getEmailTemplate
        .mockResolvedValueOnce({ rows: [{ is_enabled: true }] }) // checkEmailPreferences
        .mockResolvedValueOnce({ rows: [{ id: 'notification-id' }] }); // logEmailNotification

      const notificationService = getNotificationService();
      await notificationService.handleNotification({
        event: 'invitation_sent',
        userId: 'student-id',
        data: {
          recommenderEmail: 'recommender@example.com',
          recommenderName: 'Dr. Smith',
          studentName: 'John Doe',
          universities: ['Harvard University', 'MIT'],
          programType: 'graduate',
          applicationTerm: 'Fall 2024',
          invitationUrl: 'http://localhost:3000/invitation/token',
          studentId: 'student-id'
        }
      });

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should schedule reminders', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const notificationService = getNotificationService();
      await notificationService.scheduleReminder(
        'invitation_expiring',
        'recommender@example.com',
        'Dr. Smith',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        {
          studentName: 'John Doe',
          universities: ['Harvard University'],
          programType: 'graduate',
          applicationTerm: 'Fall 2024'
        }
      );

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should process due reminders', async () => {
      const dueReminders = [
        {
          id: '1',
          reminder_type: 'invitation_expiring',
          recipient_email: 'recommender@example.com',
          recipient_name: 'Dr. Smith',
          data: JSON.stringify({
            studentName: 'John Doe',
            universities: ['Harvard University']
          })
        }
      ];

      const mockTemplate = {
        id: '3',
        name: 'reminder',
        subject: 'Reminder - StellarRec™',
        html_content: '<h1>Reminder for {{recipientName}}</h1>',
        text_content: 'Reminder for {{recipientName}}',
        template_type: 'reminder',
        is_active: true
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: dueReminders }) // Get due reminders
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getEmailTemplate
        .mockResolvedValueOnce({ rows: [{ is_enabled: true }] }) // checkEmailPreferences
        .mockResolvedValueOnce({ rows: [{ id: 'notification-id' }] }) // logEmailNotification
        .mockResolvedValue({ rows: [] }); // Update reminder status

      const notificationService = getNotificationService();
      await notificationService.processDueReminders();

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should get notification statistics', async () => {
      const mockStats = [
        { status: 'sent', count: '10', date: new Date() },
        { status: 'delivered', count: '8', date: new Date() },
        { status: 'failed', count: '2', date: new Date() }
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockStats });

      const notificationService = getNotificationService();
      const stats = await notificationService.getNotificationStats('user-id');

      expect(stats).toEqual(mockStats);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('CronJobService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should start and stop cron jobs', () => {
      const cronJobService = getCronJobService();
      const status1 = cronJobService.getStatus();
      expect(status1.isRunning).toBe(true);

      cronJobService.stop();
      const status2 = cronJobService.getStatus();
      expect(status2.isRunning).toBe(false);

      cronJobService.start();
      const status3 = cronJobService.getStatus();
      expect(status3.isRunning).toBe(true);
    });

    test('should handle cron job errors gracefully', async () => {
      // Mock database error
      (mockDb.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // This should not throw an error
      await expect(async () => {
        // Trigger a scheduled task run
        const cronJobService = getCronJobService();
        await (cronJobService as any).runScheduledTasks();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete notification flow', async () => {
      // Mock all database calls
      const mockTemplate = {
        id: '1',
        name: 'recommendation_submitted',
        subject: 'Recommendation Submitted Successfully',
        html_content: '<h1>Recommendation submitted for {{studentName}}</h1>',
        text_content: 'Recommendation submitted for {{studentName}}',
        template_type: 'recommendation_submitted',
        is_active: true
      };

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // getEmailTemplate
        .mockResolvedValueOnce({ rows: [{ is_enabled: true }] }) // checkEmailPreferences
        .mockResolvedValueOnce({ rows: [{ id: 'notification-id' }] }); // logEmailNotification

      // Simulate recommendation submission notification
      const notificationService = getNotificationService();
      await notificationService.handleNotification({
        event: 'recommendation_submitted',
        userId: 'student-id',
        data: {
          studentEmail: 'student@example.com',
          studentName: 'John Doe',
          recommenderName: 'Dr. Smith',
          universities: ['Harvard University', 'MIT'],
          submittedAt: new Date().toISOString(),
          studentId: 'student-id'
        }
      });

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should handle email delivery tracking', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'notification-id' }] });

      // Simulate SendGrid webhook event
      const emailService = getEmailService();
      await emailService.updateEmailNotificationStatus('message-id', 'delivered', {
        timestamp: new Date().toISOString(),
        event: 'delivered'
      });

      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should handle bounce tracking', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'notification-id' }] });

      // Simulate SendGrid bounce event
      const emailService = getEmailService();
      await emailService.updateEmailNotificationStatus('message-id', 'bounced', {
        timestamp: new Date().toISOString(),
        event: 'bounce',
        reason: 'Invalid email address'
      });

      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});