import crypto from 'crypto';
import { AppError } from '../utils/AppError';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  
  private static encryptionKey: Buffer;

  static initialize() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive a consistent key from the environment variable
    this.encryptionKey = crypto.scryptSync(key, 'stellarrec-salt', this.KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data at rest
   */
  static encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, this.encryptionKey);
      cipher.setAAD(Buffer.from('stellarrec-aad'));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv + tag + encrypted data
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new AppError('Encryption failed', 500);
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.ALGORITHM, this.encryptionKey);
      decipher.setAAD(Buffer.from('stellarrec-aad'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new AppError('Decryption failed', 500);
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt PII fields in database records
   */
  static encryptPII(data: Record<string, any>, piiFields: string[]): Record<string, any> {
    const encrypted = { ...data };
    
    piiFields.forEach(field => {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });
    
    return encrypted;
  }

  /**
   * Decrypt PII fields from database records
   */
  static decryptPII(data: Record<string, any>, piiFields: string[]): Record<string, any> {
    const decrypted = { ...data };
    
    piiFields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          // If decryption fails, the data might not be encrypted
          // This handles migration scenarios
        }
      }
    });
    
    return decrypted;
  }
}