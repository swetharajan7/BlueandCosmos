import { Pool } from 'pg';
import { initializeEmailService, getEmailService } from '../services/emailService';
import { initializeNotificationService, getNotificationService } from '../services/notificationService';

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

describe('Email Integration Test', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.FROM_EMAIL = 'test@stellarrec.com';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Initialize services
    initializeEmailService(mockDb);
    initializeNotificationService(mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send template email successfully', async () => {
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

  test('should handle notification triggers', async () => {
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

  test('should update email preferences', async () => {
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

  test('should track email delivery status', async () => {
    (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'notification-id' }] });

    const emailService = getEmailService();
    await emailService.updateEmailNotificationStatus('message-id', 'delivered', {
      timestamp: new Date().toISOString()
    });

    expect(mockDb.query).toHaveBeenCalled();
  });
});