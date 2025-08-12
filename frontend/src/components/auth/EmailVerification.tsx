import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { CheckCircle, Email, Refresh } from '@mui/icons-material';

interface EmailVerificationProps {
  email: string;
  onResendVerification: () => Promise<void>;
  onVerifyToken: (token: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  token?: string; // Token from URL params
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  onResendVerification,
  onVerifyToken,
  isLoading = false,
  error = null,
  success = null,
  token
}) => {
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    if (token && !verificationComplete) {
      handleVerifyToken(token);
    }
  }, [token]);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await onResendVerification();
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      await onVerifyToken(verificationToken);
      setVerificationComplete(true);
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setIsVerifying(false);
    }
  };

  if (verificationComplete && success) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Email Verified!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your email address has been successfully verified. You can now access all features of StellarRec™.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        py: 4
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Verify Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We've sent a verification link to your email address
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {isVerifying && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">
                  Verifying your email address...
                </Typography>
              </Box>
            </Alert>
          )}

          <Paper sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Verification email sent to:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {email}
            </Typography>
          </Paper>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Please check your email and click the verification link to activate your account.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Don't forget to check your spam folder if you don't see the email in your inbox.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={isResending ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleResendVerification}
              disabled={isResending || isLoading}
              fullWidth
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            <Button
              variant="text"
              onClick={() => window.location.href = '/login'}
              disabled={isLoading}
              fullWidth
            >
              Back to Login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmailVerification;