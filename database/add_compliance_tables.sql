-- FERPA and GDPR Compliance Tables
-- This script adds tables for comprehensive compliance management

-- User Consent Management
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('data_processing', 'marketing', 'analytics', 'third_party_sharing', 'ferpa_disclosure')),
    consent_given BOOLEAN NOT NULL,
    consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ip_address INET,
    user_agent TEXT,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interests', 'public_task')),
    purpose TEXT NOT NULL,
    data_categories JSONB NOT NULL DEFAULT '[]',
    retention_period VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for user consents
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_active ON user_consents(user_id, consent_type) WHERE consent_given = true AND withdrawal_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_consents_date ON user_consents(consent_date);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(100) NOT NULL UNIQUE,
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    legal_basis TEXT NOT NULL,
    description TEXT NOT NULL,
    auto_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Deletion Logs
CREATE TABLE IF NOT EXISTS data_deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    deletion_reason VARCHAR(50) NOT NULL CHECK (deletion_reason IN ('retention_expired', 'user_request', 'consent_withdrawn', 'account_deleted')),
    deleted_records_count INTEGER NOT NULL DEFAULT 0,
    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    performed_by VARCHAR(100) NOT NULL,
    verification_hash VARCHAR(64) NOT NULL
);

-- Indexes for deletion logs
CREATE INDEX IF NOT EXISTS idx_deletion_logs_user_id ON data_deletion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_date ON data_deletion_logs(deletion_date);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_type ON data_deletion_logs(data_type);

-- Deletion Requests (Right to be Forgotten)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('full_account', 'specific_data', 'anonymization')),
    data_categories JSONB NOT NULL DEFAULT '[]',
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    approved_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(100),
    verification_token VARCHAR(128) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for deletion requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_date ON deletion_requests(requested_date);

-- Deletion Verifications
CREATE TABLE IF NOT EXISTS deletion_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES deletion_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('email', 'identity_document', 'security_questions')),
    verification_data TEXT NOT NULL, -- Encrypted
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Scheduled Deletions
CREATE TABLE IF NOT EXISTS scheduled_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data_types JSONB NOT NULL,
    deletion_reason VARCHAR(50) NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('ferpa', 'gdpr', 'data_inventory', 'consent_audit', 'deletion_audit')),
    generated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reporting_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    reporting_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    generated_by VARCHAR(100) NOT NULL,
    report_data JSONB,
    file_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for compliance reports
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_date ON compliance_reports(generated_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);

-- Enhanced Audit Logs (if not exists)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);

-- Data Processing Activities (GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name VARCHAR(200) NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories JSONB NOT NULL,
    data_subjects JSONB NOT NULL,
    recipients JSONB DEFAULT '[]',
    third_country_transfers JSONB DEFAULT '[]',
    retention_period VARCHAR(100) NOT NULL,
    security_measures TEXT NOT NULL,
    controller_name VARCHAR(200) NOT NULL,
    controller_contact TEXT NOT NULL,
    dpo_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Breach Incidents
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discovered_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN ('confidentiality', 'integrity', 'availability')),
    affected_data_types JSONB NOT NULL,
    affected_individuals_count INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    description TEXT NOT NULL,
    containment_measures TEXT,
    notification_required BOOLEAN NOT NULL DEFAULT false,
    authority_notified_date TIMESTAMP WITH TIME ZONE,
    individuals_notified_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'contained', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Privacy Impact Assessments (DPIA)
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_name VARCHAR(200) NOT NULL,
    processing_activity_id UUID REFERENCES data_processing_activities(id),
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    necessity_assessment TEXT NOT NULL,
    proportionality_assessment TEXT NOT NULL,
    risks_identified JSONB NOT NULL,
    mitigation_measures JSONB NOT NULL,
    residual_risks JSONB DEFAULT '[]',
    consultation_required BOOLEAN NOT NULL DEFAULT false,
    dpo_opinion TEXT,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'under_review', 'approved', 'rejected')),
    approved_by VARCHAR(100),
    approved_date TIMESTAMP WITH TIME ZONE,
    review_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User Sessions for tracking (enhanced)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    session_duration INTEGER, -- in seconds
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity);

-- Email Logs for communication tracking
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template_used VARCHAR(100),
    sent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed')),
    opened_date TIMESTAMP WITH TIME ZONE,
    clicked_date TIMESTAMP WITH TIME ZONE,
    unsubscribed_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(sent_date);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(delivery_status);

-- Marketing Preferences
CREATE TABLE IF NOT EXISTS marketing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_marketing BOOLEAN NOT NULL DEFAULT false,
    sms_marketing BOOLEAN NOT NULL DEFAULT false,
    push_notifications BOOLEAN NOT NULL DEFAULT false,
    newsletter BOOLEAN NOT NULL DEFAULT false,
    product_updates BOOLEAN NOT NULL DEFAULT false,
    preferences_updated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    opt_in_source VARCHAR(100),
    opt_in_ip INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add soft delete column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX idx_users_deleted_at ON users(deleted_at);
    END IF;
