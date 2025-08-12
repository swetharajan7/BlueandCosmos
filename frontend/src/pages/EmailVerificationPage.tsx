import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { verifyEmail, resendEmailVerification, clearError } from '../store/authSlice';
import EmailVerification from '../components/auth/EmailVerification';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth);
  const [success, setSuccess] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Redirect to dashboard if already verified
    if (user.is_verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleVerifyToken = async (verificationToken: string) => {
    const result = await dispatch(verifyEmail(verificationToken));
    if (verifyEmail.fulfilled.match(result)) {
      setSuccess('Email verified successfully!');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  };

  const handleResendVerification = async () => {
    const result = await dispatch(resendEmailVerification());
    if (resendEmailVerification.fulfilled.match(result)) {
      setSuccess('Verification email sent successfully!');
    }
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <EmailVerification
      email={user.email}
      onResendVerification={handleResendVerification}
      onVerifyToken={handleVerifyToken}
      isLoading={isLoading}
      error={error}
      success={success}
      token={token || undefined}
    />
  );
};

export default EmailVerificationPage;