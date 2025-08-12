import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import ProfilePage from './pages/ProfilePage';
import CreateApplicationPage from './pages/CreateApplicationPage';
import RecommenderInvitationPage from './pages/RecommenderInvitationPage';

// Common components
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Public recommender invitation route */}
          <Route path="/recommender/invitation/:token" element={<RecommenderInvitationPage />} />
          
          {/* Email verification route - requires authentication but not verification */}
          <Route path="/verify-email" element={
            <ProtectedRoute>
              <EmailVerificationPage />
            </ProtectedRoute>
          } />
          
          {/* Protected routes - require authentication and email verification */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="student" requireEmailVerification>
              <StudentDashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute requireEmailVerification>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/applications/create" element={
            <ProtectedRoute requiredRole="student" requireEmailVerification>
              <CreateApplicationPage />
            </ProtectedRoute>
          } />
          
          {/* Unauthorized page */}
          <Route path="/unauthorized" element={
            <Box textAlign="center" sx={{ py: 8 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary">
                You don't have permission to access this page.
              </Typography>
            </Box>
          } />
          
          {/* 404 page */}
          <Route path="*" element={
            <Box textAlign="center" sx={{ py: 8 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                404 - Page Not Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                The page you're looking for doesn't exist.
              </Typography>
            </Box>
          } />
        </Routes>
      </Box>
      
      <Footer />
    </Box>
  );
}

export default App;