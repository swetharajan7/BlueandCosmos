import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { Save, ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { ApplicationForm, University } from '../../types';
import { applicationService } from '../../services/applicationService';
import BasicInfoStep from './wizard/BasicInfoStep';
import UniversitySelectionStep from './wizard/UniversitySelectionStep';
import RecommenderStep from './wizard/RecommenderStep';
import ReviewStep from './wizard/ReviewStep';

interface ApplicationWizardProps {
  onComplete: (application: any) => void;
  onCancel: () => void;
  initialData?: Partial<ApplicationForm>;
  isEdit?: boolean;
  applicationId?: string;
}

const steps = ['Basic Information', 'Select Universities', 'Invite Recommenders', 'Review & Submit'];

const ApplicationWizard: React.FC<ApplicationWizardProps> = ({
  onComplete,
  onCancel,
  initialData,
  isEdit = false,
  applicationId
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [formData, setFormData] = useState<ApplicationForm>({
    legal_name: initialData?.legal_name || '',
    program_type: initialData?.program_type || 'undergraduate',
    application_term: initialData?.application_term || '',
    universities: initialData?.universities || []
  });
  const [currentApplicationId, setCurrentApplicationId] = useState<string | undefined>(applicationId);
  const [recommenderCount, setRecommenderCount] = useState(0);

  // Load universities on component mount
  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const universitiesData = await applicationService.getUniversities();
      setUniversities(universitiesData);
    } catch (error) {
      console.error('Error loading universities:', error);
      setError('Failed to load universities. Please try again.');
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepChange = (step: number) => {
    setActiveStep(step);
  };

  const updateFormData = (stepData: Partial<ApplicationForm>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      const applicationData = {
        legal_name: formData.legal_name,
        program_type: formData.program_type,
        application_term: formData.application_term,
        university_ids: formData.universities.map(u => typeof u === 'string' ? u : u.id),
        status: 'draft'
      };

      let result;
      if (isEdit && currentApplicationId) {
        result = await applicationService.updateApplication(currentApplicationId, applicationData);
      } else {
        result = await applicationService.createApplication(applicationData);
        setCurrentApplicationId(result.id);
      }

      // Don't complete the wizard, just save and continue
      if (activeStep < 2) {
        // If we're not on the final steps, just show success message
        setError(null);
      } else {
        onComplete(result);
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setError(error.response?.data?.error?.message || 'Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const applicationData = {
        legal_name: formData.legal_name,
        program_type: formData.program_type,
        application_term: formData.application_term,
        university_ids: formData.universities.map(u => typeof u === 'string' ? u : u.id),
        status: 'pending'
      };

      let result;
      if (isEdit && currentApplicationId) {
        result = await applicationService.updateApplication(currentApplicationId, applicationData);
      } else {
        result = await applicationService.createApplication(applicationData);
      }

      onComplete(result);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setError(error.response?.data?.error?.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.legal_name && formData.program_type && formData.application_term);
      case 1:
        return formData.universities.length > 0;
      case 2:
        return !!currentApplicationId; // Recommender step requires saved application
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <BasicInfoStep
            data={formData}
            onChange={updateFormData}
          />
        );
      case 1:
        return (
          <UniversitySelectionStep
            data={formData}
            universities={universities}
            onChange={updateFormData}
          />
        );
      case 2:
        return (
          <RecommenderStep
            applicationId={currentApplicationId}
            onRecommendersChange={setRecommenderCount}
          />
        );
      case 3:
        return (
          <ReviewStep
            data={formData}
            universities={universities}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {isEdit ? 'Edit Application' : 'Create New Application'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete the steps below to create your university application
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label} completed={index < activeStep || (index === activeStep && isStepValid(index))}>
              <StepLabel
                onClick={() => handleStepChange(index)}
                sx={{ cursor: 'pointer' }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400, mb: 4 }}>
          {getStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={onCancel}
            startIcon={<ArrowBack />}
            disabled={loading}
          >
            Cancel
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep < 2 && (
              <Button
                onClick={handleSaveDraft}
                startIcon={<Save />}
                variant="outlined"
                disabled={loading || !isStepValid(0)}
              >
                {loading ? <CircularProgress size={20} /> : 'Save Draft'}
              </Button>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                disabled={activeStep === 0 || loading}
                onClick={handleBack}
                startIcon={<ArrowBack />}
              >
                Back
              </Button>

              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  startIcon={<Check />}
                  disabled={loading || !isStepValid(activeStep)}
                >
                  {loading ? <CircularProgress size={20} /> : 'Submit Application'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  disabled={loading || !isStepValid(activeStep)}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplicationWizard;