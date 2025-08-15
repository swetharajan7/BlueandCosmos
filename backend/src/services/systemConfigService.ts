import { Pool } from 'pg';
import { pool } from '../config/database';

export interface SystemConfig {
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxApplicationsPerUser: number;
    maxRecommendersPerApplication: number;
  };
  email: {
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    sendgridApiKey: string;
    emailTemplatesEnabled: boolean;
  };
  ai: {
    openaiApiKey: string;
    openaiModel: string;
    maxTokensPerRequest: number;
    aiAssistanceEnabled: boolean;
    contentQualityThreshold: number;
  };
  security: {
    jwtSecret: string;
    jwtExpirationTime: string;
    passwordMinLength: number;
    requireEmailVerification: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  integrations: {
    googleDocsEnabled: boolean;
    googleClientId: string;
    googleClientSecret: string;
    universityApiEnabled: boolean;
    webhooksEnabled: boolean;
  };
  monitoring: {
    newRelicEnabled: boolean;
    sentryEnabled: boolean;
    cloudWatchEnabled: boolean;
    metricsRetentionDays: number;
    alertingEnabled: boolean;
  };
  backup: {
    autoBackupEnabled: boolean;
    backupFrequency: string;
    backupRetentionDays: number;
    s3BackupBucket: string;
    encryptBackups: boolean;
  };
}

export class SystemConfigService {
  private db: Pool;
  private configCache: SystemConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.db = pool;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    try {
      // Check cache first
      if (this.configCache && Date.now() < this.cacheExpiry) {
        return this.configCache;
      }

      const query = 'SELECT config_key, config_value, is_encrypted FROM system_config';
      const result = await this.db.query(query);

      const config: any = {
        general: {},
        email: {},
        ai: {},
        security: {},
        integrations: {},
        monitoring: {},
        backup: {}
      };

      // Process configuration values
      for (const row of result.rows) {
        const { config_key, config_value, is_encrypted } = row;
        const [category, key] = config_key.split('.');

        if (config[category]) {
          let value = config_value;
          
          // Decrypt if necessary
          if (is_encrypted) {
            value = this.decryptValue(config_value);
          }

          // Parse JSON values
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if not valid JSON
          }

          config[category][key] = value;
        }
      }

      // Set defaults for missing values
      this.setConfigDefaults(config);

