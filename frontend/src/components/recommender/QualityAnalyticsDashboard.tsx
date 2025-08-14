import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  Download,
  Timeline,
  CompareArrows
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

interface QualityAnalytics {
  totalAnalyses: number;
  averageQuality: number;
  qualityTrends: Array<{
    date: string;
    averageScore: number;
    analysisCount: number;
  }>;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    impact: number;
  }>;
  benchmarks: Array<{
    category: string;
    averageScore: number;
    topPercentile: number;
    improvementAreas: string[];
    sampleCount: number;
  }>;
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

const QualityAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<QualityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<string>('overall');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/content-quality/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#4caf50'; // Green
    if (score >= 80) return '#8bc34a'; // Light green
    if (score >= 70) return '#ffc107'; // Yellow
    if (score >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      default: return '#757575';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const exportAnalytics = () => {
    if (!analytics) return;
    
    const dataStr = JSON.stringify(analytics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quality-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchAnalytics}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available. Start writing recommendations to see quality insights.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Quality Analytics Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAnalytics}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Analytics">
            <IconButton onClick={exportAnalytics}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Analyses</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {analytics.totalAnalyses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recommendations analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Timeline color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Average Quality</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h3" sx={{ color: getScoreColor(analytics.averageQuality) }}>
                  {analytics.averageQuality}
                </Typography>
                <Chip 
                  label={getScoreLabel(analytics.averageQuality)}
                  size="small"
                  sx={{ backgroundColor: getScoreColor(analytics.averageQuality), color: 'white' }}
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={analytics.averageQuality} 
                sx={{ 
                  mt: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getScoreColor(analytics.averageQuality)
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Trend</Typography>
              </Box>
              {analytics.qualityTrends.length >= 2 && (
                <>
                  {(() => {
                    const recent = analytics.qualityTrends[analytics.qualityTrends.length - 1];
                    const previous = analytics.qualityTrends[analytics.qualityTrends.length - 2];
                    const change = recent.averageScore - previous.averageScore;
                    const isPositive = change > 0;
                    
                    return (
                      <Box display="flex" alignItems="center" gap={1}>
                        {isPositive ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                        <Typography variant="h4" color={isPositive ? 'success.main' : 'error.main'}>
                          {isPositive ? '+' : ''}{change.toFixed(1)}
                        </Typography>
                      </Box>
                    );
                  })()}
                  <Typography variant="body2" color="text.secondary">
                    vs previous period
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CompareArrows color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Benchmark</Typography>
              </Box>
              {analytics.benchmarks.length > 0 && (
                <>
                  <Typography variant="h3" color="primary">
                    {Math.round((analytics.averageQuality / analytics.benchmarks[0].averageScore) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of average performance
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quality Trends Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Trends Over Time
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.qualityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                    />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip 
                      labelFormatter={(value) => `Date: ${formatDate(value as string)}`}
                      formatter={(value: number) => [`${value}`, 'Quality Score']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="averageScore" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Common Issues */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common Issues
              </Typography>
              <List dense>
                {analytics.commonIssues.slice(0, 5).map((issue, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color={issue.impact > 15 ? 'error' : issue.impact > 10 ? 'warning' : 'info'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={issue.issue}
                        secondary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption">
                              {issue.frequency} occurrences
                            </Typography>
                            <Chip 
                              label={`Impact: ${issue.impact}`}
                              size="small"
                              color={issue.impact > 15 ? 'error' : issue.impact > 10 ? 'warning' : 'info'}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < analytics.commonIssues.slice(0, 5).length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Benchmarks Comparison */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Benchmarks
              </Typography>
              <Grid container spacing={2}>
                {analytics.benchmarks.map((benchmark, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {benchmark.category}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Your Average:</Typography>
                        <Typography variant="h6" sx={{ color: getScoreColor(analytics.averageQuality) }}>
                          {analytics.averageQuality}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Category Average:</Typography>
                        <Typography variant="h6">
                          {benchmark.averageScore}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2">Top 10%:</Typography>
                        <Typography variant="h6" color="success.main">
                          {benchmark.topPercentile}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(analytics.averageQuality / benchmark.topPercentile) * 100} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {benchmark.sampleCount} samples in this category
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Improvement Areas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommended Improvement Areas
              </Typography>
              <Grid container spacing={2}>
                {analytics.benchmarks.flatMap(b => b.improvementAreas).slice(0, 6).map((area, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Info color="primary" sx={{ mr: 2 }} />
                      <Typography variant="body2">
                        {area}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QualityAnalyticsDashboard;