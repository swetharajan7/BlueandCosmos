import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { loginUser } from '../store/authSlice';
import { AuthService } from '../services/authService';

const RecommenderLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await AuthService.recommenderLogin(formData.email, formData.password);
      
      // Use the async thunk to handle login
      const result = await dispatch(loginUser({
        email: formData.email,
        password: formData.password
      }));
      
      if (loginUser.fulfilled.match(result)) {
        // Navigate to recommender dashboard on successful login
        navigate('/recommender/dashboard', { replace: true });
      } else {
        // Handle login failure
        setError(result.payload as string || 'Login failed. Please try again.');
        return;
      }

    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box textAlign="center" mb={4}>
          <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Recommender Portal
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to write and manage recommendations
          </Typography>
        </Box>

        {location.state?.message && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {location.state.message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={handleInputChange('email')}
            margin="normal"
            required
            autoComplete="email"
            autoFocus={!formData.email}
          />
          
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={formData.password}
            onChange={handleInputChange('password')}
            margin="normal"
            required
            autoComplete="current-password"
            autoFocus={!!formData.email}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Don't have an account?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You should have received an invitation email with a link to create your account.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              Student Login
            </Link>
          </Typography>
        </Box>

        <Box textAlign="center" mt={3}>
          <Typography variant="body2" color="text.secondary">
            Need help? Contact support at{' '}
            <a href="mailto:support@stellarrec.com" style={{ color: 'inherit' }}>
              support@stellarrec.com
            </a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default RecommenderLoginPage;