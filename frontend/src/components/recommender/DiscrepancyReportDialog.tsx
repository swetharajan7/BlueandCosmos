import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import { recommenderService, DiscrepancyReport } from '../../services/recommenderService';

interface DiscrepancyReportDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  applicationDetails: {
    legal_name: string;
    program_type: string;
    application_term: string;
    universities: Array<{ name: string }>;
  };
}

const DiscrepancyReportDialog: React.FC<DiscrepancyReportDialogProps> = ({
  open,
  onClose,
  token,
  applicationDetails
}) => {
  const [formData, setFormData] = useState<DiscrepancyReport>({
    discrepancy_type: 'Student Name',
    description: '',
    correct_information: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof DiscrepancyReport) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (error) setError(null);
  };

  const handleSelectChange = (event: any) => {
    setFormData(prev => ({
      ...prev,
      discrepancy_type: event.target.value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      setError('Please provide a description of the discrepancy');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await recommenderService.reportDiscrepancy(token, formData);
      setSuccess(true);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          discrepancy_type: 'Student Name',
          description: '',
          correct_information: ''
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      setSuccess(false);
      setFormData({
        discrepancy_type: 'Student Name',
        description: '',
        correct_information: ''
      });
    }
  };

  if (success) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            Report Submitted Successfully
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The student will be notified to review and correct the information.
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Report Application Details Discrepancy
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          If any of the application details below are incorrect, please report the discrepancy:
        </Typography>

        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Current Application Details:</Typography>
          <Typography variant="body2"><strong>Student:</strong> {applicationDetails.legal_name}</Typography>
          <Typography variant="body2"><strong>Program:</strong> {applicationDetails.program_type}</Typography>
          <Typography variant="body2"><strong>Term:</strong> {applicationDetails.application_term}</Typography>
          <Typography variant="body2"><strong>Universities:</strong> {applicationDetails.universities.map(u => u.name).join(', ')}</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth margin="normal">
          <InputLabel>Discrepancy Type</InputLabel>
          <Select
            value={formData.discrepancy_type}
            onChange={handleSelectChange}
            label="Discrepancy Type"
          >
            <MenuItem value="Student Name">Student Name</MenuItem>
            <MenuItem value="Universities">Universities</MenuItem>
            <MenuItem value="Program Type">Program Type</MenuItem>
            <MenuItem value="Application Term">Application Term</MenuItem>
            <MenuItem value="Contact Information">Contact Information</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Description of Discrepancy"
          value={formData.description}
          onChange={handleInputChange('description')}
          margin="normal"
          required
          helperText="Please describe what information is incorrect and why"
        />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Correct Information (Optional)"
          value={formData.correct_information}
          onChange={handleInputChange('correct_information')}
          margin="normal"
          helperText="If you know the correct information, please provide it here"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscrepancyReportDialog;