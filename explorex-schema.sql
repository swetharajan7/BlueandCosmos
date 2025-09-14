-- ExploreX Database Schema
-- Space Travel Experience Recommendation System
-- PostgreSQL Schema Definition

-- =============================================================================
-- EXTENSIONS AND SETUP
-- =============================================================================

-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- ENUMS AND TYPES
-- =============================================================================

-- Experience Types
CREATE TYPE experience_type AS ENUM (
  'observatory',
  'planetarium', 
  'space_museum',
  'astronomy_lab',
  'stargazing_site',
  'space_center',
  'science_center'
);

-- Event Types
CREATE TYPE event_type AS ENUM (
  'workshop',
  'stargazing',
  'lecture',
  'exhibition',
  'conference',
  'webinar',
  'astronomical_event'
);

-- Astronomical Event Types
CREATE TYPE astro_event_type AS ENUM (
  'meteor_shower',
  'planet_conjunction',
  'lunar_eclipse',
  'solar_eclipse',
  'comet_visibility',
  'iss_flyover'
);

-- Difficulty Levels
CREATE TYPE difficulty_level AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

-- Accessibility Requirements
CREATE TYPE accessibility_requirement AS ENUM (
  'wheelchair_accessible',
  'hearing_impaired_support',
  'visual_impaired_support',
  'mobility_assistance',
  'sign_language'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Experiences Table
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type experience_type NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address JSONB NOT NULL,
  operating_hours JSONB,
  admission_fee JSONB,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  amenities TEXT[],
  accessibility JSONB,
  contact_info JSONB,
  website VARCHAR(500),
  tags TEXT[],
  featured BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Events Table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  type event_type NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  venue VARCHAR(255),
  address JSONB,
  organizer VARCHAR(255),
  registration_required BOOLEAN DEFAULT FALSE,
  registration_url VARCHAR(500),
  capacity INTEGER,
  available_spots INTEGER,
  price JSONB,
  tags TEXT[],
  difficulty difficulty_level DEFAULT 'beginner',
  equipment TEXT[],
  weather_dependent BOOLEAN DEFAULT FALSE,
  contact_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (start_date <= end_date),
  CONSTRAINT valid_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT valid_available_spots CHECK (available_spots IS NULL OR available_spots >= 0)
);

-- Astronomical Events Table
CREATE TABLE astronomical_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type astro_event_type NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  peak_time TIMESTAMP WITH TIME ZONE,
  visibility JSONB,
  best_viewing_locations GEOGRAPHY(POINT, 4326)[],
  difficulty difficulty_level DEFAULT 'beginner',
  equipment TEXT[],
  magnitude DECIMAL(4,2),
  constellation VARCHAR(100),
  direction VARCHAR(50),
  altitude INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (start_time <= end_time),
  CONSTRAINT valid_peak_time CHECK (peak_time IS NULL OR (peak_time >= start_time AND peak_time <= end_time))
);

-- Photos Table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption TEXT,
  photographer VARCHAR(255),
  license VARCHAR(100),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT photo_belongs_to_something CHECK (
    (experience_id IS NOT NULL AND event_id IS NULL) OR
    (experience_id IS NULL AND event_id IS NOT NULL)
  )
);

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User Saved Experiences
CREATE TABLE user_saved_experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Unique constraint
  UNIQUE(user_id, experience_id)
);

-- Visit Records
CREATE TABLE visit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  duration INTEGER, -- minutes
  companions INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itineraries
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_itinerary_dates CHECK (start_date <= end_date)
);

-- Itinerary Items
CREATE TABLE itinerary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  scheduled_date DATE,
  scheduled_time TIME,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT item_belongs_to_something CHECK (
    (experience_id IS NOT NULL AND event_id IS NULL) OR
    (experience_id IS NULL AND event_id IS NOT NULL)
  )
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT review_belongs_to_something CHECK (
    (experience_id IS NOT NULL AND event_id IS NULL) OR
    (experience_id IS NULL AND event_id IS NOT NULL)
  ),
  -- Unique constraint - one review per user per experience/event
  UNIQUE(user_id, experience_id),
  UNIQUE(user_id, event_id)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Geographic indexes
CREATE INDEX idx_experiences_location ON experiences USING GIST (location);
CREATE INDEX idx_events_location ON events USING GIST (location);

-- Text search indexes
CREATE INDEX idx_experiences_name_trgm ON experiences USING GIN (name gin_trgm_ops);
CREATE INDEX idx_experiences_description_trgm ON experiences USING GIN (description gin_trgm_ops);
CREATE INDEX idx_experiences_tags ON experiences USING GIN (tags);

