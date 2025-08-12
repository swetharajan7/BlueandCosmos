import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  Alert
} from '@mui/material';
import { ApplicationForm } from '../../../types';

interface BasicInfoStepProps {
  data: ApplicationForm;
  onChange: (data: Partial<ApplicationForm>) => void;
}

const programTypes = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'mba', label: 'MBA' },
  { value: 'llm', label: 'LLM (Master of Laws)' },
  { value: 'medical', label: 'Medical School' },
  { value: 'phd', label: 'PhD' }
];

const applicationTerms = [
  'Fall 2025',
  'Spring 2026',
  'Fall 2026',
  'Spring 2027',
  'Fall 2027',
  'Spring 2028'
];

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onChange }) => {
  const handleChange = (field: keyof ApplicationForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    onChange({ [field]: event.target.value });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Basic Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please provide your basic application information
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Important:</strong> Use your full legal name exactly as it appears on your official documents. 
          This will be used in all recommendation letters and university submissions.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Full Legal Name"
            value={data.legal_name}
            onChange={handleChange('legal_name')}
            required
            helperText="Enter your complete legal name as it appears on official documents"
            placeholder="e.g., John Michael Smith"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Program Type</InputLabel>
            <Select
              value={data.program_type}
              label="Program Type"
              onChange={handleChange('program_type')}
            >
              {programTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Application Term</InputLabel>
            <Select
              value={data.application_term}
              label="Application Term"
              onChange={handleChange('application_term')}
            >
              {applicationTerms.map((term) => (
                <MenuItem key={term} value={term}>
                  {term}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Note:</strong> Once you submit your application, you will not be able to change 
              the legal name or program type. Please double-check this information before proceeding.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BasicInfoStep;