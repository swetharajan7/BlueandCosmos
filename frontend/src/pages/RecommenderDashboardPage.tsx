import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { RootState } from '../store/store';
import { recommenderService, RecommenderApplication } from '../services/recommenderService';

const RecommenderDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<RecommenderApplication[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [applicationsData, profileData] = await Promise.all([
        recommenderService.getApplications(),
        recommenderService.getProfile()
      ]);
      
      setApplications(applicationsData);
      setProfile(profileData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'submitted':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'submitted':
        return <AssignmentIcon />;
      default:
        return <ScheduleIcon />;
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Recommender Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.first_name}! Manage your recommendations and profile.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Your Profile</Typography>
              </Box>
              
              {profile && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Professional Title
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {profile.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Organization
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {profile.organization}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Email
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {profile.professional_email}
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate('/recommender/profile')}
                    sx={{ mt: 2 }}
                  >
                    Edit Profile
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Applications */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Recommendation Requests ({applications.length})
                </Typography>
              </Box>

              {applications.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No recommendation requests at this time.
                  </Typography>
                </Box>
              ) : (
                <List>
                  {applications.map((application, index) => (
                    <React.Fragment key={application.id}>
                      <ListItem
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => navigate(`/recommender/applications/${application.id}/write`)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(application.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1">
                                {application.legal_name}
                              </Typography>
                              <Chip
                                label={application.status}
                                color={getStatusColor(application.status) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {application.program_type.charAt(0).toUpperCase() + 
                                 application.program_type.slice(1)} • {application.application_term}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {application.universities.length} universities
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < applications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<PersonIcon />}
                    onClick={() => navigate('/recommender/profile')}
                  >
                    Update Profile
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AssignmentIcon />}
                    onClick={() => {
                      if (applications.length > 0) {
                        navigate(`/recommender/applications/${applications[0].id}/write`);
                      }
                    }}
                    disabled={applications.length === 0}
                  >
                    Write Recommendation
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RecommenderDashboardPage;