CREATE INDEX idx_events_title_trgm ON events USING GIN (title gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING GIN (description gin_trgm_ops);
CREATE INDEX idx_events_tags ON events USING GIN (tags);

-- Date and time indexes
CREATE INDEX idx_events_start_date ON events (start_date);
CREATE INDEX idx_events_end_date ON events (end_date);
CREATE INDEX idx_astronomical_events_start_time ON astronomical_events (start_time);
CREATE INDEX idx_astronomical_events_end_time ON astronomical_events (end_time);

-- Rating and popularity indexes
CREATE INDEX idx_experiences_rating ON experiences (rating DESC);
CREATE INDEX idx_experiences_review_count ON experiences (review_count DESC);
CREATE INDEX idx_experiences_featured ON experiences (featured) WHERE featured = TRUE;
CREATE INDEX idx_experiences_verified ON experiences (verified) WHERE verified = TRUE;

-- User activity indexes
CREATE INDEX idx_users_last_active ON users (last_active DESC);
CREATE INDEX idx_visit_records_user_id ON visit_records (user_id);
CREATE INDEX idx_visit_records_visit_date ON visit_records (visit_date DESC);

-- Foreign key indexes
CREATE INDEX idx_photos_experience_id ON photos (experience_id);
CREATE INDEX idx_photos_event_id ON photos (event_id);
CREATE INDEX idx_user_saved_experiences_user_id ON user_saved_experiences (user_id);
CREATE INDEX idx_itinerary_items_itinerary_id ON itinerary_items (itinerary_id);
CREATE INDEX idx_reviews_experience_id ON reviews (experience_id);
CREATE INDEX idx_reviews_event_id ON reviews (event_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_astronomical_events_updated_at BEFORE UPDATE ON astronomical_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update experience rating when reviews change
CREATE OR REPLACE FUNCTION update_experience_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE experiences 
    SET 
      rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE experience_id = NEW.experience_id),
      review_count = (SELECT COUNT(*) FROM reviews WHERE experience_id = NEW.experience_id)
    WHERE id = NEW.experience_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE experiences 
    SET 
      rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE experience_id = OLD.experience_id), 0),
      review_count = (SELECT COUNT(*) FROM reviews WHERE experience_id = OLD.experience_id)
    WHERE id = OLD.experience_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for experience rating updates
CREATE TRIGGER update_experience_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_experience_rating();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for experiences with their primary photo
CREATE VIEW experiences_with_photos AS
SELECT 
  e.*,
  p.url as primary_photo_url,
  p.thumbnail_url as primary_photo_thumbnail
FROM experiences e
LEFT JOIN LATERAL (
  SELECT url, thumbnail_url 
  FROM photos 
  WHERE experience_id = e.id 
  ORDER BY created_at 
  LIMIT 1
) p ON true;

-- View for upcoming events
CREATE VIEW upcoming_events AS
SELECT *
FROM events
WHERE end_date >= NOW()
ORDER BY start_date;

-- View for popular experiences
CREATE VIEW popular_experiences AS
SELECT *
FROM experiences
WHERE review_count >= 5 AND rating >= 4.0
ORDER BY rating DESC, review_count DESC;

-- =============================================================================
-- SAMPLE DATA FUNCTIONS
-- =============================================================================

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL, 
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_GeogFromText('POINT(' || lon1 || ' ' || lat1 || ')'),
    ST_GeogFromText('POINT(' || lon2 || ' ' || lat2 || ')')
  ) / 1609.34; -- Convert meters to miles
END;
$$ LANGUAGE plpgsql;

-- Function to search experiences by location and criteria
CREATE OR REPLACE FUNCTION search_experiences(
  search_lat DECIMAL DEFAULT NULL,
  search_lon DECIMAL DEFAULT NULL,
  max_distance_miles DECIMAL DEFAULT 50,
  experience_types experience_type[] DEFAULT NULL,
  min_rating DECIMAL DEFAULT 0,
  search_text TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  name VARCHAR,
  type experience_type,
  rating DECIMAL,
  review_count INTEGER,
  distance_miles DECIMAL,
  primary_photo_url VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.type,
    e.rating,
    e.review_count,
    CASE 
      WHEN search_lat IS NOT NULL AND search_lon IS NOT NULL THEN
        ST_Distance(
          e.location,
          ST_GeogFromText('POINT(' || search_lon || ' ' || search_lat || ')')
        ) / 1609.34
      ELSE NULL
    END as distance_miles,
    p.url as primary_photo_url
  FROM experiences e
  LEFT JOIN LATERAL (
    SELECT url 
    FROM photos 
    WHERE experience_id = e.id 
    ORDER BY created_at 
    LIMIT 1
  ) p ON true
  WHERE 
    (search_lat IS NULL OR search_lon IS NULL OR 
     ST_DWithin(
       e.location,
       ST_GeogFromText('POINT(' || search_lon || ' ' || search_lat || ')'),
       max_distance_miles * 1609.34
     ))
    AND (experience_types IS NULL OR e.type = ANY(experience_types))
    AND e.rating >= min_rating
    AND (search_text IS NULL OR 
         e.name ILIKE '%' || search_text || '%' OR
         e.description ILIKE '%' || search_text || '%' OR
         search_text = ANY(e.tags))
  ORDER BY 
    CASE WHEN search_lat IS NOT NULL AND search_lon IS NOT NULL THEN
      ST_Distance(
        e.location,
        ST_GeogFromText('POINT(' || search_lon || ' ' || search_lat || ')')
      )
    ELSE 0 END,
    e.rating DESC,
    e.review_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE experiences IS 'Core table for space-related attractions and experiences';
COMMENT ON TABLE events IS 'Time-based events like workshops, stargazing sessions, etc.';
COMMENT ON TABLE astronomical_events IS 'Celestial events like eclipses, meteor showers, etc.';
COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE itineraries IS 'User-created travel itineraries';
COMMENT ON TABLE reviews IS 'User reviews and ratings for experiences and events';

COMMENT ON COLUMN experiences.location IS 'Geographic location using PostGIS GEOGRAPHY type';
COMMENT ON COLUMN experiences.operating_hours IS 'JSON array of operating hours by day of week';
COMMENT ON COLUMN experiences.admission_fee IS 'JSON object with pricing information';
COMMENT ON COLUMN experiences.accessibility IS 'JSON object with accessibility features';
COMMENT ON COLUMN experiences.contact_info IS 'JSON object with contact information';

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Create application user (in production, use specific credentials)
-- CREATE USER explorex_app WITH PASSWORD 'secure_password_here';

-- Grant necessary permissions
-- GRANT CONNECT ON DATABASE explorex TO explorex_app;
-- GRANT USAGE ON SCHEMA public TO explorex_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO explorex_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO explorex_app;