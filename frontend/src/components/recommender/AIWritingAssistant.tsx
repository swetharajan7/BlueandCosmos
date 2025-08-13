import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { aiService } from '../../services/aiService';

interface AIWritingAssistantProps {
  applicationData: {
    applicantName: string;
    programType: string;
    universities: string[];
    relationshipType: string;
    relationshipDuration: string;
    recommenderTitle: string;
  };
  content: string;
  onContentChange: (content: string) => void;
  onInsertText: (text: string, position?: number) => void;
}

interface QualityAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  wordCount: number;
  hasSpecificExamples: boolean;
  isProfessional: boolean;
  isUniversityAgnostic: boolean;
}

const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  applicationData,
  content,
  onContentChange,
  onInsertText
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<string>('');
  const [examples, setExamples] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string>('');
  const [qualityAnalysis, setQualityAnalysis] = useState<QualityAnalysis | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [improvementDialogOpen, setImprovementDialogOpen] = useState(false);
  const [focusArea, setFocusArea] = useState<string>('');

  // Auto-analyze quality when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim().length > 50) {
        analyzeQuality();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content]);

  const generateOutline = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await aiService.generateOutline(applicationData);
      setOutline(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const suggestExamples = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await aiService.suggestExamples({
        programType: applicationData.programType,
        relationshipType: applicationData.relationshipType,
        recommenderTitle: applicationData.recommenderTitle
      });
      setExamples(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const improveWriting = async (focusArea?: string) => {
    if (!content.trim()) {
      setError('Please write some content first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await aiService.improveWriting({
        content,
        focusArea: focusArea as any
      });
      setImprovements(result);
      setImprovementDialogOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeQuality = async () => {
    if (!content.trim()) return;

    try {
      const result = await aiService.analyzeQuality(content);
      setQualityAnalysis(result);
    } catch (err: any) {
      console.warn('Quality analysis failed:', err.message);
    }
  };

  const insertExample = (example: string) => {
    onInsertText(example);
    setSelectedExample(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 8) return <CheckCircleIcon />;
    if (score >= 6) return <WarningIcon />;
    return <ErrorIcon />;
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Quality Analysis Card */}
        {qualityAnalysis && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" display="flex" alignItems="center">
                    <AssessmentIcon sx={{ mr: 1 }} />
                    Content Quality Analysis
                  </Typography>
                  <Chip
                    icon={getQualityIcon(qualityAnalysis.score)}
                    label={`Score: ${qualityAnalysis.score}/10`}
                    color={getQualityColor(qualityAnalysis.score)}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Strengths
                    </Typography>
                    <List dense>
                      {qualityAnalysis.strengths.map((strength, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={strength}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Areas for Improvement
                    </Typography>
                    <List dense>
                      {qualityAnalysis.improvements.map((improvement, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={improvement}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>

                <Box mt={2}>
                  <LinearProgress
                    variant="determinate"
                    value={(qualityAnalysis.score / 10) * 100}
                    color={getQualityColor(qualityAnalysis.score)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={`${qualityAnalysis.wordCount} words`}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={qualityAnalysis.hasSpecificExamples ? 'Has Examples' : 'Needs Examples'}
                    color={qualityAnalysis.hasSpecificExamples ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={qualityAnalysis.isProfessional ? 'Professional Tone' : 'Check Tone'}
                    color={qualityAnalysis.isProfessional ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={qualityAnalysis.isUniversityAgnostic ? 'University-Agnostic' : 'Check References'}
                    color={qualityAnalysis.isUniversityAgnostic ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* AI Tools */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <AutoAwesomeIcon sx={{ mr: 1 }} />
                AI Writing Tools
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="outlined"
                  onClick={generateOutline}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LightbulbIcon />}
                  fullWidth
                >
                  Generate Outline
                </Button>

                <Button
                  variant="outlined"
                  onClick={suggestExamples}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  fullWidth
                >
                  Get Example Phrases
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => improveWriting()}
                  disabled={loading || !content.trim()}
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  fullWidth
                >
                  Improve Writing
                </Button>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => improveWriting('clarity')}
                    disabled={loading || !content.trim()}
                  >
                    Clarity
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => improveWriting('specificity')}
                    disabled={loading || !content.trim()}
                  >
                    Specificity
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => improveWriting('structure')}
                    disabled={loading || !content.trim()}
                  >
                    Structure
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => improveWriting('tone')}
                    disabled={loading || !content.trim()}
                  >
                    Tone
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Generated Content */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Suggestions
              </Typography>

              {/* Outline */}
              {outline && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Generated Outline</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Box display="flex" justifyContent="flex-end" mb={1}>
                        <Tooltip title="Copy outline">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(outline)}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                          {outline}
                        </Typography>
                      </Paper>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Examples */}
              {examples.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Example Phrases ({examples.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {examples.map((example, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemButton
                            onClick={() => insertExample(example)}
                            sx={{ borderRadius: 1, mb: 0.5 }}
                          >
                            <ListItemText
                              primary={example}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                            <AddIcon fontSize="small" />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Writing Improvement Dialog */}
      <Dialog
        open={improvementDialogOpen}
        onClose={() => setImprovementDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Writing Improvement Suggestions</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 1 }}>
            <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
              {improvements}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(improvements)}>
            Copy Suggestions
          </Button>
          <Button onClick={() => setImprovementDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIWritingAssistant;