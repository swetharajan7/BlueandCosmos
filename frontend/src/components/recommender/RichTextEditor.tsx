import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Assessment as AssessmentIcon,
  AutoFixHigh as AutoFixHighIcon,
  Lightbulb as LightbulbIcon,
  School as SchoolIcon
} from '@mui/icons-material';

interface QualityScore {
  overall: number;
  specificity: number;
  structure: number;
  language: number;
  completeness: number;
  feedback: string[];
  suggestions: string[];
}

interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  universityAgnostic: boolean;
  universityReferences: string[];
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAutoSave?: (content: string) => Promise<void>;
  onQualityAnalysis?: (content: string) => Promise<QualityScore>;
  onContentValidation?: (content: string) => Promise<ContentValidation>;
  applicationData: {
    id: string;
    applicantName: string;
    programType: string;
    universities: string[];
  };
  placeholder?: string;
  disabled?: boolean;
  autoSaveInterval?: number;
}

const WORD_LIMIT = 1000;
const MIN_WORDS = 200;
const AUTO_SAVE_DELAY = 5000; // 5 seconds

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onAutoSave,
  onQualityAnalysis,
  onContentValidation,
  applicationData,
  placeholder = "Begin writing your recommendation letter here...",
  disabled = false,
  autoSaveInterval = AUTO_SAVE_DELAY
}) => {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [validation, setValidation] = useState<ContentValidation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(value);

  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const qualityAnalysisTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate word count and progress
  const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
  const wordProgress = Math.min((wordCount / WORD_LIMIT) * 100, 100);
  const isOverLimit = wordCount > WORD_LIMIT;
  const isUnderMinimum = wordCount < MIN_WORDS;

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (value !== lastSavedContent && value.trim().length > 0 && onAutoSave) {
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          setAutoSaveStatus('saving');
          await onAutoSave(value);
          setLastSavedContent(value);
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus('error');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
      }, autoSaveInterval);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, lastSavedContent, onAutoSave, autoSaveInterval]);

  // Quality analysis with debouncing
  useEffect(() => {
    if (qualityAnalysisTimeoutRef.current) {
      clearTimeout(qualityAnalysisTimeoutRef.current);
    }

    if (wordCount >= 50 && onQualityAnalysis) {
      qualityAnalysisTimeoutRef.current = setTimeout(async () => {
        try {
          setIsAnalyzing(true);
          const [quality, contentValidation] = await Promise.all([
            onQualityAnalysis(value),
            onContentValidation ? onContentValidation(value) : Promise.resolve(null)
          ]);
          setQualityScore(quality);
          if (contentValidation) {
            setValidation(contentValidation);
          }
        } catch (error) {
          console.error('Quality analysis failed:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 2000); // 2 second delay for quality analysis
    }

    return () => {
      if (qualityAnalysisTimeoutRef.current) {
        clearTimeout(qualityAnalysisTimeoutRef.current);
      }
    };
  }, [value, wordCount, onQualityAnalysis, onContentValidation]);

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
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

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'info';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getAutoSaveStatus = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return { text: 'Saving...', color: 'info' as const };
      case 'saved':
        return { text: 'Saved', color: 'success' as const };
      case 'error':
        return { text: 'Save failed', color: 'error' as const };
      default:
        return { text: 'Auto-save enabled', color: 'default' as const };
    }
  };

  const renderQualityIndicators = () => {
    if (!qualityScore) return null;

    return (
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Chip
          size="small"
          label={`Quality: ${qualityScore.overall}%`}
          color={getQualityColor(qualityScore.overall)}
          icon={<AssessmentIcon />}
          onClick={() => setShowQualityDialog(true)}
          clickable
        />
        {validation && !validation.universityAgnostic && (
          <Chip
            size="small"
            label="University references found"
            color="warning"
            icon={<SchoolIcon />}
            onClick={() => setShowValidationDialog(true)}
            clickable
          />
        )}
        {validation && validation.errors.length > 0 && (
          <Chip
            size="small"
            label={`${validation.errors.length} errors`}
            color="error"
            icon={<ErrorIcon />}
            onClick={() => setShowValidationDialog(true)}
            clickable
          />
        )}
        {validation && validation.warnings.length > 0 && (
          <Chip
            size="small"
            label={`${validation.warnings.length} warnings`}
            color="warning"
            icon={<WarningIcon />}
            onClick={() => setShowValidationDialog(true)}
            clickable
          />
        )}
      </Box>
    );
  };

  return (
    <Box>
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
          <Box display="flex" alignItems="center" gap={2}>
            {renderQualityIndicators()}
            <Typography variant="body2" color={getAutoSaveStatus().color}>
              {getAutoSaveStatus().text}
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={wordProgress}
          color={getWordCountColor()}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* Content Validation Alerts */}
      {validation && validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Content Issues:</Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {validation && validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Suggestions:</Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {validation && !validation.universityAgnostic && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">University References Detected:</Typography>
          <Typography variant="body2">
            Consider making your recommendation university-agnostic by removing specific university names: {validation.universityReferences.join(', ')}
          </Typography>
        </Alert>
      )}

      {/* Rich Text Editor */}
      <TextField
        inputRef={textFieldRef}
        fullWidth
        multiline
        rows={20}
        value={value}
        onChange={handleContentChange}
        placeholder={placeholder}
        variant="outlined"
        disabled={disabled}
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
            fontFamily: 'Georgia, serif',
          },
          '& .MuiInputBase-input': {
            resize: 'vertical',
          }
        }}
      />

      {/* Quality Analysis Dialog */}
      <Dialog
        open={showQualityDialog}
        onClose={() => setShowQualityDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AssessmentIcon />
            Content Quality Analysis
          </Box>
        </DialogTitle>
        <DialogContent>
          {qualityScore && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color={getQualityColor(qualityScore.overall)}>
                        {qualityScore.overall}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" color={getQualityColor(qualityScore.specificity)}>
                        {qualityScore.specificity}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Specificity
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" color={getQualityColor(qualityScore.structure)}>
                        {qualityScore.structure}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Structure
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h6" color={getQualityColor(qualityScore.language)}>
                        {qualityScore.language}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Language
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Feedback
              </Typography>
              <List dense>
                {qualityScore.feedback.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Suggestions
              </Typography>
              <List dense>
                {qualityScore.suggestions.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <LightbulbIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQualityDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Content Validation Dialog */}
      <Dialog
        open={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SchoolIcon />
            Content Validation
          </Box>
        </DialogTitle>
        <DialogContent>
          {validation && (
            <Box>
              {validation.errors.length > 0 && (
                <Box mb={2}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Errors
                  </Typography>
                  <List dense>
                    {validation.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {validation.warnings.length > 0 && (
                <Box mb={2}>
                  <Typography variant="h6" color="warning.main" gutterBottom>
                    Warnings
                  </Typography>
                  <List dense>
                    {validation.warnings.map((warning, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={warning} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {validation.universityReferences.length > 0 && (
                <Box>
                  <Typography variant="h6" color="info.main" gutterBottom>
                    University References Found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Consider removing these university-specific references to make your recommendation more versatile:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {validation.universityReferences.map((ref, index) => (
                      <Chip key={index} label={ref} size="small" color="info" />
                    ))}
                  </Box>
                </Box>
              )}

              {validation.isValid && validation.universityAgnostic && (
                <Alert severity="success">
                  Your content looks great! No issues found.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowValidationDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RichTextEditor;