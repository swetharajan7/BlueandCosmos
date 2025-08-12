import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { registerUser, clearError } from '../store/authSlice';
import StudentRegistrationForm from '../components/auth/StudentRegistrationForm';
import { RegisterForm } from '../types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/verify-email', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (data: RegisterForm) => {
    const result = await dispatch(registerUser(data));
    if (registerUser.fulfilled.match(result)) {
      navigate('/verify-email', { replace: true });
    }
  };

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <StudentRegistrationForm
      onSubmit={handleRegister}
      onSwitchToLogin={handleSwitchToLogin}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default RegisterPage;