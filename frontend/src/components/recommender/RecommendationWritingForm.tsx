import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  AutoAwesome as AutoAwesomeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import AIWritingAssistant from './AIWritingAssistant';
import RichTextEditor from './RichTextEditor';
import { recommenderService } from '../../services/recommenderService';

interface RecommendationWritingFormProps {
  applicationData: {
    id: string;
    applicantName: string;
    programType: string;
    universities: string[];
    relationshipType: string;
    relationshipDuration: string;
    recommenderTitle: string;
  };
  initialContent?: string;
  onSave: (content: string) => Promise<void>;
  onSubmit: (content: string) => Promise<void>;
}

const MIN_WORDS = 200;

const RecommendationWritingForm: React.FC<RecommendationWritingFormProps> = ({
  applicationData,
  initialContent = '',
  onSave,
  onSubmit
}) => {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Calculate word count and validation
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isUnderMinimum = wordCount < MIN_WORDS;

  const handleContentChange = (value: string) => {
    setContent(value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleAutoSave = async (content: string) => {
    try {
      await recommenderService.autoSaveRecommendation(content, applicationData.id);
    } catch (err: any) {
      console.warn('Auto-save failed:', err.message);
      throw err;
    }
  };

  const handleQualityAnalysis = async (content: string) => {
    try {
      return await recommenderService.analyzeContentQuality(content, applicationData.id);
    } catch (err: any) {
      console.warn('Quality analysis failed:', err.message);
      throw err;
    }
  };

  const handleContentValidation = async (content: string) => {
    try {
      return await recommenderService.validateContent(content);
    } catch (err: any) {
      console.warn('Content validation failed:', err.message);
      throw err;
    }
  };

  const handleInsertText = (text: string, position?: number) => {
    const insertPosition = position !== undefined ? position : content.length;
    const newContent = 
      content.slice(0, insertPosition) + 
      (insertPosition > 0 && content[insertPosition - 1] !== ' ' ? ' ' : '') +
      text + 
      (insertPosition < content.length && content[insertPosition] !== ' ' ? ' ' : '') +
      content.slice(insertPosition);

    setContent(newContent);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await onSave(content);
      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isUnderMinimum) {
      setError(`Please write at least ${MIN_WORDS} words for a comprehensive recommendation`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await onSubmit(content);
      setSuccess('Recommendation submitted successfully!');
      setSubmitDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Writing Area */}
        <Grid item xs={12} lg={showAI ? 8 : 12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recommendation Letter
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Tooltip title={showAI ? 'Hide AI Assistant' : 'Show AI Assistant'}>
                    <IconButton onClick={() => setShowAI(!showAI)}>
                      {showAI ? <VisibilityOffIcon /> : <AutoAwesomeIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Application Context */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recommendation Context
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Applicant: <strong>{applicationData.applicantName}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Program: <strong>{applicationData.programType}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Universities: <strong>{applicationData.universities.length} selected</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Relationship: <strong>{applicationData.relationshipType}</strong>
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Rich Text Editor with Quality Analysis */}
              <RichTextEditor
                value={content}
                onChange={handleContentChange}
                onAutoSave={handleAutoSave}
                onQualityAnalysis={handleQualityAnalysis}
                onContentValidation={handleContentValidation}
                applicationData={applicationData}
                placeholder="Begin writing your recommendation letter here. Use the AI assistant for suggestions and improvements..."
                disabled={submitting}
              />

              {/* Action Buttons */}
              <Box display="flex" justifyContent="space-between" mt={3}>
                <Button
                  variant="outlined"
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  startIcon={<SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>

                <Button
                  variant="contained"
                  onClick={() => setSubmitDialogOpen(true)}
                  disabled={submitting || isUnderMinimum || !content.trim()}
                  startIcon={<SendIcon />}
                  size="large"
                >
                  Submit Recommendation
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Writing Assistant */}
        {showAI && (
          <Grid item xs={12} lg={4}>
            <AIWritingAssistant
              applicationData={applicationData}
              content={content}
              onContentChange={setContent}
              onInsertText={handleInsertText}
            />
          </Grid>
        )}
      </Grid>

      {/* Submit Confirmation Dialog */}
      <Dialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Recommendation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you ready to submit this recommendation letter?
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This will send your recommendation to all {applicationData.universities.length} selected universities:
          </Typography>
          <Box mt={2}>
            {applicationData.universities.map((university, index) => (
              <Chip
                key={index}
                label={university}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Once submitted, you will not be able to edit this recommendation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={<SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecommendationWritingForm;