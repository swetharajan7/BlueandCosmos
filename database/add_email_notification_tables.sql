-- Email notification system tables
-- Add tables for email templates, notifications, and tracking

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'welcome', 'email_verification', 'password_reset', 'password_reset_confirmation',
        'invitation_sent', 'recommendation_submitted', 'submission_confirmed',
        'submission_failed', 'application_status_update', 'reminder'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email notifications table
CREATE TABLE email_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sendgrid_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email preferences table
CREATE TABLE email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'application_updates', 'recommendation_updates', 'submission_updates',
        'reminders', 'marketing', 'system_notifications'
    )),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type)
);

-- Email events table (for tracking opens, clicks, etc.)
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES email_notifications(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'dropped', 'deferred')),
    event_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_sent_at ON email_notifications(sent_at);
CREATE INDEX idx_email_notifications_sendgrid_message_id ON email_notifications(sendgrid_message_id);
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_events_notification_id ON email_events(notification_id);
CREATE INDEX idx_email_events_event_type ON email_events(event_type);
CREATE INDEX idx_email_events_timestamp ON email_events(timestamp);

-- Create triggers for updated_at columns
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_notifications_updated_at BEFORE UPDATE ON email_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON email_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, template_type) VALUES
('welcome', 'Welcome to StellarRec™', 
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome to StellarRec™</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#1976d2;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Welcome to StellarRec™</h1></div><div class="content"><h2>Hi {{firstName}},</h2><p>Welcome to StellarRec™! Your account has been successfully created.</p><p>You can now start creating applications and managing your university recommendations.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Welcome to StellarRec™! Hi {{firstName}}, Your account has been successfully created. You can now start creating applications and managing your university recommendations.',
'welcome'),

('invitation_sent', 'Recommendation Request - StellarRec™',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recommendation Request</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#1976d2;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.button{display:inline-block;background:#1976d2;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;margin:20px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Recommendation Request</h1></div><div class="content"><h2>Dear {{recommenderName}},</h2><p>{{studentName}} has requested a letter of recommendation from you through StellarRec™.</p><p><strong>Application Details:</strong></p><ul><li>Student: {{studentName}}</li><li>Universities: {{universities}}</li><li>Program: {{programType}}</li><li>Term: {{applicationTerm}}</li></ul><p style="text-align:center;"><a href="{{invitationUrl}}" class="button">Write Recommendation</a></p><p>This invitation will expire in 7 days.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Recommendation Request - Dear {{recommenderName}}, {{studentName}} has requested a letter of recommendation from you through StellarRec™. Visit: {{invitationUrl}}',
'invitation_sent'),

('recommendation_submitted', 'Recommendation Submitted Successfully',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recommendation Submitted</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4caf50;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.success{background:#d4edda;border:1px solid #c3e6cb;padding:15px;border-radius:4px;margin:15px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Recommendation Submitted</h1></div><div class="content"><h2>Hi {{studentName}},</h2><div class="success"><p><strong>Great news! Your recommendation has been submitted.</strong></p></div><p>{{recommenderName}} has successfully submitted your recommendation letter.</p><p><strong>Submission Details:</strong></p><ul><li>Recommender: {{recommenderName}}</li><li>Universities: {{universities}}</li><li>Submitted: {{submittedAt}}</li></ul><p>You can track the status of your submissions in your dashboard.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Recommendation Submitted - Hi {{studentName}}, {{recommenderName}} has successfully submitted your recommendation letter for {{universities}}.',
'recommendation_submitted'),

('submission_confirmed', 'University Submission Confirmed',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Submission Confirmed</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4caf50;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.success{background:#d4edda;border:1px solid #c3e6cb;padding:15px;border-radius:4px;margin:15px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Submission Confirmed</h1></div><div class="content"><h2>Hi {{studentName}},</h2><div class="success"><p><strong>✅ Your recommendation has been successfully delivered!</strong></p></div><p>We have confirmed that your recommendation letter has been received by {{universityName}}.</p><p><strong>Confirmation Details:</strong></p><ul><li>University: {{universityName}}</li><li>Confirmed: {{confirmedAt}}</li><li>Reference: {{externalReference}}</li></ul></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Submission Confirmed - Hi {{studentName}}, Your recommendation has been successfully delivered to {{universityName}}.',
'submission_confirmed'),

('submission_failed', 'Submission Issue - Action Required',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Submission Issue</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#f44336;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.warning{background:#fff3cd;border:1px solid #ffeaa7;padding:15px;border-radius:4px;margin:15px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Submission Issue</h1></div><div class="content"><h2>Hi {{studentName}},</h2><div class="warning"><p><strong>⚠️ There was an issue submitting your recommendation to {{universityName}}.</strong></p></div><p>We encountered a problem while submitting your recommendation letter. Our team is working to resolve this issue.</p><p><strong>Issue Details:</strong></p><ul><li>University: {{universityName}}</li><li>Error: {{errorMessage}}</li><li>Next Retry: {{nextRetryAt}}</li></ul><p>We will automatically retry the submission. If the issue persists, we will contact you with next steps.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Submission Issue - Hi {{studentName}}, There was an issue submitting your recommendation to {{universityName}}. We are working to resolve this.',
'submission_failed'),

('reminder', 'Reminder - StellarRec™',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reminder</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#ff9800;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.reminder{background:#fff3cd;border:1px solid #ffeaa7;padding:15px;border-radius:4px;margin:15px 0}.button{display:inline-block;background:#ff9800;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;margin:20px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Reminder</h1></div><div class="content"><h2>Hi {{recipientName}},</h2><div class="reminder"><p><strong>{{reminderType}}</strong></p></div><p>{{actionRequired}}</p><p>If you have any questions or need assistance, please don\'t hesitate to contact our support team.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Reminder - Hi {{recipientName}}, {{reminderType}}. {{actionRequired}}',
'reminder'),

('application_status_update', 'Application Status Update - StellarRec™',
'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Application Status Update</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2196f3;color:white;padding:20px;text-align:center}.content{padding:20px;background:#f9f9f9}.status-update{background:#e3f2fd;border-left:4px solid #2196f3;padding:15px;margin:15px 0}.footer{padding:20px;text-align:center;font-size:12px;color:#666}</style></head><body><div class="container"><div class="header"><h1>Application Status Update</h1></div><div class="content"><h2>Hi {{studentName}},</h2><div class="status-update"><p><strong>Your application status has been updated</strong></p></div><p><strong>Application Details:</strong></p><ul><li>Application ID: {{applicationId}}</li><li>Previous Status: {{oldStatus}}</li><li>New Status: {{newStatus}}</li><li>Universities: {{universities}}</li><li>Program: {{programType}}</li><li>Term: {{applicationTerm}}</li></ul><p>You can view the full details in your dashboard.</p></div><div class="footer"><p>© 2024 StellarRec™. All rights reserved.</p></div></div></body></html>',
'Application Status Update - Hi {{studentName}}, Your application status has been updated from {{oldStatus}} to {{newStatus}}.',
'application_status_update');

-- Scheduled notifications table (for reminders)
CREATE TABLE scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
        'invitation_expiring', 'recommendation_overdue', 'application_deadline_approaching'
    )),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for scheduled notifications
CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_recipient_email ON scheduled_notifications(recipient_email);

-- Insert default email preferences for existing users
INSERT INTO email_preferences (user_id, notification_type, is_enabled)
SELECT u.id, unnest(ARRAY['application_updates', 'recommendation_updates', 'submission_updates', 'reminders', 'system_notifications']), TRUE
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM email_preferences ep WHERE ep.user_id = u.id
);