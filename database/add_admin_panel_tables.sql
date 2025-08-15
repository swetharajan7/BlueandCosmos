-- Admin Panel Database Schema
-- This file adds tables required for the admin panel functionality

-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Configuration Audit Log
CREATE TABLE IF NOT EXISTS config_audit_log (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Admin Audit Log for User Actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- User Sessions Table (for tracking active users)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Backups Table
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('full', 'incremental', 'schema')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    size BIGINT DEFAULT 0,
    file_path TEXT,
    s3_key TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Backup Restores Table
CREATE TABLE IF NOT EXISTS backup_restores (
    id VARCHAR(255) PRIMARY KEY,
    backup_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- System Metrics Table (for storing historical metrics)
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Application Universities Junction Table (if not exists)
CREATE TABLE IF NOT EXISTS application_universities (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,
    university_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
    UNIQUE(application_id, university_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_performed_at ON admin_audit_log(performed_at);

CREATE INDEX IF NOT EXISTS idx_config_audit_log_config_key ON config_audit_log(config_key);
CREATE INDEX IF NOT EXISTS idx_config_audit_log_changed_at ON config_audit_log(changed_at);

CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_recorded ON system_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_application_universities_app_id ON application_universities(application_id);
CREATE INDEX IF NOT EXISTS idx_application_universities_uni_id ON application_universities(university_id);

-- Add must_change_password column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Insert default system configuration values
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('general.siteName', '"StellarRec™"', 'Name of the application'),
    ('general.siteUrl', '"https://stellarrec.com"', 'Base URL of the application'),
    ('general.supportEmail', '"support@stellarrec.com"', 'Support email address'),
    ('general.maintenanceMode', 'false', 'Enable/disable maintenance mode'),
    ('general.registrationEnabled', 'true', 'Enable/disable user registration'),
    ('general.maxApplicationsPerUser', '10', 'Maximum applications per user'),
    ('general.maxRecommendersPerApplication', '5', 'Maximum recommenders per application'),
    
    ('email.fromName', '"StellarRec™"', 'Email sender name'),
    ('email.fromEmail', '"noreply@stellarrec.com"', 'Email sender address'),
    ('email.replyToEmail', '"support@stellarrec.com"', 'Email reply-to address'),
    ('email.emailTemplatesEnabled', 'true', 'Enable/disable email templates'),
    
    ('ai.openaiModel', '"gpt-4"', 'OpenAI model to use'),
    ('ai.maxTokensPerRequest', '4000', 'Maximum tokens per AI request'),
    ('ai.aiAssistanceEnabled', 'true', 'Enable/disable AI assistance'),
    ('ai.contentQualityThreshold', '70', 'Content quality threshold percentage'),
    
    ('security.jwtExpirationTime', '"24h"', 'JWT token expiration time'),
    ('security.passwordMinLength', '8', 'Minimum password length'),
    ('security.requireEmailVerification', 'true', 'Require email verification'),
    ('security.sessionTimeout', '3600', 'Session timeout in seconds'),
    ('security.maxLoginAttempts', '5', 'Maximum login attempts'),
    ('security.lockoutDuration', '900', 'Account lockout duration in seconds'),
    
    ('integrations.googleDocsEnabled', 'true', 'Enable/disable Google Docs integration'),
    ('integrations.universityApiEnabled', 'true', 'Enable/disable university API integration'),
    ('integrations.webhooksEnabled', 'true', 'Enable/disable webhooks'),
    
    ('monitoring.newRelicEnabled', 'false', 'Enable/disable New Relic monitoring'),
    ('monitoring.sentryEnabled', 'false', 'Enable/disable Sentry error tracking'),
    ('monitoring.cloudWatchEnabled', 'false', 'Enable/disable CloudWatch logging'),
    ('monitoring.metricsRetentionDays', '90', 'Metrics retention period in days'),
    ('monitoring.alertingEnabled', 'true', 'Enable/disable system alerting'),
    
    ('backup.autoBackupEnabled', 'true', 'Enable/disable automatic backups'),
    ('backup.backupFrequency', '"daily"', 'Backup frequency (hourly, daily, weekly, monthly)'),
    ('backup.backupRetentionDays', '30', 'Backup retention period in days'),
    ('backup.encryptBackups', 'true', 'Enable/disable backup encryption')
ON CONFLICT (config_key) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backups_updated_at BEFORE UPDATE ON backups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_restores_updated_at BEFORE UPDATE ON backup_restores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_alerts_updated_at BEFORE UPDATE ON system_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();