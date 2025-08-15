-- Add monitoring and observability tables

-- User actions tracking table
CREATE TABLE IF NOT EXISTS user_actions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action ON user_actions(action);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    status_code INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics(status_code);

-- Business metrics table
CREATE TABLE IF NOT EXISTS business_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'user', 'application', 'recommendation', etc.
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_business_metrics_name ON business_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(period_start, period_end);

-- Health check results table
CREATE TABLE IF NOT EXISTS health_check_results (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'healthy', 'unhealthy', 'degraded'
    response_time INTEGER NOT NULL, -- in milliseconds
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_health_check_service ON health_check_results(service_name);
CREATE INDEX IF NOT EXISTS idx_health_check_created_at ON health_check_results(created_at);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON health_check_results(status);

-- Alert history table
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_resolved ON alert_history(resolved);

-- Add quality_score column to recommendations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recommendations' AND column_name = 'quality_score') THEN
        ALTER TABLE recommendations ADD COLUMN quality_score DECIMAL(5,2);
    END IF;
END $$;

-- Add last_login column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create function to update last_login automatically
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called from the application when user logs in
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS void AS $$
BEGIN
    -- Clean up old user actions (keep 90 days)
    DELETE FROM user_actions WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old system metrics (keep 30 days)
    DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old performance metrics (keep 7 days)
    DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Clean up old health check results (keep 30 days)
    DELETE FROM health_check_results WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean up resolved alerts older than 30 days
    DELETE FROM alert_history WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- This would typically be set up by a DBA or through application cron jobs
-- SELECT cron.schedule('cleanup-monitoring-data', '0 2 * * *', 'SELECT cleanup_monitoring_data();');

COMMENT ON TABLE user_actions IS 'Tracks user actions for analytics and auditing';
COMMENT ON TABLE system_metrics IS 'Stores system-level metrics for monitoring';
COMMENT ON TABLE performance_metrics IS 'Tracks API endpoint performance metrics';
COMMENT ON TABLE business_metrics IS 'Stores business KPI metrics';
COMMENT ON TABLE health_check_results IS 'Stores health check results for all services';
COMMENT ON TABLE alert_history IS 'Tracks system alerts and their resolution status';