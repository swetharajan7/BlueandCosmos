import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';

interface ProfileData {
  first_name: string;
  last_name: string;
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  professional_email: string;
}

interface ProfileConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  profileData: ProfileData;
  loading?: boolean;
}

const ProfileConfirmationDialog: React.FC<ProfileConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  profileData,
  loading = false
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Confirm Your Information
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please review your information before creating your account
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Personal Information</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  First Name
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {profileData.first_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Name
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {profileData.last_name}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Professional Information */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <BusinessIcon color="primary" />
              <Typography variant="h6">Professional Information</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {profileData.title}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Organization
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {profileData.organization}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Relationship Duration
                </Typography>
                <Chip 
                  label={profileData.relationship_duration} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Relationship Type
                </Typography>
                <Chip 
                  label={profileData.relationship_type} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <EmailIcon color="primary" />
              <Typography variant="h6">Contact Information</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Professional Email
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {profileData.professional_email}
                </Typography>
              </Grid>
              {profileData.mobile_phone && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Mobile Phone
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body1" fontWeight="medium">
                      {profileData.mobile_phone}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>

        <Box 
          sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: 'primary.50', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.200'
          }}
        >
          <Typography variant="body2" color="primary.dark">
            <strong>Note:</strong> This information will be used to create your StellarRec™ recommender account. 
            You can update most of these details later in your profile settings.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          variant="outlined"
        >
          Back to Edit
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={loading}
          variant="contained"
          startIcon={loading ? undefined : <CheckCircleIcon />}
        >
          {loading ? 'Creating Account...' : 'Confirm & Create Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileConfirmationDialog;