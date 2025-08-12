import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert
} from '@mui/material';
import { Person, School, CalendarToday, Category } from '@mui/icons-material';
import { ApplicationForm, University } from '../../../types';

interface ReviewStepProps {
  data: ApplicationForm;
  universities: University[];
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data, universities }) => {
  const getSelectedUniversities = (): University[] => {
    return data.universities.map(u => {
      if (typeof u === 'string') {
        return universities.find(uni => uni.id === u);
      }
      return u;
    }).filter(Boolean) as University[];
  };

  const selectedUniversities = getSelectedUniversities();

  const getProgramTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      'undergraduate': 'Undergraduate',
      'graduate': 'Graduate',
      'mba': 'MBA',
      'llm': 'LLM (Master of Laws)',
      'medical': 'Medical School',
      'phd': 'PhD'
    };
    return labels[type] || type;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Your Application
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please review all information before submitting your application
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>What happens next:</strong> After submission, you'll be able to invite recommenders 
          who will write one letter to be sent to all your selected universities.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Basic Information
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Person color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Legal Name"
                  secondary={data.legal_name}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <Category color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Program Type"
                  secondary={getProgramTypeLabel(data.program_type)}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <CalendarToday color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Application Term"
                  secondary={data.application_term}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* University Selection */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Selected Universities
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedUniversities.length} universities selected
              </Typography>
            </Box>

            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {selectedUniversities.map((university, index) => (
                <Box key={university.id} sx={{ mb: 1 }}>
                  <Chip
                    icon={<School />}
                    label={university.name}
                    variant="outlined"
                    color="primary"
                    sx={{ width: '100%', justifyContent: 'flex-start' }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Summary */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Application Summary
            </Typography>
            
            <Typography variant="body1" paragraph>
              <strong>{data.legal_name}</strong> is applying for <strong>{getProgramTypeLabel(data.program_type)}</strong> programs 
              for the <strong>{data.application_term}</strong> term at <strong>{selectedUniversities.length}</strong> universities.
            </Typography>

            <Alert severity="success">
              <Typography variant="body2">
                Your application is ready to submit! Once submitted, you can invite recommenders 
                to write letters that will be automatically sent to all selected universities.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Important:</strong> After submission, you will not be able to modify the legal name, 
          program type, or application term. You can still add or remove universities and manage recommenders.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ReviewStep;