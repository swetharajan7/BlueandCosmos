-- Support System Tables Migration
-- This migration adds tables for the comprehensive support ticket system

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('technical', 'account', 'application', 'billing', 'general')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('student', 'recommender', 'admin')),
    context_data JSONB,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Support Ticket Messages Table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('user', 'support', 'system')),
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Articles Table
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tags TEXT[],
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('student', 'recommender', 'admin', 'all')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    unhelpful_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Video Tutorials Table
CREATE TABLE IF NOT EXISTS video_tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    duration VARCHAR(10) NOT NULL, -- Format: "MM:SS"
    category VARCHAR(50) NOT NULL,
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('student', 'recommender', 'admin', 'both')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    transcript TEXT,
    tags TEXT[],
    view_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- FAQ Items Table
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('student', 'recommender', 'admin', 'all')),
    tags TEXT[],
    order_index INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    unhelpful_votes INTEGER DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Help Interactions Table (for analytics)
CREATE TABLE IF NOT EXISTS user_help_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'article_view', 'video_view', 'faq_view', 'search', 'ticket_create'
    resource_type VARCHAR(50), -- 'article', 'video', 'faq', 'ticket'
    resource_id UUID,
    search_query TEXT,
    context_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON support_ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_articles_category ON knowledge_base_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_articles_audience ON knowledge_base_articles(audience);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_articles_published ON knowledge_base_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_articles_tags ON knowledge_base_articles USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_video_tutorials_category ON video_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_audience ON video_tutorials(audience);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_difficulty ON video_tutorials(difficulty);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_published ON video_tutorials(is_published);
CREATE INDEX IF NOT EXISTS idx_video_tutorials_tags ON video_tutorials USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_audience ON faq_items(audience);
CREATE INDEX IF NOT EXISTS idx_faq_items_published ON faq_items(is_published);
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_items_order ON faq_items(order_index);

CREATE INDEX IF NOT EXISTS idx_user_help_interactions_user_id ON user_help_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_help_interactions_type ON user_help_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_help_interactions_created_at ON user_help_interactions(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_ticket_messages_updated_at BEFORE UPDATE ON support_ticket_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_articles_updated_at BEFORE UPDATE ON knowledge_base_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_tutorials_updated_at BEFORE UPDATE ON video_tutorials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON faq_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample FAQ items for students
INSERT INTO faq_items (question, answer, category, audience, tags, order_index) VALUES
('How do I create an account?', 'Click "Sign Up" on the homepage, fill in your information, and verify your email address. Your account will be activated immediately after email verification.', 'account', 'student', ARRAY['registration', 'account', 'signup'], 1),
('How do I select universities?', 'In the application wizard, browse our database of universities, use filters to narrow options, and select multiple institutions. We recommend choosing 5-10 universities.', 'application', 'student', ARRAY['universities', 'selection', 'application'], 2),
('How do I add recommenders?', 'Navigate to your application dashboard, click "Add Recommender", and enter their details including name, email, and relationship to you.', 'recommenders', 'student', ARRAY['recommenders', 'invitation', 'management'], 3),
('How do I track my application status?', 'Your dashboard shows real-time updates with green checkmarks for successful submissions, yellow warnings for pending items, and red alerts for issues.', 'status', 'student', ARRAY['status', 'tracking', 'dashboard'], 4);

-- Insert sample FAQ items for recommenders
INSERT INTO faq_items (question, answer, category, audience, tags, order_index) VALUES
('How do I access the platform as a recommender?', 'Click the secure link in the invitation email from your student. No account creation or password is required.', 'access', 'recommender', ARRAY['access', 'invitation', 'login'], 1),
('How long should my recommendation be?', 'The platform enforces a 1000-word limit. Most effective recommendations are 600-800 words with specific examples and concrete details.', 'writing', 'recommender', ARRAY['writing', 'length', 'recommendations'], 2),
('How does the AI writing assistant work?', 'The AI provides suggestions for structure, examples, and improvements based on best practices while maintaining your authentic voice.', 'writing', 'recommender', ARRAY['ai', 'assistant', 'writing', 'help'], 3);

-- Insert sample video tutorials
INSERT INTO video_tutorials (title, description, duration, category, audience, difficulty, video_url, tags, is_published) VALUES
('Getting Started with StellarRec™', 'A comprehensive overview of the platform for new students', '5:30', 'getting-started', 'student', 'beginner', 'https://example.com/video1', ARRAY['overview', 'registration', 'basics'], TRUE),
('Creating Your First Application', 'Step-by-step guide through the application wizard', '8:15', 'application', 'student', 'beginner', 'https://example.com/video2', ARRAY['application', 'wizard', 'universities'], TRUE),
('Using the AI Writing Assistant', 'How to effectively use AI tools while maintaining authenticity', '6:45', 'writing', 'recommender', 'intermediate', 'https://example.com/video3', ARRAY['ai', 'writing', 'assistant', 'recommendations'], TRUE),
('Writing Effective Recommendations', 'Best practices for creating compelling recommendation letters', '9:10', 'writing', 'recommender', 'intermediate', 'https://example.com/video5', ARRAY['best-practices', 'writing', 'quality'], TRUE);

-- Insert sample knowledge base articles
INSERT INTO knowledge_base_articles (title, content, category, audience, tags, is_published) VALUES
('University Application Strategy Guide', 'Best practices for selecting universities, timing your applications, and working effectively with recommenders...', 'strategy', 'student', ARRAY['strategy', 'planning', 'universities'], TRUE),
('Writing Effective Recommendations', 'Guidelines for recommenders on creating compelling, specific, and impactful recommendation letters...', 'writing', 'recommender', ARRAY['writing', 'best-practices', 'recommendations'], TRUE),
('Troubleshooting Common Issues', 'Solutions to frequently encountered problems and how to resolve them...', 'technical', 'all', ARRAY['troubleshooting', 'problems', 'solutions'], TRUE);

COMMENT ON TABLE support_tickets IS 'Support tickets created by users for assistance';
COMMENT ON TABLE support_ticket_messages IS 'Messages/replies within support tickets';
COMMENT ON TABLE knowledge_base_articles IS 'Help articles and documentation';
COMMENT ON TABLE video_tutorials IS 'Video tutorial library';
COMMENT ON TABLE faq_items IS 'Frequently asked questions and answers';
COMMENT ON TABLE user_help_interactions IS 'Analytics tracking for help system usage';