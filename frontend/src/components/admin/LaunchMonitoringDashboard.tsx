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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  Feedback,
  Scale,
  Assessment
} from '@mui/icons-material';

interface LaunchMetrics {
  totalUsers: number;
  activeUsers: number;
  applicationsCreated: number;
  recommendationsSubmitted: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  userFeedback: UserFeedback[];
}

interface UserFeedback {
  userId: string;
  rating: number;
  comments: string;
  category: 'bug' | 'feature' | 'usability' | 'performance';
  timestamp: Date;
  resolved: boolean;
}

interface ScalingRecommendation {
  action: 'scale_up' | 'scale_down' | 'maintain';
  reason: string;
  metrics: any;
}

const LaunchMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<LaunchMetrics | null>(null);
  const [scalingRec, setScalingRec] = useState<ScalingRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [launchReport, setLaunchReport] = useState<any>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comments: '',
    category: 'feature' as 'bug' | 'feature' | 'usability' | 'performance'
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [metricsResponse, scalingResponse] = await Promise.all([
        fetch('/api/launch/metrics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/launch/scaling', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      if (scalingResponse.ok) {
        const scalingData = await scalingResponse.json();
        setScalingRec(scalingData.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      // Client-side validation
      if (feedbackForm.rating < 1 || feedbackForm.rating > 5) {
        alert('Rating must be between 1 and 5');
        return;
      }
      
      if (feedbackForm.comments.trim().length < 10 || feedbackForm.comments.trim().length > 1000) {
        alert('Comments must be between 10 and 1000 characters');
        return;
      }

      const response = await fetch('/api/launch/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        },
        body: JSON.stringify({
          ...feedbackForm,
          comments: feedbackForm.comments.trim()
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setFeedbackDialogOpen(false);
        setFeedbackForm({ rating: 5, comments: '', category: 'feature' });
        loadDashboardData(); // Refresh data
      } else {
        alert(result.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const generateLaunchReport = async () => {
    try {
      const response = await fetch('/api/launch/report', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const reportData = await response.json();
        setLaunchReport(reportData.data);
        setReportDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to generate launch report:', error);
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.warning) return 'warning';
    return 'error';
  };

  const getScalingActionColor = (action: string) => {
    switch (action) {
      case 'scale_up': return 'error';
      case 'scale_down': return 'info';
      default: return 'success';
    }
  };

  const getScalingActionIcon = (action: string) => {
    switch (action) {
      case 'scale_up': return <TrendingUp />;
      case 'scale_down': return <TrendingDown />;
      default: return <CheckCircle />;
    }
  };

  if (loading && !metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Launch Monitoring Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Launch Monitoring Dashboard</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Feedback />}
            onClick={() => setFeedbackDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Submit Feedback
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            onClick={generateLaunchReport}
            sx={{ mr: 1 }}
          >
            Generate Report
          </Button>
          <IconButton onClick={loadDashboardData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {metrics && (
        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {metrics.totalUsers}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Active: {metrics.activeUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Success Rate
                </Typography>
                <Typography variant="h4" color={getStatusColor(metrics.successRate * 100, { good: 95, warning: 90 })}>
                  {(metrics.successRate * 100).toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.successRate * 100}
                  color={getStatusColor(metrics.successRate * 100, { good: 95, warning: 90 })}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Response Time
                </Typography>
                <Typography variant="h4" color={getStatusColor(2000 - metrics.averageResponseTime, { good: 1500, warning: 500 })}>
                  {metrics.averageResponseTime}ms
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Average response time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Error Rate
                </Typography>
                <Typography variant="h4" color={getStatusColor(10 - (metrics.errorRate * 100), { good: 8, warning: 5 })}>
                  {(metrics.errorRate * 100).toFixed(2)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  System error rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Scaling Recommendations */}
          {scalingRec && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Scaling Recommendations
                  </Typography>
                  <Alert
                    severity={getScalingActionColor(scalingRec.action)}
                    icon={getScalingActionIcon(scalingRec.action)}
                  >
                    <Typography variant="subtitle1">
                      Action: {scalingRec.action.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                      {scalingRec.reason}
                    </Typography>
                    {scalingRec.metrics && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          CPU: {scalingRec.metrics.cpuUsage}% | 
                          Memory: {scalingRec.metrics.memoryUsage}% | 
                          Response Time: {scalingRec.metrics.responseTime}ms
                        </Typography>
                      </Box>
                    )}
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Application Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Application Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Applications Created
                    </Typography>
                    <Typography variant="h5">
                      {metrics.applicationsCreated}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Recommendations Submitted
                    </Typography>
                    <Typography variant="h5">
                      {metrics.recommendationsSubmitted}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* User Feedback Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Feedback Summary
                </Typography>
                {metrics.userFeedback.length > 0 ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Average Rating: {(metrics.userFeedback.reduce((sum, f) => sum + f.rating, 0) / metrics.userFeedback.length).toFixed(1)}/5
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Feedback: {metrics.userFeedback.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Unresolved Issues: {metrics.userFeedback.filter(f => !f.resolved && (f.category === 'bug' || f.rating <= 2)).length}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No feedback received yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Feedback */}
          {metrics.userFeedback.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent User Feedback
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Rating</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Comments</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.userFeedback.slice(0, 5).map((feedback, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip
                                label={`${feedback.rating}/5`}
                                color={feedback.rating >= 4 ? 'success' : feedback.rating >= 3 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label={feedback.category} size="small" />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={feedback.comments}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {feedback.comments}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {new Date(feedback.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={feedback.resolved ? 'Resolved' : 'Open'}
                                color={feedback.resolved ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Feedback</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Rating</InputLabel>
              <Select
                value={feedbackForm.rating}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map(rating => (
                  <MenuItem key={rating} value={rating}>{rating} Star{rating !== 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                value={feedbackForm.category}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value as any })}
              >
                <MenuItem value="bug">Bug Report</MenuItem>
                <MenuItem value="feature">Feature Request</MenuItem>
                <MenuItem value="usability">Usability Issue</MenuItem>
                <MenuItem value="performance">Performance Issue</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comments"
              value={feedbackForm.comments}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitFeedback} variant="contained">Submit</Button>
        </DialogActions>
      </Dialog>

      {/* Launch Report Dialog */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Launch Report</DialogTitle>
        <DialogContent>
          {launchReport && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Typography variant="body1" paragraph>{launchReport.summary}</Typography>

              {launchReport.recommendations.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>Recommendations</Typography>
                  {launchReport.recommendations.map((rec: string, index: number) => (
                    <Alert key={index} severity="info" sx={{ mb: 1 }}>
                      {rec}
                    </Alert>
                  ))}
                </>
              )}

              {launchReport.issues.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>Critical Issues</Typography>
                  {launchReport.issues.map((issue: UserFeedback, index: number) => (
                    <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">
                        {issue.category} - Rating: {issue.rating}/5
                      </Typography>
                      <Typography variant="body2">{issue.comments}</Typography>
                    </Alert>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LaunchMonitoringDashboard;