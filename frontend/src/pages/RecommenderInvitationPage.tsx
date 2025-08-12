import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { invitationService, InvitationDetails, InvitationConfirmation } from '../services/invitationService';
import DiscrepancyReportDialog from '../components/recommender/DiscrepancyReportDialog';
import ProfileConfirmationDialog from '../components/recommender/ProfileConfirmationDialog';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneUtils';

const RecommenderInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [formData, setFormData] = useState<InvitationConfirmation>({
    first_name: '',
    last_name: '',
    title: '',
    organization: '',
    relationship_duration: '',
    relationship_type: '',
    mobile_phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDiscrepancyDialog, setShowDiscrepancyDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInvitationDetails();
    }
  }, [token]);

  const loadInvitationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await invitationService.getInvitationDetails(token!);
      setInvitationDetails(details);
      
      // Pre-fill form with existing data
      setFormData(prev => ({
        ...prev,
        title: details.recommender.title || '',
        organization: details.recommender.organization || ''
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InvitationConfirmation) => (
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
  };

  const handleSelectChange = (field: keyof InvitationConfirmation) => (
    event: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateForm = (): string | null => {
    const requiredFields: (keyof InvitationConfirmation)[] = [
      'first_name',
      'last_name',
      'title',
      'organization',
      'relationship_duration',
      'relationship_type',
      'password'
    ];

    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        return `${field.replace('_', ' ')} is required`;
      }
    }

    // Enhanced password validation
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      return 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (formData.password !== confirmPassword) {
      return 'Passwords do not match';
    }

    // Validate phone number if provided
    if (formData.mobile_phone?.trim()) {
      const phoneValidation = validatePhoneNumber(formData.mobile_phone);
      if (!phoneValidation.isValid) {
        return phoneValidation.error || 'Invalid phone number format';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show confirmation dialog instead of submitting directly
    setShowConfirmationDialog(true);
  };

  const handleConfirmSubmission = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      await invitationService.confirmInvitation(token!, formData);
      setShowConfirmationDialog(false);
      setSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/recommender/login', { 
          state: { 
            message: 'Account created successfully! Please log in to continue.',
            email: invitationDetails?.recommender.professional_email
          }
        });
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setShowConfirmationDialog(false);
    } finally {
      setSubmitting(false);
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

  if (error && !invitationDetails) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Invalid Invitation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {error}
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Welcome to StellarRec™!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Your recommender account has been created successfully.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting you to the login page...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Complete Your Recommender Profile
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
          You've been invited to write a recommendation through StellarRec™
        </Typography>

        {invitationDetails && (
          <Card sx={{ mb: 4, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Student Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Student Name
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {invitationDetails.application.legal_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Program Type
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {invitationDetails.application.program_type.charAt(0).toUpperCase() + 
                     invitationDetails.application.program_type.slice(1)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Application Term
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {invitationDetails.application.application_term}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Target Universities ({invitationDetails.application.universities.length})
              </Typography>
              <List dense>
                {invitationDetails.application.universities.map((university) => (
                  <ListItem key={university.id} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={university.name}
                      secondary={university.code}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setShowDiscrepancyDialog(true)}
                  size="small"
                >
                  Report Incorrect Information
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Your Information
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Professional Title"
                value={formData.title}
                onChange={handleInputChange('title')}
                placeholder="e.g., Professor, Manager, Director"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Organization"
                value={formData.organization}
                onChange={handleInputChange('organization')}
                placeholder="e.g., University Name, Company Name"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
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
              <FormControl fullWidth required>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={formData.password}
                onChange={handleInputChange('password')}
                helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : undefined}
            >
              {submitting ? 'Creating Account...' : 'Review & Create Account'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Discrepancy Report Dialog */}
      {invitationDetails && (
        <DiscrepancyReportDialog
          open={showDiscrepancyDialog}
          onClose={() => setShowDiscrepancyDialog(false)}
          token={token!}
          applicationDetails={invitationDetails.application}
        />
      )}

      {/* Profile Confirmation Dialog */}
      {invitationDetails && (
        <ProfileConfirmationDialog
          open={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          onConfirm={handleConfirmSubmission}
          profileData={{
            first_name: formData.first_name,
            last_name: formData.last_name,
            title: formData.title,
            organization: formData.organization,
            relationship_duration: formData.relationship_duration,
            relationship_type: formData.relationship_type,
            mobile_phone: formData.mobile_phone,
            professional_email: invitationDetails.recommender.professional_email
          }}
          loading={submitting}
        />
      )}
    </Container>
  );
};

export default RecommenderInvitationPage;