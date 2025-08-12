-- Add columns for recommender application details confirmation
ALTER TABLE application_recommenders 
ADD COLUMN details_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN details_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_application_recommenders_details_confirmed ON application_recommenders(details_confirmed);