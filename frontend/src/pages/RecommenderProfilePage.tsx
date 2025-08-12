import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Person as PersonIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { recommenderService, RecommenderProfile, ProfileUpdateData } from '../services/recommenderService';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneUtils';

const RecommenderProfilePage: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<RecommenderProfile | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileUpdateData>({
    title: '',
    organization: '',
    relationship_duration: '',
    relationship_type: '',
    mobile_phone: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profileData = await recommenderService.getProfile();
      setProfile(profileData);
      setFormData({
        title: profileData.title,
        organization: profileData.organization,
        relationship_duration: profileData.relationship_duration,
        relationship_type: profileData.relationship_type,
        mobile_phone: profileData.mobile_phone || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileUpdateData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let value = event.target.value;
    
    // Special handling for phone number
    if (field === 'mobile_phone') {
      value = formatPhoneNumber(value);
      const validation = validatePhoneNumber(value);
      setPhoneError(validation.isValid ? null : validation.error || null);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSelectChange = (field: keyof ProfileUpdateData) => (
    event: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.title?.trim() || !formData.organization?.trim()) {
      setError('Title and organization are required');
      return;
    }

    // Validate phone number if provided
    if (formData.mobile_phone?.trim()) {
      const phoneValidation = validatePhoneNumber(formData.mobile_phone);
      if (!phoneValidation.isValid) {
        setError(phoneValidation.error || 'Invalid phone number format');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      
      const updatedProfile = await recommenderService.updateProfile(formData);
      setProfile(updatedProfile);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/recommender/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" gutterBottom>
          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Recommender Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update your professional information and preferences
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Account Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              
              {profile && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Email Address
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {profile.professional_email}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Account Created
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(profile.created_at).toLocaleDateString()}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Professional Information
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Professional Title"
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    required
                    placeholder="e.g., Professor, Manager, Director"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Organization"
                    value={formData.organization}
                    onChange={handleInputChange('organization')}
                    required
                    placeholder="e.g., University Name, Company Name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Relationship Duration</InputLabel>
                    <Select
                      value={formData.relationship_duration}
                      onChange={handleSelectChange('relationship_duration')}
                      label="Relationship Duration"
                    >
                      <MenuItem value="Less than 6 months">Less than 6 months</MenuItem>
                      <MenuItem value="6 months - 1 year">6 months - 1 year</MenuItem>
                      <MenuItem value="1 - 2 years">1 - 2 years</MenuItem>
                      <MenuItem value="2 - 3 years">2 - 3 years</MenuItem>
                      <MenuItem value="3 - 5 years">3 - 5 years</MenuItem>
                      <MenuItem value="More than 5 years">More than 5 years</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Relationship Type</InputLabel>
                    <Select
                      value={formData.relationship_type}
                      onChange={handleSelectChange('relationship_type')}
                      label="Relationship Type"
                    >
                      <MenuItem value="Academic Advisor">Academic Advisor</MenuItem>
                      <MenuItem value="Professor/Instructor">Professor/Instructor</MenuItem>
                      <MenuItem value="Research Supervisor">Research Supervisor</MenuItem>
                      <MenuItem value="Direct Manager">Direct Manager</MenuItem>
                      <MenuItem value="Colleague">Colleague</MenuItem>
                      <MenuItem value="Mentor">Mentor</MenuItem>
                      <MenuItem value="Department Head">Department Head</MenuItem>
                      <MenuItem value="Research Collaborator">Research Collaborator</MenuItem>
                      <MenuItem value="Thesis Committee Member">Thesis Committee Member</MenuItem>
                      <MenuItem value="Clinical Supervisor">Clinical Supervisor</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Mobile Phone (Optional)"
                    value={formData.mobile_phone}
                    onChange={handleInputChange('mobile_phone')}
                    placeholder="+1 (555) 123-4567"
                    error={!!phoneError}
                    helperText={phoneError || 'Format: +1 (555) 123-4567 or (555) 123-4567'}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/recommender/dashboard')}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RecommenderProfilePage;