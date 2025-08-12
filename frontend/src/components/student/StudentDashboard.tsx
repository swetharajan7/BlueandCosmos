import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar
} from '@mui/material';
import {
  School,
  Person,
  Email,
  Phone,
  CheckCircle,
  Warning,
  Add,
  Edit,
  Verified
} from '@mui/icons-material';
import { User, Application } from '../../types';

interface StudentDashboardProps {
  user: User;
  applications: Application[];
  onCreateApplication: () => void;
  onEditProfile: () => void;
  onViewApplication: (applicationId: string) => void;
  isLoading?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  applications,
  onCreateApplication,
  onEditProfile,
  onViewApplication,
  isLoading = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'submitted':
        return 'info';
      case 'pending':
        return 'warning';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'submitted':
        return <CheckCircle color="info" />;
      case 'pending':
        return <Warning color="warning" />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user.first_name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your university applications and recommendations
        </Typography>
      </Box>

      {!user.is_verified && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="body2">
            Please verify your email address to access all features. Check your inbox for a verification link.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Profile Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    mr: 2
                  }}
                >
                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={user.role}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {user.is_verified && (
                      <Verified color="success" fontSize="small" />
                    )}
                  </Box>
                </Box>
              </Box>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Email fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={user.email}
                    secondary="Email"
                  />
                </ListItem>
                {user.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <Phone fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={user.phone}
                      secondary="Phone"
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <Person fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={new Date(user.created_at).toLocaleDateString()}
                    secondary="Member since"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Edit />}
                onClick={onEditProfile}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Applications Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  My Applications
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateApplication}
                  disabled={!user.is_verified}
                >
                  New Application
                </Button>
              </Box>

              {applications.length === 0 ? (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'grey.50'
                  }}
                >
                  <School sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Applications Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create your first application to get started with the recommendation process
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onCreateApplication}
                    disabled={!user.is_verified}
                  >
                    Create Application
                  </Button>
                </Paper>
              ) : (
                <List>
                  {applications.map((application, index) => (
                    <React.Fragment key={application.id}>
                      <ListItem
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        onClick={() => onViewApplication(application.id)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(application.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="subtitle1">
                                {application.legal_name}
                              </Typography>
                              <Chip
                                label={application.status}
                                size="small"
                                color={getStatusColor(application.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {application.program_type.toUpperCase()} • {application.application_term}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {application.universities.length} universities selected
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

        {/* Quick Stats */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {applications.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {applications.filter(app => app.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {applications.filter(app => app.status === 'submitted').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Submitted
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {applications.filter(app => app.status === 'pending' || app.status === 'draft').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StudentDashboard;