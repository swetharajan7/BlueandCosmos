import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Alert, Snackbar } from '@mui/material';
import { RootState } from '../store/store';
import StudentDashboard from '../components/student/StudentDashboard';
import { Application } from '../types';
import { applicationService } from '../services/applicationService';

const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  useEffect(() => {
    loadApplications();
    
    // Check for navigation state message
    if (location.state?.message) {
      setNotification({
        message: location.state.message,
        type: location.state.type || 'info'
      });
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate]);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const applicationsData = await applicationService.getMyApplications();
      setApplications(applicationsData);
    } catch (error) {
      console.error('Error loading applications:', error);
      setNotification({
        message: 'Failed to load applications. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApplication = () => {
    navigate('/applications/create');
  };

  const handleEditProfile = () => {
    navigate('/profile');
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/applications/${applicationId}`);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  if (!user) {
    return null; // Protected route will handle redirect
  }

  return (
    <>
      <StudentDashboard
        user={user}
        applications={applications}
        onCreateApplication={handleCreateApplication}
        onEditProfile={handleEditProfile}
        onViewApplication={handleViewApplication}
        isLoading={isLoading}
      />
      
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default StudentDashboardPage;