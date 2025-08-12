-- Comprehensive University Database Population
-- This script populates the universities table with major US institutions
-- and their requirements/categories

-- Clear existing data (be careful in production)
DELETE FROM university_requirements;
DELETE FROM universities WHERE code NOT IN ('HARVARD', 'YALE', 'PRINCETON', 'STANFORD', 'MIT', 'UCB', 'UMICH', 'COLUMBIA', 'UPENN', 'CORNELL');

-- Note: This script preserves the original 10 universities from init.sql and adds comprehensive data

-- Insert Ivy League Universities
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('Brown University', 'BROWN', 'email', 'admissions@brown.edu'),
('Dartmouth College', 'DARTMOUTH', 'email', 'admissions@dartmouth.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Top Private Universities
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('University of Chicago', 'UCHICAGO', 'email', 'admissions@uchicago.edu'),
('Northwestern University', 'NORTHWESTERN', 'email', 'admissions@northwestern.edu'),
('Duke University', 'DUKE', 'email', 'admissions@duke.edu'),
('Vanderbilt University', 'VANDERBILT', 'email', 'admissions@vanderbilt.edu'),
('Rice University', 'RICE', 'email', 'admissions@rice.edu'),
('Washington University in St. Louis', 'WUSTL', 'email', 'admissions@wustl.edu'),
('Emory University', 'EMORY', 'email', 'admissions@emory.edu'),
('Georgetown University', 'GEORGETOWN', 'email', 'admissions@georgetown.edu'),
('Carnegie Mellon University', 'CMU', 'email', 'admissions@cmu.edu'),
('University of Notre Dame', 'NOTRE_DAME', 'email', 'admissions@nd.edu'),
('Wake Forest University', 'WAKE_FOREST', 'email', 'admissions@wfu.edu'),
('Tufts University', 'TUFTS', 'email', 'admissions@tufts.edu'),
('Boston College', 'BC', 'email', 'admissions@bc.edu'),
('New York University', 'NYU', 'email', 'admissions@nyu.edu'),
('University of Southern California', 'USC', 'email', 'admissions@usc.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Top Public Universities
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('University of California, Los Angeles', 'UCLA', 'email', 'admissions@ucla.edu'),
('University of California, San Diego', 'UCSD', 'email', 'admissions@ucsd.edu'),
('University of California, Davis', 'UCD', 'email', 'admissions@ucdavis.edu'),
('University of California, Irvine', 'UCI', 'email', 'admissions@uci.edu'),
('University of California, Santa Barbara', 'UCSB', 'email', 'admissions@ucsb.edu'),
('University of Virginia', 'UVA', 'email', 'admissions@virginia.edu'),
('University of North Carolina at Chapel Hill', 'UNC', 'email', 'admissions@unc.edu'),
('Georgia Institute of Technology', 'GATECH', 'email', 'admissions@gatech.edu'),
('University of Florida', 'UF', 'email', 'admissions@ufl.edu'),
('University of Texas at Austin', 'UT_AUSTIN', 'email', 'admissions@utexas.edu'),
('University of Wisconsin-Madison', 'UW_MADISON', 'email', 'admissions@wisc.edu'),
('University of Illinois at Urbana-Champaign', 'UIUC', 'email', 'admissions@illinois.edu'),
('Ohio State University', 'OSU', 'email', 'admissions@osu.edu'),
('Pennsylvania State University', 'PSU', 'email', 'admissions@psu.edu'),
('University of Washington', 'UW', 'email', 'admissions@uw.edu'),
('Purdue University', 'PURDUE', 'email', 'admissions@purdue.edu'),
('University of Maryland, College Park', 'UMD', 'email', 'admissions@umd.edu'),
('Rutgers University', 'RUTGERS', 'email', 'admissions@rutgers.edu'),
('University of Pittsburgh', 'PITT', 'email', 'admissions@pitt.edu'),
('University of Minnesota', 'UMN', 'email', 'admissions@umn.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Specialized/Technical Universities
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('California Institute of Technology', 'CALTECH', 'email', 'admissions@caltech.edu'),
('Johns Hopkins University', 'JHU', 'email', 'admissions@jhu.edu'),
('University of Rochester', 'ROCHESTER', 'email', 'admissions@rochester.edu'),
('Case Western Reserve University', 'CWRU', 'email', 'admissions@case.edu'),
('Rensselaer Polytechnic Institute', 'RPI', 'email', 'admissions@rpi.edu'),
('Worcester Polytechnic Institute', 'WPI', 'email', 'admissions@wpi.edu'),
('Stevens Institute of Technology', 'STEVENS', 'email', 'admissions@stevens.edu'),
('Rochester Institute of Technology', 'RIT', 'email', 'admissions@rit.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Business Schools (MBA Programs)
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('Wharton School - University of Pennsylvania', 'WHARTON', 'email', 'mba-admissions@wharton.upenn.edu'),
('Kellogg School - Northwestern University', 'KELLOGG', 'email', 'kellogg-admissions@northwestern.edu'),
('Booth School - University of Chicago', 'BOOTH', 'email', 'admissions@chicagobooth.edu'),
('Sloan School - MIT', 'SLOAN', 'email', 'mbaadmissions@sloan.mit.edu'),
('Haas School - UC Berkeley', 'HAAS', 'email', 'mbaadmissions@haas.berkeley.edu'),
('Fuqua School - Duke University', 'FUQUA', 'email', 'fuqua-admissions@duke.edu'),
('Darden School - University of Virginia', 'DARDEN', 'email', 'darden-admissions@virginia.edu'),
('Ross School - University of Michigan', 'ROSS', 'email', 'rossadmissions@umich.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Law Schools
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('Harvard Law School', 'HLS', 'email', 'jdadmissions@law.harvard.edu'),
('Yale Law School', 'YLS', 'email', 'admissions@law.yale.edu'),
('Stanford Law School', 'SLS', 'email', 'admissions@law.stanford.edu'),
('Columbia Law School', 'CLS', 'email', 'admissions@law.columbia.edu'),
('NYU School of Law', 'NYU_LAW', 'email', 'law.moreinfo@nyu.edu'),
('University of Chicago Law School', 'CHICAGO_LAW', 'email', 'admissions@law.uchicago.edu'),
('Georgetown University Law Center', 'GULC', 'email', 'admissions@law.georgetown.edu'),
('University of Virginia School of Law', 'UVA_LAW', 'email', 'lawadmit@virginia.edu')
ON CONFLICT (code) DO NOTHING;

-- Insert Medical Schools
INSERT INTO universities (name, code, submission_format, email_address) VALUES
('Harvard Medical School', 'HMS', 'email', 'admissions@hms.harvard.edu'),
('Johns Hopkins School of Medicine', 'JHSOM', 'email', 'somadmiss@jhmi.edu'),
('University of Pennsylvania Perelman School of Medicine', 'PENN_MED', 'email', 'admiss@mail.med.upenn.edu'),
('Washington University School of Medicine', 'WUSM', 'email', 'wumscoa@email.wustl.edu'),
('Duke University School of Medicine', 'DUKE_MED', 'email', 'medadm@duke.edu'),
('Vanderbilt University School of Medicine', 'VUMC', 'email', 'medschool.admissions@vanderbilt.edu'),
('University of California, San Francisco School of Medicine', 'UCSF_MED', 'email', 'admissions@medschool.ucsf.edu'),
('Mayo Clinic Alix School of Medicine', 'MAYO', 'email', 'mayo.edu.admissions@mayo.edu')
ON CONFLICT (code) DO NOTHING;

-- Now insert university requirements and categories

-- Ivy League category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'ivy_league', false
FROM universities 
WHERE code IN ('HARVARD', 'YALE', 'PRINCETON', 'COLUMBIA', 'UPENN', 'CORNELL', 'BROWN', 'DARTMOUTH');

-- Top Private category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'top_private', false
FROM universities 
WHERE code IN ('UCHICAGO', 'NORTHWESTERN', 'DUKE', 'VANDERBILT', 'RICE', 'WUSTL', 'EMORY', 'GEORGETOWN', 'CMU', 'NOTRE_DAME', 'WAKE_FOREST', 'TUFTS', 'BC', 'NYU', 'USC', 'STANFORD');

-- Top Public category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'top_public', false
FROM universities 
WHERE code IN ('UCB', 'UCLA', 'UCSD', 'UCD', 'UCI', 'UCSB', 'UVA', 'UNC', 'GATECH', 'UF', 'UT_AUSTIN', 'UW_MADISON', 'UIUC', 'OSU', 'PSU', 'UW', 'PURDUE', 'UMD', 'RUTGERS', 'PITT', 'UMN', 'UMICH');

-- Specialized category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'specialized', false
FROM universities 
WHERE code IN ('MIT', 'CALTECH', 'JHU', 'ROCHESTER', 'CWRU', 'RPI', 'WPI', 'STEVENS', 'RIT');

-- Business Schools category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'specialized', false
FROM universities 
WHERE code IN ('WHARTON', 'KELLOGG', 'BOOTH', 'SLOAN', 'HAAS', 'FUQUA', 'DARDEN', 'ROSS');

-- Law Schools category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'specialized', false
FROM universities 
WHERE code IN ('HLS', 'YLS', 'SLS', 'CLS', 'NYU_LAW', 'CHICAGO_LAW', 'GULC', 'UVA_LAW');

-- Medical Schools category
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'category', 'specialized', false
FROM universities 
WHERE code IN ('HMS', 'JHSOM', 'PENN_MED', 'WUSM', 'DUKE_MED', 'VUMC', 'UCSF_MED', 'MAYO');

-- Program type requirements (most universities accept all program types by default)
-- Only add restrictions for specialized schools

-- Business schools only accept MBA programs
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'program_type', 'mba', true
FROM universities 
WHERE code IN ('WHARTON', 'KELLOGG', 'BOOTH', 'SLOAN', 'HAAS', 'FUQUA', 'DARDEN', 'ROSS');

-- Law schools only accept LLM programs (for graduate recommendations)
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'program_type', 'llm', true
FROM universities 
WHERE code IN ('HLS', 'YLS', 'SLS', 'CLS', 'NYU_LAW', 'CHICAGO_LAW', 'GULC', 'UVA_LAW');

-- Medical schools only accept medical programs
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'program_type', 'medical', true
FROM universities 
WHERE code IN ('HMS', 'JHSOM', 'PENN_MED', 'WUSM', 'DUKE_MED', 'VUMC', 'UCSF_MED', 'MAYO');

-- Technical schools prefer STEM programs but accept all
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'program_preference', 'graduate', false
FROM universities 
WHERE code IN ('MIT', 'CALTECH', 'GATECH', 'CMU', 'RPI', 'WPI', 'STEVENS', 'RIT');

-- Add some additional requirements for demonstration

-- Minimum GPA requirements (example)
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'min_gpa', '3.5', false
FROM universities 
WHERE code IN ('HARVARD', 'YALE', 'PRINCETON', 'STANFORD', 'MIT');

INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'min_gpa', '3.0', false
FROM universities 
WHERE code NOT IN ('HARVARD', 'YALE', 'PRINCETON', 'STANFORD', 'MIT');

-- Application deadlines (example - Fall 2026)
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'application_deadline', '2025-12-01', false
FROM universities 
WHERE code IN ('HARVARD', 'YALE', 'PRINCETON', 'STANFORD', 'MIT', 'CALTECH');

INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'application_deadline', '2025-12-15', false
FROM universities 
WHERE code NOT IN ('HARVARD', 'YALE', 'PRINCETON', 'STANFORD', 'MIT', 'CALTECH');

-- Standardized test requirements
INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'test_required', 'GRE', false
FROM universities 
WHERE code NOT IN ('WHARTON', 'KELLOGG', 'BOOTH', 'SLOAN', 'HAAS', 'FUQUA', 'DARDEN', 'ROSS', 'HLS', 'YLS', 'SLS', 'CLS', 'NYU_LAW', 'CHICAGO_LAW', 'GULC', 'UVA_LAW', 'HMS', 'JHSOM', 'PENN_MED', 'WUSM', 'DUKE_MED', 'VUMC', 'UCSF_MED', 'MAYO');

INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'test_required', 'GMAT', false
FROM universities 
WHERE code IN ('WHARTON', 'KELLOGG', 'BOOTH', 'SLOAN', 'HAAS', 'FUQUA', 'DARDEN', 'ROSS');

INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'test_required', 'LSAT', false
FROM universities 
WHERE code IN ('HLS', 'YLS', 'SLS', 'CLS', 'NYU_LAW', 'CHICAGO_LAW', 'GULC', 'UVA_LAW');

INSERT INTO university_requirements (university_id, requirement_type, requirement_value, is_required)
SELECT id, 'test_required', 'MCAT', false
FROM universities 
WHERE code IN ('HMS', 'JHSOM', 'PENN_MED', 'WUSM', 'DUKE_MED', 'VUMC', 'UCSF_MED', 'MAYO');

-- Update university count
SELECT COUNT(*) as total_universities FROM universities WHERE is_active = true;
SELECT COUNT(*) as total_requirements FROM university_requirements;