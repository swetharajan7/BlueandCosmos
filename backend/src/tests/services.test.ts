import { EmailService } from '../services/emailService';
import { EncryptionService } from '../services/encryptionService';
import { DataRetentionService } from '../services/dataRetentionService';
import { DataDeletionService } from '../services/dataDeletionService';
import { ErrorLoggingService } from '../services/errorLoggingService';

// Mock external dependencies
jest.mock('@sendgrid/mail');
jest.mock('crypto');

describe('Service Layer Tests', () => {
  describe('EmailService', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService();
    });

    test('should send invitation email', async () => {
      const emailData = {
        to: 'recommender@example.com',
        studentName: 'John Doe',
        universities: ['Harvard', 'MIT'],
        invitationLink: 'https://stellarrec.com/invite/token123'
      };

      const result = await emailService.sendInvitationEmail(emailData);
      expect(result.success).toBe(true);
    });

    test('should send confirmation email', async () => {
      const emailData = {
        to: 'student@example.com',
        studentName: 'John Doe',
        universities: ['Harvard', 'MIT'],
        submissionStatus: 'completed'
      };

      const result = await emailService.sendConfirmationEmail(emailData);
      expect(result.success).toBe(true);
    });

    test('should handle email delivery failures', async () => {
      const emailData = {
        to: 'invalid@email',
        studentName: 'John Doe',
        universities: ['Harvard'],
        invitationLink: 'https://stellarrec.com/invite/token123'
      };

      const result = await emailService.sendInvitationEmail(emailData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate email templates', () => {
      const template = emailService.getTemplate('invitation');
      expect(template).toBeDefined();
      expect(template.subject).toBeDefined();
      expect(template.html).toBeDefined();
    });

    test('should personalize email content', () => {
      const template = emailService.getTemplate('invitation');
      const personalized = emailService.personalizeTemplate(template, {
        studentName: 'John Doe',
        universities: ['Harvard', 'MIT']
      });

      expect(personalized.html).toContain('John Doe');
      expect(personalized.html).toContain('Harvard');
      expect(personalized.html).toContain('MIT');
    });
  });

  describe('EncryptionService', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
      encryptionService = new EncryptionService();
    });

    test('should encrypt and decrypt data', () => {
      const originalData = 'sensitive information';
      const encrypted = encryptionService.encrypt(originalData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(originalData);
      expect(decrypted).toBe(originalData);
    });

    test('should hash passwords securely', async () => {
      const password = 'securePassword123';
      const hash = await encryptionService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should verify password hashes', async () => {
      const password = 'securePassword123';
      const hash = await encryptionService.hashPassword(password);
      const isValid = await encryptionService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject invalid passwords', async () => {
      const password = 'securePassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await encryptionService.hashPassword(password);
      const isValid = await encryptionService.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test('should generate secure tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });
  });

  describe('DataRetentionService', () => {
    let dataRetentionService: DataRetentionService;

    beforeEach(() => {
      dataRetentionService = new DataRetentionService();
    });

    test('should identify expired data', async () => {
      const expiredData = await dataRetentionService.findExpiredData();
      expect(Array.isArray(expiredData)).toBe(true);
    });

    test('should archive old data', async () => {
      const result = await dataRetentionService.archiveOldData();
      expect(result.success).toBe(true);
      expect(result.archivedCount).toBeGreaterThanOrEqual(0);
    });

    test('should respect retention policies', () => {
      const policy = dataRetentionService.getRetentionPolicy('recommendations');
      expect(policy).toBeDefined();
      expect(policy.retentionPeriod).toBeGreaterThan(0);
    });

    test('should handle different data types', () => {
      const userPolicy = dataRetentionService.getRetentionPolicy('users');
      const recommendationPolicy = dataRetentionService.getRetentionPolicy('recommendations');
      const auditPolicy = dataRetentionService.getRetentionPolicy('audit_logs');

      expect(userPolicy.retentionPeriod).toBeDefined();
      expect(recommendationPolicy.retentionPeriod).toBeDefined();
      expect(auditPolicy.retentionPeriod).toBeDefined();
    });
  });

  describe('DataDeletionService', () => {
    let dataDeletionService: DataDeletionService;

    beforeEach(() => {
      dataDeletionService = new DataDeletionService();
    });

    test('should delete user data completely', async () => {
      const userId = 'user-123';
      const result = await dataDeletionService.deleteUserData(userId);

      expect(result.success).toBe(true);
      expect(result.deletedTables).toContain('users');
      expect(result.deletedTables).toContain('applications');
      expect(result.deletedTables).toContain('recommendations');
    });

    test('should handle GDPR deletion requests', async () => {
      const deletionRequest = {
        userId: 'user-123',
        requestType: 'gdpr',
        requestedAt: new Date()
      };

      const result = await dataDeletionService.processGDPRDeletion(deletionRequest);
      expect(result.success).toBe(true);
      expect(result.completedAt).toBeDefined();
    });

    test('should verify complete data removal', async () => {
      const userId = 'user-123';
      await dataDeletionService.deleteUserData(userId);
      
      const remainingData = await dataDeletionService.verifyDataDeletion(userId);
      expect(remainingData.length).toBe(0);
    });

    test('should maintain audit trail for deletions', async () => {
      const userId = 'user-123';
      const result = await dataDeletionService.deleteUserData(userId);

      expect(result.auditLogId).toBeDefined();
      
      const auditLog = await dataDeletionService.getAuditLog(result.auditLogId);
      expect(auditLog.action).toBe('data_deletion');
      expect(auditLog.userId).toBe(userId);
    });
  });

  describe('ErrorLoggingService', () => {
    let errorLoggingService: ErrorLoggingService;

    beforeEach(() => {
      errorLoggingService = new ErrorLoggingService();
    });

    test('should log application errors', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        action: 'submit_recommendation',
        timestamp: new Date()
      };

      const logId = await errorLoggingService.logError(error, context);
      expect(logId).toBeDefined();
    });

    test('should categorize errors by severity', async () => {
      const criticalError = new Error('Database connection failed');
      const warningError = new Error('API rate limit exceeded');

      const criticalLogId = await errorLoggingService.logError(criticalError, { severity: 'critical' });
      const warningLogId = await errorLoggingService.logError(warningError, { severity: 'warning' });

      const criticalLog = await errorLoggingService.getErrorLog(criticalLogId);
      const warningLog = await errorLoggingService.getErrorLog(warningLogId);

      expect(criticalLog.severity).toBe('critical');
      expect(warningLog.severity).toBe('warning');
    });

    test('should aggregate error statistics', async () => {
      const stats = await errorLoggingService.getErrorStatistics();
      
      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.errorsByType).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
    });

    test('should alert on critical errors', async () => {
      const criticalError = new Error('System failure');
      const alertSpy = jest.spyOn(errorLoggingService, 'sendAlert').mockImplementation();

      await errorLoggingService.logError(criticalError, { severity: 'critical' });

      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });
});