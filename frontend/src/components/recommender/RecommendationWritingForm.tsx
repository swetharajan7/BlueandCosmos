import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  AutoAwesome as AutoAwesomeIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import AIWritingAssistant from './AIWritingAssistant';

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

const WORD_LIMIT = 1000;
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
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  // Calculate word count and progress
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const wordProgress = Math.min((wordCount / WORD_LIMIT) * 100, 100);
  const isOverLimit = wordCount > WORD_LIMIT;
  const isUnderMinimum = wordCount < MIN_WORDS;

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== initialContent && content.trim().length > 0) {
        handleAutoSave();
      }
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [content]);

  const handleAutoSave = async () => {
    try {
      await onSave(content);
      setSuccess('Draft saved automatically');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.warn('Auto-save failed:', err.message);
    }
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleInsertText = (text: string, position?: number) => {
    const textarea = textFieldRef.current;
    if (!textarea) return;

    const insertPosition = position !== undefined ? position : textarea.selectionStart;
    const newContent = 
      content.slice(0, insertPosition) + 
      (insertPosition > 0 && content[insertPosition - 1] !== ' ' ? ' ' : '') +
      text + 
      (insertPosition < content.length && content[insertPosition] !== ' ' ? ' ' : '') +
      content.slice(insertPosition);

    setContent(newContent);
    
    // Focus and set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newPosition = insertPosition + text.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
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
    if (isOverLimit) {
      setError(`Please reduce content to ${WORD_LIMIT} words or less`);
      return;
    }

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

  const getWordCountColor = () => {
    if (isOverLimit) return 'error';
    if (wordCount > WORD_LIMIT * 0.9) return 'warning';
    return 'primary';
  };

  const getWordCountIcon = () => {
    if (isOverLimit) return <WarningIcon fontSize="small" />;
    if (wordCount >= MIN_WORDS) return <CheckCircleIcon fontSize="small" />;
    return null;
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

              {/* Word Count and Progress */}
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getWordCountIcon()}
                    <Typography variant="body2" color={getWordCountColor()}>
                      {wordCount} / {WORD_LIMIT} words
                    </Typography>
                    {isUnderMinimum && (
                      <Chip 
                        size="small" 
                        label={`${MIN_WORDS - wordCount} more needed`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Auto-save enabled
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={wordProgress}
                  color={getWordCountColor()}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              {/* Writing Area */}
              <TextField
                inputRef={textFieldRef}
                fullWidth
                multiline
                rows={20}
                value={content}
                onChange={handleContentChange}
                placeholder="Begin writing your recommendation letter here. Use the AI assistant for suggestions and improvements..."
                variant="outlined"
                error={isOverLimit}
                helperText={
                  isOverLimit 
                    ? `Please reduce by ${wordCount - WORD_LIMIT} words`
                    : isUnderMinimum
                    ? `Write at least ${MIN_WORDS - wordCount} more words for a comprehensive recommendation`
                    : 'Write a detailed, specific recommendation that highlights the applicant\'s strengths'
                }
                sx={{
                  '& .MuiInputBase-root': {
                    fontSize: '1rem',
                    lineHeight: 1.6,
                  },
                  '& .MuiInputBase-input': {
                    resize: 'vertical',
                  }
                }}
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
                  disabled={submitting || isOverLimit || isUnderMinimum || !content.trim()}
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
            startIcon={submitting ? <LinearProgress /> : <SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecommendationWritingForm;