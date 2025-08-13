-- Add monitoring and error logging tables for StellarRec system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('submission', 'authentication', 'validation', 'integration', 'system', 'user')),
    message TEXT NOT NULL,
    details JSONB,
    stack_trace TEXT,
    user_id UUID,
    submission_id UUID,
    university_id UUID,
    request_id VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[]
);

-- Indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_submission_id ON error_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_university_id ON error_logs(university_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_tags ON error_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);

-- Submission queue table
CREATE TABLE IF NOT EXISTS submission_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    backoff_multiplier DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id)
);

-- Indexes for submission_queue
CREATE INDEX IF NOT EXISTS idx_submission_queue_priority_scheduled 
ON submission_queue(priority ASC, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_submission_queue_scheduled_at 
ON submission_queue(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_submission_queue_attempts 
ON submission_queue(attempts);

-- Trigger for submission_queue updated_at
CREATE TRIGGER IF NOT EXISTS update_submission_queue_updated_at 
BEFORE UPDATE ON submission_queue 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification rules table
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('submission_failure', 'high_failure_rate', 'queue_backlog', 'system_health', 'university_down')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notification_rules
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(enabled);

-- Trigger for notification_rules updated_at
CREATE TRIGGER IF NOT EXISTS update_notification_rules_updated_at 
BEFORE UPDATE ON notification_rules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification events table
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for notification_events
CREATE INDEX IF NOT EXISTS idx_notification_events_rule_id ON notification_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_severity ON notification_events(severity);
CREATE INDEX IF NOT EXISTS idx_notification_events_triggered_at ON notification_events(triggered_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_acknowledged ON notification_events(acknowledged);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Check if users table exists and add foreign key for error_logs.user_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_error_logs_user_id' 
            AND table_name = 'error_logs'
        ) THEN
            ALTER TABLE error_logs 
            ADD CONSTRAINT fk_error_logs_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Check if submissions table exists and add foreign key for error_logs.submission_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_error_logs_submission_id' 
            AND table_name = 'error_logs'
        ) THEN
            ALTER TABLE error_logs 
            ADD CONSTRAINT fk_error_logs_submission_id 
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- Check if universities table exists and add foreign key for error_logs.university_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'universities') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_error_logs_university_id' 
            AND table_name = 'error_logs'
        ) THEN
            ALTER TABLE error_logs 
            ADD CONSTRAINT fk_error_logs_university_id 
            FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Insert default notification rules
INSERT INTO notification_rules (name, type, enabled, conditions, actions, cooldown_minutes)
VALUES 
    (
        'High Submission Failures',
        'submission_failure',
        true,
        '{"threshold": 10, "timeWindow": 30}',
        '{"email": {"recipients": ["admin@stellarrec.com"], "template": "admin_alert"}}',
        30
    ),
    (
        'Critical Failure Rate',
        'high_failure_rate',
        true,
        '{"threshold": 75, "timeWindow": 60}',
        '{"email": {"recipients": ["admin@stellarrec.com", "tech@stellarrec.com"], "template": "critical_alert"}}',
        60
    ),
    (
        'Queue Backlog Alert',
        'queue_backlog',
        true,
        '{"threshold": 100}',
        '{"email": {"recipients": ["admin@stellarrec.com"], "template": "admin_alert"}}',
        60
    ),
    (
        'System Health Critical',
        'system_health',
        true,
        '{"threshold": 1}',
        '{"email": {"recipients": ["admin@stellarrec.com", "tech@stellarrec.com"], "template": "critical_alert"}}',
        30
    )
ON CONFLICT DO NOTHING;

-- Create a view for submission analytics
CREATE OR REPLACE VIEW submission_analytics_view AS
SELECT 
    DATE(s.created_at) as date,
    u.name as university_name,
    u.id as university_id,
    s.submission_method,
    s.status,
    COUNT(*) as submission_count,
    AVG(
        CASE 
            WHEN s.confirmed_at IS NOT NULL AND s.submitted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (s.confirmed_at - s.submitted_at))
            ELSE NULL
        END
    ) as avg_processing_time_seconds
FROM submissions s
JOIN universities u ON s.university_id = u.id
WHERE s.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(s.created_at), u.name, u.id, s.submission_method, s.status
ORDER BY date DESC, university_name;

-- Create a view for error analytics
CREATE OR REPLACE VIEW error_analytics_view AS
SELECT 
    DATE(timestamp) as date,
    level,
    category,
    COUNT(*) as error_count,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_count,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved_count
FROM error_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp), level, category
ORDER BY date DESC, error_count DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO stellarrec_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO stellarrec_app;

COMMENT ON TABLE error_logs IS 'Comprehensive error logging for debugging and monitoring';
COMMENT ON TABLE submission_queue IS 'Queue system for managing submission processing with retry logic';
COMMENT ON TABLE notification_rules IS 'Configurable rules for admin notifications and alerts';
COMMENT ON TABLE notification_events IS 'Log of triggered notification events';
COMMENT ON VIEW submission_analytics_view IS 'Aggregated submission data for analytics and reporting';
COMMENT ON VIEW error_analytics_view IS 'Aggregated error data for analytics and monitoring';