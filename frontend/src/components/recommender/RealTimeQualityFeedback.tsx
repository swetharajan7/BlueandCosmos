import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
  Divider,
  Button
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  ExpandMore,
  ExpandLess,
  Lightbulb,
  Security,
  Assessment,
  Refresh
} from '@mui/icons-material';
import { debounce } from 'lodash';

interface QualityScore {
  overall: number;
  specificity: number;
  structure: number;
  language: number;
  completeness: number;
  originality: number;
  readability: number;
  feedback: string[];
  suggestions: string[];
  timestamp: Date;
  analysisId: string;
}

interface PlagiarismResult {
  originalityScore: number;
  suspiciousSegments: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    similarity: number;
    potentialSource?: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  universityAgnostic: boolean;
  universityReferences: string[];
}

interface RealTimeQualityFeedbackProps {
  content: string;
  applicationData: {
    applicantName: string;
    programType: string;
    relationshipType: string;
    relationshipDuration: string;
    recommenderId?: string;
  };
  onQualityChange?: (quality: QualityScore) => void;
  onValidationChange?: (validation: ContentValidation) => void;
  onPlagiarismChange?: (plagiarism: PlagiarismResult) => void;
}

const RealTimeQualityFeedback: React.FC<RealTimeQualityFeedbackProps> = ({
  content,
  applicationData,
  onQualityChange,
  onValidationChange,
  onPlagiarismChange
}) => {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [validation, setValidation] = useState<ContentValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    feedback: true,
    suggestions: false,
    plagiarism: false,
    validation: false
  });

  // Debounced analysis function
  const debouncedAnalyze = useCallback(
    debounce(async (contentToAnalyze: string) => {
      if (contentToAnalyze.trim().length < 50) {
        return; // Don't analyze very short content
      }

      try {
        setLoading(true);
        setError(null);

        // Parallel analysis for better performance
        const [qualityResponse, plagiarismResponse, validationResponse] = await Promise.all([
          fetch('/api/content-quality/analyze/realtime', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              content: contentToAnalyze,
              applicationData
            })
          }),
          fetch('/api/content-quality/plagiarism/detect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              content: contentToAnalyze,
              excludeRecommenderId: applicationData.recommenderId
            })
          }),
          fetch('/api/content-quality/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              content: contentToAnalyze
            })
          })
        ]);

        const [qualityData, plagiarismData, validationData] = await Promise.all([
          qualityResponse.json(),
          plagiarismResponse.json(),
          validationResponse.json()
        ]);

        if (qualityData.success) {
          setQualityScore(qualityData.data);
          onQualityChange?.(qualityData.data);
        }

        if (plagiarismData.success) {
          setPlagiarismResult(plagiarismData.data);
          onPlagiarismChange?.(plagiarismData.data);
        }

        if (validationData.success) {
          setValidation(validationData.data);
          onValidationChange?.(validationData.data);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setLoading(false);
      }
    }, 2000), // 2 second debounce
    [applicationData, onQualityChange, onValidationChange, onPlagiarismChange]
  );

  useEffect(() => {
    if (content.trim().length >= 50) {
      debouncedAnalyze(content);
    }
    
    return () => {
      debouncedAnalyze.cancel();
    };
  }, [content, debouncedAnalyze]);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#4caf50';
    if (score >= 80) return '#8bc34a';
    if (score >= 70) return '#ffc107';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle sx={{ color: getScoreColor(score) }} />;
    if (score >= 60) return <Warning sx={{ color: getScoreColor(score) }} />;
    return <Error sx={{ color: getScoreColor(score) }} />;
  };

  const getRiskIcon = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return <CheckCircle color="success" />;
      case 'medium': return <Warning color="warning" />;
      case 'high': return <Error color="error" />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

  if (content.trim().length < 50) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Info color="info" />
            <Typography variant="body2" color="text.secondary">
              Start writing to see real-time quality feedback and suggestions
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" onClick={() => debouncedAnalyze(content)}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* Overall Quality Score */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Overall Quality Score
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>
          
          {qualityScore ? (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {getScoreIcon(qualityScore.overall)}
                <Typography variant="h4" sx={{ color: getScoreColor(qualityScore.overall) }}>
                  {qualityScore.overall}/100
                </Typography>
                <Chip 
                  label={qualityScore.overall >= 90 ? 'Excellent' : 
                         qualityScore.overall >= 80 ? 'Very Good' :
                         qualityScore.overall >= 70 ? 'Good' :
                         qualityScore.overall >= 60 ? 'Fair' : 'Needs Improvement'}
                  sx={{ backgroundColor: getScoreColor(qualityScore.overall), color: 'white' }}
                />
              </Box>

              {/* Quality Metrics */}
              <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
                {[
                  { key: 'specificity', label: 'Specificity', value: qualityScore.specificity },
                  { key: 'structure', label: 'Structure', value: qualityScore.structure },
                  { key: 'language', label: 'Language', value: qualityScore.language },
                  { key: 'completeness', label: 'Completeness', value: qualityScore.completeness },
                  { key: 'originality', label: 'Originality', value: qualityScore.originality },
                  { key: 'readability', label: 'Readability', value: qualityScore.readability }
                ].map(metric => (
                  <Box key={metric.key}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{metric.label}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metric.value}/100
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={metric.value} 
                      sx={{
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getScoreColor(metric.value)
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>

              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Word count: {wordCount}/1000
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last analyzed: {new Date(qualityScore.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Analyzing content quality...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section */}
      {qualityScore && qualityScore.feedback.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Assessment color="primary" />
                <Typography variant="h6">
                  Quality Feedback
                </Typography>
                <Badge badgeContent={qualityScore.feedback.length} color="primary" />
              </Box>
              <IconButton onClick={() => toggleSection('feedback')}>
                {expandedSections.feedback ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.feedback}>
              <List dense>
                {qualityScore.feedback.map((feedback, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Info color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={feedback} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Section */}
      {qualityScore && qualityScore.suggestions.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Lightbulb color="warning" />
                <Typography variant="h6">
                  Improvement Suggestions
                </Typography>
                <Badge badgeContent={qualityScore.suggestions.length} color="warning" />
              </Box>
              <IconButton onClick={() => toggleSection('suggestions')}>
                {expandedSections.suggestions ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.suggestions}>
              <List dense>
                {qualityScore.suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Lightbulb color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Plagiarism Detection */}
      {plagiarismResult && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Security color="primary" />
                <Typography variant="h6">
                  Originality Check
                </Typography>
                <Chip 
                  label={`${plagiarismResult.originalityScore}% Original`}
                  color={plagiarismResult.overallRisk === 'low' ? 'success' : 
                         plagiarismResult.overallRisk === 'medium' ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
              <IconButton onClick={() => toggleSection('plagiarism')}>
                {expandedSections.plagiarism ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.plagiarism}>
              <Box mt={2}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {getRiskIcon(plagiarismResult.overallRisk)}
                  <Typography variant="body1">
                    Risk Level: <strong>{plagiarismResult.overallRisk.toUpperCase()}</strong>
                  </Typography>
                </Box>

                {plagiarismResult.suspiciousSegments.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suspicious Segments:
                    </Typography>
                    {plagiarismResult.suspiciousSegments.map((segment, index) => (
                      <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          "{segment.text.substring(0, 100)}..."
                        </Typography>
                        <Typography variant="caption">
                          Similarity: {Math.round(segment.similarity * 100)}%
                          {segment.potentialSource && ` | Source: ${segment.potentialSource}`}
                        </Typography>
                      </Alert>
                    ))}
                  </Box>
                )}

                {plagiarismResult.recommendations.length > 0 && (
                  <List dense>
                    {plagiarismResult.recommendations.map((recommendation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info color="info" />
                        </ListItemIcon>
                        <ListItemText primary={recommendation} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Content Validation */}
      {validation && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircle color={validation.isValid ? 'success' : 'error'} />
                <Typography variant="h6">
                  Content Validation
                </Typography>
                <Chip 
                  label={validation.isValid ? 'Valid' : 'Issues Found'}
                  color={validation.isValid ? 'success' : 'error'}
                  size="small"
                />
              </Box>
              <IconButton onClick={() => toggleSection('validation')}>
                {expandedSections.validation ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={expandedSections.validation}>
              <Box mt={2}>
                {validation.errors.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Errors:
                    </Typography>
                    {validation.errors.map((error, index) => (
                      <Alert key={index} severity="error" sx={{ mb: 1 }}>
                        {error}
                      </Alert>
                    ))}
                  </Box>
                )}

                {validation.warnings.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Warnings:
                    </Typography>
                    {validation.warnings.map((warning, index) => (
                      <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                        {warning}
                      </Alert>
                    ))}
                  </Box>
                )}

                {validation.universityReferences.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      University References Found:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {validation.universityReferences.map((ref, index) => (
                        <Chip key={index} label={ref} color="error" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {validation.isValid && (
                  <Alert severity="success">
                    Content meets all validation requirements
                  </Alert>
                )}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default RealTimeQualityFeedback;