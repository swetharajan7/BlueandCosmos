import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import RecommendationWritingForm from '../components/recommender/RecommendationWritingForm';
import { recommenderService, RecommenderApplication } from '../services/recommenderService';

const RecommendationWritingPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<RecommenderApplication | null>(null);
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    if (applicationId) {
      loadApplicationData();
    }
  }, [applicationId]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [applicationData, recommendationData] = await Promise.all([
        recommenderService.getApplication(applicationId!),
        recommenderService.getRecommendation(applicationId!).catch(() => null) // May not exist yet
      ]);
      
      setApplication(applicationData);
      setRecommendation(recommendationData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecommendation = async (content: string) => {
    try {
      if (recommendation) {
        await recommenderService.updateRecommendation(recommendation.id, { content });
      } else {
        const newRecommendation = await recommenderService.createRecommendation({
          application_id: applicationId!,
          content
        });
        setRecommendation(newRecommendation);
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const handleSubmitRecommendation = async (content: string) => {
    try {
      if (!recommendation) {
        // Create recommendation first if it doesn't exist
        const newRecommendation = await recommenderService.createRecommendation({
          application_id: applicationId!,
          content
        });
        setRecommendation(newRecommendation);
        await recommenderService.submitRecommendation(newRecommendation.id);
      } else {
        // Update and submit existing recommendation
        await recommenderService.updateRecommendation(recommendation.id, { content });
        await recommenderService.submitRecommendation(recommendation.id);
      }
      
      // Navigate back to dashboard after successful submission
      navigate('/recommender/dashboard');
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !application) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Application not found'}
        </Alert>
        <Box mt={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/recommender/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  // Check if recommendation is already submitted
  if (recommendation?.status === 'submitted' || recommendation?.status === 'delivered') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/recommender/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Typography variant="h4" gutterBottom>
            Recommendation Submitted
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mb: 3 }}>
          Your recommendation for {application.legal_name} has been successfully submitted to all selected universities.
        </Alert>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Submission Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Applicant
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {application.legal_name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Program Type
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {application.program_type.charAt(0).toUpperCase() + application.program_type.slice(1)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Submitted Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(recommendation.submitted_at).toLocaleDateString()}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Word Count
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {recommendation.word_count} words
                </Typography>
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Universities ({application.universities.length})
            </Typography>
            <Box mt={1}>
              {application.universities.map((university, index) => (
                <Chip
                  key={index}
                  label={university}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/recommender/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" gutterBottom display="flex" alignItems="center">
          <PersonIcon sx={{ mr: 1 }} />
          Write Recommendation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create a comprehensive recommendation letter for {application.legal_name}
        </Typography>
      </Box>

      {/* Application Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <SchoolIcon sx={{ mr: 1 }} />
            Application Summary
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Applicant Name
              </Typography>
              <Typography variant="body1" gutterBottom>
                {application.legal_name}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Program Type
              </Typography>
              <Typography variant="body1" gutterBottom>
                {application.program_type.charAt(0).toUpperCase() + application.program_type.slice(1)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Application Term
              </Typography>
              <Typography variant="body1" gutterBottom>
                {application.application_term}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Universities
              </Typography>
              <Typography variant="body1" gutterBottom>
                {application.universities.length} selected
              </Typography>
            </Grid>
          </Grid>
          
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Target Universities
            </Typography>
            <Box>
              {application.universities.map((university, index) => (
                <Chip
                  key={index}
                  label={university}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Writing Form */}
      <RecommendationWritingForm
        applicationData={{
          id: application.id,
          applicantName: application.legal_name,
          programType: application.program_type,
          universities: application.universities,
          relationshipType: application.relationship_type || 'Academic',
          relationshipDuration: application.relationship_duration || '1-2 years',
          recommenderTitle: application.recommender_title || 'Professor'
        }}
        initialContent={recommendation?.content || ''}
        onSave={handleSaveRecommendation}
        onSubmit={handleSubmitRecommendation}
      />
    </Container>
  );
};

export default RecommendationWritingPage;