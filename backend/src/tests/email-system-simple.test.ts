import { Pool } from 'pg';

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

describe('Email System Simple Test', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.FROM_EMAIL = 'test@stellarrec.com';
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  test('should import email service successfully', async () => {
    const { initializeEmailService, getEmailService } = await import('../services/emailService');
    
    // Initialize service
    initializeEmailService(mockDb);
    
    // Get service instance
    const emailService = getEmailService();
    
    expect(emailService).toBeDefined();
  });

  test('should import notification service successfully', async () => {
    const { initializeNotificationService, getNotificationService } = await import('../services/notificationService');
    
    // Initialize service
    initializeNotificationService(mockDb);
    
    // Get service instance
    const notificationService = getNotificationService();
    
    expect(notificationService).toBeDefined();
  });

  test('should import cron job service successfully', async () => {
    const { initializeCronJobService, getCronJobService } = await import('../services/cronJobService');
    
    // Initialize service
    const cronJobService = initializeCronJobService(mockDb);
    
    expect(cronJobService).toBeDefined();
    expect(cronJobService.getStatus).toBeDefined();
    
    // Clean up
    cronJobService.stop();
  });
});