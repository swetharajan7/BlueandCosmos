import React, { useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { updateProfile } from '../store/authSlice';
import StudentProfileForm from '../components/student/StudentProfileForm';

const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdateProfile = async (data: {
    first_name: string;
    last_name: string;
    phone?: string;
  }) => {
    const result = await dispatch(updateProfile(data));
    if (updateProfile.fulfilled.match(result)) {
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  if (!user) {
    return null; // Protected route will handle redirect
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your personal information and account settings
        </Typography>
      </Box>

      <StudentProfileForm
        user={user}
        onSubmit={handleUpdateProfile}
        isLoading={isLoading}
        error={error}
        success={success}
      />
    </Container>
  );
};

export default ProfilePage;