      // Cache the result
      this.configCache = config;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return config;
    } catch (error) {
      console.error('Error getting system config:', error);
      throw error;
    }
  }

  async updateSystemConfig(configUpdates: Partial<SystemConfig>): Promise<any> {
    try {
      await this.db.query('BEGIN');

      const updates: Array<{ key: string; value: any; encrypted: boolean }> = [];

      // Process each category of updates
      for (const [category, categoryConfig] of Object.entries(configUpdates)) {
        if (typeof categoryConfig === 'object' && categoryConfig !== null) {
          for (const [key, value] of Object.entries(categoryConfig)) {
            const configKey = `${category}.${key}`;
            const isEncrypted = this.shouldEncryptKey(configKey);
            
            updates.push({
              key: configKey,
              value: isEncrypted ? this.encryptValue(value) : JSON.stringify(value),
              encrypted: isEncrypted
            });
          }
        }
      }

      // Update or insert configuration values
      for (const update of updates) {
        const upsertQuery = `
          INSERT INTO system_config (config_key, config_value, is_encrypted, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (config_key)
          DO UPDATE SET 
            config_value = EXCLUDED.config_value,
            is_encrypted = EXCLUDED.is_encrypted,
            updated_at = NOW()
        `;

        await this.db.query(upsertQuery, [update.key, update.value, update.encrypted]);
      }

      // Log configuration changes
      await this.logConfigChanges(updates);

      await this.db.query('COMMIT');

      // Clear cache
      this.configCache = null;
      this.cacheExpiry = 0;

      return { success: true, message: 'System configuration updated successfully' };
    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error updating system config:', error);
      throw error;
    }
  }

  async getConfigHistory(configKey?: string, limit: number = 50): Promise<any[]> {
    try {
      let query = `
        SELECT 
          config_key,
          old_value,
          new_value,
          changed_by,
          changed_at
        FROM config_audit_log
      `;

      const params: any[] = [];

      if (configKey) {
        query += ' WHERE config_key = $1';
        params.push(configKey);
      }

      query += ` ORDER BY changed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting config history:', error);
      throw error;
    }
  }

  async resetConfigToDefaults(category?: string): Promise<any> {
    try {
      await this.db.query('BEGIN');

      let deleteQuery = 'DELETE FROM system_config';
      const params: any[] = [];

      if (category) {
        deleteQuery += ' WHERE config_key LIKE $1';
        params.push(`${category}.%`);
      }

      await this.db.query(deleteQuery, params);

      // Log the reset
      await this.logConfigReset(category);

      await this.db.query('COMMIT');

      // Clear cache
      this.configCache = null;
      this.cacheExpiry = 0;

      return { 
        success: true, 
        message: category 
          ? `${category} configuration reset to defaults` 
          : 'All configuration reset to defaults' 
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      console.error('Error resetting config:', error);
      throw error;
    }
  }

  async validateConfig(config: Partial<SystemConfig>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate general settings
      if (config.general) {
        if (config.general.maxApplicationsPerUser && config.general.maxApplicationsPerUser < 1) {
          errors.push('Max applications per user must be at least 1');
        }
        if (config.general.maxRecommendersPerApplication && config.general.maxRecommendersPerApplication < 1) {
          errors.push('Max recommenders per application must be at least 1');
        }
      }

      // Validate email settings
      if (config.email) {
        if (config.email.fromEmail && !this.isValidEmail(config.email.fromEmail)) {
          errors.push('Invalid from email address');
        }
        if (config.email.replyToEmail && !this.isValidEmail(config.email.replyToEmail)) {
          errors.push('Invalid reply-to email address');
        }
      }

      // Validate AI settings
      if (config.ai) {
        if (config.ai.maxTokensPerRequest && config.ai.maxTokensPerRequest < 100) {
          errors.push('Max tokens per request must be at least 100');
        }
        if (config.ai.contentQualityThreshold && 
            (config.ai.contentQualityThreshold < 0 || config.ai.contentQualityThreshold > 100)) {
          errors.push('Content quality threshold must be between 0 and 100');
        }
      }

      // Validate security settings
      if (config.security) {
        if (config.security.passwordMinLength && config.security.passwordMinLength < 8) {
          errors.push('Password minimum length must be at least 8');
        }
        if (config.security.sessionTimeout && config.security.sessionTimeout < 300) {
          errors.push('Session timeout must be at least 5 minutes (300 seconds)');
        }
        if (config.security.maxLoginAttempts && config.security.maxLoginAttempts < 3) {
          errors.push('Max login attempts must be at least 3');
        }
      }

      // Validate backup settings
      if (config.backup) {
        if (config.backup.backupRetentionDays && config.backup.backupRetentionDays < 1) {
          errors.push('Backup retention days must be at least 1');
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('Error validating config:', error);
      return { valid: false, errors: ['Configuration validation failed'] };
    }
  }

  private setConfigDefaults(config: any): void {
    // Set default values for missing configuration
    const defaults = {
      general: {
        siteName: 'StellarRec™',
        siteUrl: 'https://stellarrec.com',
        supportEmail: 'support@stellarrec.com',
        maintenanceMode: false,
        registrationEnabled: true,
        maxApplicationsPerUser: 10,
        maxRecommendersPerApplication: 5
      },
      email: {
        fromName: 'StellarRec™',
        fromEmail: 'noreply@stellarrec.com',
        replyToEmail: 'support@stellarrec.com',
        emailTemplatesEnabled: true
      },
      ai: {
        openaiModel: 'gpt-4',
        maxTokensPerRequest: 4000,
        aiAssistanceEnabled: true,
        contentQualityThreshold: 70
      },
      security: {
        jwtExpirationTime: '24h',
        passwordMinLength: 8,
        requireEmailVerification: true,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900
      },
      integrations: {
        googleDocsEnabled: true,
        universityApiEnabled: true,
        webhooksEnabled: true
      },
      monitoring: {
        newRelicEnabled: false,
        sentryEnabled: false,
        cloudWatchEnabled: false,
        metricsRetentionDays: 90,
        alertingEnabled: true
      },
      backup: {
        autoBackupEnabled: true,
        backupFrequency: 'daily',
        backupRetentionDays: 30,
        encryptBackups: true
      }
    };

    // Merge defaults with existing config
    for (const [category, categoryDefaults] of Object.entries(defaults)) {
      if (!config[category]) {
        config[category] = {};
      }
      for (const [key, defaultValue] of Object.entries(categoryDefaults as any)) {
        if (config[category][key] === undefined) {
          config[category][key] = defaultValue;
        }
      }
    }
  }

  private shouldEncryptKey(configKey: string): boolean {
    const encryptedKeys = [
      'email.sendgridApiKey',
      'ai.openaiApiKey',
      'security.jwtSecret',
      'integrations.googleClientSecret',
      'backup.s3BackupBucket'
    ];

    return encryptedKeys.includes(configKey);
  }

  private encryptValue(value: any): string {
    // In a real implementation, use proper encryption
    // For now, just base64 encode as placeholder
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  private decryptValue(encryptedValue: string): any {
    // In a real implementation, use proper decryption
    // For now, just base64 decode as placeholder
    try {
      return JSON.parse(Buffer.from(encryptedValue, 'base64').toString());
    } catch (error) {
      return encryptedValue;
    }
  }

  private async logConfigChanges(updates: Array<{ key: string; value: any; encrypted: boolean }>): Promise<void> {
    try {
      for (const update of updates) {
        const logQuery = `
          INSERT INTO config_audit_log (
            config_key,
            old_value,
            new_value,
            changed_by,
            changed_at
          ) VALUES ($1, 
            (SELECT config_value FROM system_config WHERE config_key = $1),
            $2,
            $3,
            NOW()
          )
        `;

        // In a real implementation, get the admin user ID from request context
        const adminUserId = 'system';

        await this.db.query(logQuery, [
          update.key,
          update.encrypted ? '[ENCRYPTED]' : update.value,
          adminUserId
        ]);
      }
    } catch (error) {
      console.error('Error logging config changes:', error);
      // Don't throw error as it's not critical
    }
  }

  private async logConfigReset(category?: string): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO config_audit_log (
          config_key,
          old_value,
          new_value,
          changed_by,
          changed_at
        ) VALUES ($1, 'RESET', 'DEFAULTS', $2, NOW())
      `;

      const adminUserId = 'system';
      const key = category ? `${category}.*` : '*';

      await this.db.query(logQuery, [key, adminUserId]);
    } catch (error) {
      console.error('Error logging config reset:', error);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}