END $$;

-- Add encryption status columns to sensitive tables
DO $$ 
BEGIN
    -- Add encryption status to users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'data_encrypted') THEN
        ALTER TABLE users ADD COLUMN data_encrypted BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add encryption status to applications table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'data_encrypted') THEN
        ALTER TABLE applications ADD COLUMN data_encrypted BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Add encryption status to recommendations table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendations' AND column_name = 'data_encrypted') THEN
        ALTER TABLE recommendations ADD COLUMN data_encrypted BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deletion_requests_updated_at BEFORE UPDATE ON deletion_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_deletions_updated_at BEFORE UPDATE ON scheduled_deletions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_processing_activities_updated_at BEFORE UPDATE ON data_processing_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_breach_incidents_updated_at BEFORE UPDATE ON data_breach_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_impact_assessments_updated_at BEFORE UPDATE ON privacy_impact_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_preferences_updated_at BEFORE UPDATE ON marketing_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data processing activities
INSERT INTO data_processing_activities (
    activity_name, purpose, legal_basis, data_categories, data_subjects,
    recipients, retention_period, security_measures, controller_name, controller_contact
) VALUES 
(
    'Student Application Processing',
    'Processing university applications and recommendations',
    'contract',
    '["personal_data", "educational_records", "contact_information"]',
    '["students", "recommenders"]',
    '["universities", "educational_institutions"]',
    '7 years (FERPA compliance)',
    'Encryption at rest and in transit, access controls, audit logging',
    'StellarRec Inc.',
    'privacy@stellarrec.com'
),
(
    'User Account Management',
    'Managing user accounts and authentication',
    'contract',
    '["personal_data", "authentication_data", "contact_information"]',
    '["students", "recommenders", "administrators"]',
    '["internal_staff"]',
    '7 years after account closure',
    'Password hashing, session management, MFA support',
    'StellarRec Inc.',
    'privacy@stellarrec.com'
),
(
    'Communication and Notifications',
    'Sending system notifications and communications',
    'legitimate_interest',
    '["contact_information", "communication_preferences"]',
    '["students", "recommenders"]',
    '["email_service_providers"]',
    '1 year',
    'Encrypted email transmission, opt-out mechanisms',
    'StellarRec Inc.',
    'privacy@stellarrec.com'
)
ON CONFLICT DO NOTHING;

-- Create compliance monitoring views
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    'FERPA' as regulation,
    (SELECT COUNT(*) FROM users WHERE role = 'student') as affected_individuals,
    (SELECT COUNT(*) FROM applications) as educational_records,
    (SELECT COUNT(*) FROM data_retention_policies WHERE legal_basis LIKE '%FERPA%') as applicable_policies,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '30 days') as recent_access_logs
UNION ALL
SELECT 
    'GDPR' as regulation,
    (SELECT COUNT(*) FROM users) as affected_individuals,
    (SELECT COUNT(*) FROM user_consents WHERE consent_given = true AND withdrawal_date IS NULL) as active_consents,
    (SELECT COUNT(*) FROM data_retention_policies) as applicable_policies,
    (SELECT COUNT(*) FROM deletion_requests WHERE status = 'pending') as pending_requests;

-- Create data retention compliance view
CREATE OR REPLACE VIEW data_retention_compliance AS
SELECT 
    drp.data_type,
    drp.retention_period_days,
    drp.auto_delete,
    CASE 
        WHEN drp.data_type = 'user_profile' THEN (
            SELECT COUNT(*) FROM users 
            WHERE created_at < NOW() - INTERVAL '1 day' * drp.retention_period_days
        )
        WHEN drp.data_type = 'applications' THEN (
            SELECT COUNT(*) FROM applications 
            WHERE created_at < NOW() - INTERVAL '1 day' * drp.retention_period_days
        )
        WHEN drp.data_type = 'audit_logs' THEN (
            SELECT COUNT(*) FROM audit_logs 
            WHERE created_at < NOW() - INTERVAL '1 day' * drp.retention_period_days
        )
        ELSE 0
    END as expired_records_count
FROM data_retention_policies drp;

COMMENT ON TABLE user_consents IS 'Stores user consent records for GDPR compliance';
COMMENT ON TABLE data_retention_policies IS 'Defines data retention policies for different data types';
COMMENT ON TABLE data_deletion_logs IS 'Logs all data deletion activities for audit purposes';
COMMENT ON TABLE deletion_requests IS 'Manages right-to-be-forgotten requests';
COMMENT ON TABLE compliance_reports IS 'Stores generated compliance reports';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE data_processing_activities IS 'GDPR Article 30 record of processing activities';
COMMENT ON TABLE data_breach_incidents IS 'Records data breach incidents and responses';
COMMENT ON TABLE privacy_impact_assessments IS 'Data Protection Impact Assessments (DPIA)';