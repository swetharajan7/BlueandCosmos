-- Comprehensive Confirmation System Tables
-- Add tables for support tickets, audit trail, and enhanced confirmation tracking

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
        'submission_failed', 'confirmation_missing', 'university_error', 'other'
    )),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to VARCHAR(255),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Support ticket responses table
CREATE TABLE support_ticket_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    responder_type VARCHAR(20) NOT NULL CHECK (responder_type IN ('user', 'support', 'system')),
    responder_name VARCHAR(255) NOT NULL,
    responder_email VARCHAR(255),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Submission audit trail table
CREATE TABLE submission_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced submission confirmations table (extends existing)
CREATE TABLE IF NOT EXISTS submission_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    confirmation_code VARCHAR(255),
    receipt_url TEXT,
    confirmation_method VARCHAR(50) NOT NULL CHECK (confirmation_method IN ('email', 'api', 'webhook', 'manual')),
    confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id)
);

-- University-specific confirmation settings
CREATE TABLE university_confirmation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    confirmation_method VARCHAR(50) NOT NULL CHECK (confirmation_method IN ('email', 'api', 'webhook', 'manual')),
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    api_endpoint TEXT,
    api_key VARCHAR(255),
    email_pattern TEXT,
    confirmation_delay_hours INTEGER DEFAULT 24,
    retry_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(university_id, confirmation_method)
);

-- Submission status history table
CREATE TABLE submission_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by VARCHAR(50) DEFAULT 'system',
    change_reason TEXT,
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive status reports cache table
CREATE TABLE status_reports_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('student', 'recommender')),
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    UNIQUE(user_id, user_role)
);

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_ticket_id ON support_tickets(ticket_id);

CREATE INDEX idx_support_ticket_responses_ticket_id ON support_ticket_responses(ticket_id);
CREATE INDEX idx_support_ticket_responses_created_at ON support_ticket_responses(created_at);

CREATE INDEX idx_submission_audit_trail_action ON submission_audit_trail(action);
CREATE INDEX idx_submission_audit_trail_created_at ON submission_audit_trail(created_at);
CREATE INDEX idx_submission_audit_trail_data_submission_id ON submission_audit_trail USING GIN ((data->>'submissionId'));
CREATE INDEX idx_submission_audit_trail_data_recommendation_id ON submission_audit_trail USING GIN ((data->>'recommendationId'));
CREATE INDEX idx_submission_audit_trail_data_user_id ON submission_audit_trail USING GIN ((data->>'userId'));

CREATE INDEX IF NOT EXISTS idx_submission_confirmations_submission_id ON submission_confirmations(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_confirmations_confirmed_at ON submission_confirmations(confirmed_at);

CREATE INDEX idx_university_confirmation_settings_university_id ON university_confirmation_settings(university_id);
CREATE INDEX idx_university_confirmation_settings_confirmation_method ON university_confirmation_settings(confirmation_method);

CREATE INDEX idx_submission_status_history_submission_id ON submission_status_history(submission_id);
CREATE INDEX idx_submission_status_history_created_at ON submission_status_history(created_at);

CREATE INDEX idx_status_reports_cache_user_id ON status_reports_cache(user_id);
CREATE INDEX idx_status_reports_cache_expires_at ON status_reports_cache(expires_at);

-- Create triggers for updated_at columns
CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON support_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_submission_confirmations_updated_at 
    BEFORE UPDATE ON submission_confirmations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_university_confirmation_settings_updated_at 
    BEFORE UPDATE ON university_confirmation_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to track submission status changes
CREATE OR REPLACE FUNCTION track_submission_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO submission_status_history (
            submission_id, old_status, new_status, change_reason, additional_data
        ) VALUES (
            NEW.id, 
            OLD.status, 
            NEW.status, 
            CASE 
                WHEN NEW.error_message IS NOT NULL AND OLD.error_message IS NULL THEN 'Error occurred'
                WHEN NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN 'Confirmation received'
                WHEN NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN 'Submission completed'
                ELSE 'Status updated'
            END,
            jsonb_build_object(
                'external_reference', NEW.external_reference,
                'error_message', NEW.error_message,
                'retry_count', NEW.retry_count
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_submission_status_changes_trigger
    AFTER UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION track_submission_status_changes();

-- Insert default university confirmation settings for existing universities
INSERT INTO university_confirmation_settings (university_id, confirmation_method, confirmation_delay_hours)
SELECT id, 'email', 24
FROM universities
WHERE is_active = TRUE
ON CONFLICT (university_id, confirmation_method) DO NOTHING;

-- Create function to clean up expired status reports cache
CREATE OR REPLACE FUNCTION cleanup_expired_status_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM status_reports_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comprehensive email templates for the confirmation system
INSERT INTO email_templates (name, subject, html_content, text_content, template_type) VALUES
('comprehensive_confirmation', 'Comprehensive Submission Report - StellarRec™',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprehensive Submission Report</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:#4caf50;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{padding:20px;background:#f9f9f9}.summary{background:white;padding:20px;border-radius:8px;margin:20px 0;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.footer{padding:20px;text-align:center;font-size:12px;color:#666}.stats{display:flex;justify-content:space-around;margin:20px 0}.stat{text-align:center;padding:15px;background:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.stat-number{font-size:24px;font-weight:bold;color:#1976d2}</style></head><body><div class="header"><h1>📋 Comprehensive Submission Report</h1></div><div class="content"><h2>Hi {{recipientName}},</h2><p>This comprehensive report provides the complete status of your recommendation submissions.</p><div class="stats"><div class="stat"><div class="stat-number">{{totalSubmissions}}</div><div>Total</div></div><div class="stat"><div class="stat-number" style="color:#4caf50;">{{confirmed}}</div><div>Confirmed</div></div><div class="stat"><div class="stat-number" style="color:#ff9800;">{{pending}}</div><div>Pending</div></div><div class="stat"><div class="stat-number" style="color:#f44336;">{{failed}}</div><div>Failed</div></div></div><div class="summary"><h3>Detailed Status</h3>{{submissionDetails}}</div>{{supportInfo}}</div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></body></html>',
'Comprehensive Submission Report - Hi {{recipientName}}, Your submission report: {{totalSubmissions}} total, {{confirmed}} confirmed, {{pending}} pending, {{failed}} failed.',
'submission_confirmed'),

('support_ticket_created', 'Support Ticket Created - {{ticketId}}',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Support Ticket Created</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:#2196f3;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{padding:20px;background:#f9f9f9}.ticket-info{background:white;padding:20px;border-radius:8px;margin:20px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="header"><h1>🎫 Support Ticket Created</h1></div><div class="content"><h2>Hi {{userName}},</h2><p>Your support ticket has been created successfully.</p><div class="ticket-info"><h3>Ticket Information</h3><ul><li><strong>Ticket ID:</strong> {{ticketId}}</li><li><strong>Status:</strong> Open</li><li><strong>Priority:</strong> {{priority}}</li></ul></div><p>Our support team will respond within 24 hours.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></body></html>',
'Support Ticket Created - Hi {{userName}}, Your ticket {{ticketId}} has been created. We will respond within 24 hours.',
'reminder'),

('status_report', 'Status Report - StellarRec™',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Status Report</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:#1976d2;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{padding:20px;background:#f9f9f9}.report{background:white;padding:20px;border-radius:8px;margin:20px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="header"><h1>📊 Status Report</h1></div><div class="content"><h2>Hi {{userName}},</h2><p>Here is your comprehensive status report.</p><div class="report">{{reportContent}}</div></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></body></html>',
'Status Report - Hi {{userName}}, Your comprehensive status report is ready.',
'application_status_update')

ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    updated_at = CURRENT_TIMESTAMP;