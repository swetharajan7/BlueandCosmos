import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,

  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';

import {
  CheckCircle,
  Warning,
  Error,
  Schedule,
  Refresh,
  ExpandMore,
  School,
  Person,
  Email,
  Send,
  Done,
  Close,
  Info,
  Timeline as TimelineIcon,
  Assessment
} from '@mui/icons-material';
import { ApplicationStatusResponse, SubmissionStatus } from '../../types';
import { applicationService } from '../../services/applicationService';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ApplicationStatusDashboardProps {
  applicationId: string;
  onBack: () => void;
}

const ApplicationStatusDashboard: React.FC<ApplicationStatusDashboardProps> = ({
  applicationId,
  onBack
}) => {
  const [statusData, setStatusData] = useState<ApplicationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | false>(false);
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);

  // WebSocket connection for real-time updates
  const { isConnected, subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    loadStatusData();
  }, [applicationId]);

  useEffect(() => {
    if (isConnected && statusData) {
      // Subscribe to updates for all recommendations
      statusData.recommendations.forEach(rec => {
        subscribe(`recommendation:${rec.id}`, handleRealtimeUpdate);
      });

      return () => {
        statusData.recommendations.forEach(rec => {
          unsubscribe(`recommendation:${rec.id}`);
        });
      };
    }
  }, [isConnected, statusData]);

  const loadStatusData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await applicationService.getApplicationStatus(applicationId);
      setStatusData(data);
    } catch (err) {
      console.error('Error loading status data:', err);
      setError('Failed to load application status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatusData();
    setRefreshing(false);
  };

  const handleRealtimeUpdate = (update: any) => {
    // Handle real-time WebSocket updates
    console.log('Received real-time update:', update);
    // Refresh data when we receive updates
    loadStatusData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'success';
      case 'submitted':
      case 'in_progress':
        return 'info';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'partial_failure':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle color="success" />;
      case 'submitted':
      case 'in_progress':
        return <Schedule color="info" />;
      case 'pending':
        return <Warning color="warning" />;
      case 'failed':
      case 'partial_failure':
        return <Error color="error" />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getProgressValue = (universityStatuses: SubmissionStatus[]) => {
    const completed = universityStatuses.filter(s => s.status === 'confirmed').length;
    return (completed / universityStatuses.length) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading application status...
        </Typography>
      </Container>
    );
  }

  if (error || !statusData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load application status'}
        </Alert>
        <Button variant="contained" onClick={loadStatusData}>
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Button onClick={onBack} sx={{ mb: 2 }}>
            ← Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Application Status
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {statusData.application.legal_name} • {statusData.application.program_type.toUpperCase()} • {statusData.application.application_term}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="View Timeline">
            <IconButton onClick={() => setShowTimelineDialog(true)}>
              <TimelineIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getStatusIcon(statusData.overall_status)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              Overall Status: 
              <Chip 
                label={statusData.overall_status.replace('_', ' ').toUpperCase()} 
                color={getStatusColor(statusData.overall_status) as any}
                sx={{ ml: 1 }}
              />
            </Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {statusData.summary.total_universities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Universities
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {statusData.summary.completed_submissions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {statusData.summary.pending_submissions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {statusData.summary.failed_submissions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recommendations Status */}
      <Typography variant="h5" gutterBottom>
        Recommendation Status
      </Typography>

      {statusData.recommendations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Person sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Recommendations Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recommendations will appear here once recommenders submit them.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        statusData.recommendations.map((recommendation) => (
          <Accordion
            key={recommendation.id}
            expanded={expandedRecommendation === recommendation.id}
            onChange={(_, isExpanded) => setExpandedRecommendation(isExpanded ? recommendation.id : false)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    {recommendation.recommender_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recommendation.recommender_title} at {recommendation.recommender_organization}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={recommendation.overall_status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(recommendation.overall_status) as any}
                    size="small"
                  />
                  <Box sx={{ width: 100 }}>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressValue(recommendation.university_statuses)}
                      color={getStatusColor(recommendation.overall_status) as any}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {recommendation.university_statuses.map((universityStatus) => (
                  <Grid item xs={12} sm={6} md={4} key={universityStatus.university.id}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {getStatusIcon(universityStatus.status)}
                          <Typography variant="subtitle2" sx={{ ml: 1, flex: 1 }}>
                            {universityStatus.university.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={universityStatus.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(universityStatus.status) as any}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        {universityStatus.submitted_at && (
                          <Typography variant="caption" display="block">
                            Submitted: {formatDate(universityStatus.submitted_at)}
                          </Typography>
                        )}
                        {universityStatus.confirmed_at && (
                          <Typography variant="caption" display="block">
                            Confirmed: {formatDate(universityStatus.confirmed_at)}
                          </Typography>
                        )}
                        {universityStatus.error_message && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {universityStatus.error_message}
                            </Typography>
                          </Alert>
                        )}
                        {universityStatus.retry_count && universityStatus.retry_count > 0 && (
                          <Typography variant="caption" color="warning.main" display="block">
                            Retries: {universityStatus.retry_count}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Timeline Dialog */}
      <Dialog
        open={showTimelineDialog}
        onClose={() => setShowTimelineDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1 }} />
            Application Timeline
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {statusData.timeline.map((event, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    {event.event_type === 'submission_completed' ? 
                      <CheckCircle color="success" /> :
                     event.event_type === 'recommendation_submitted' ? 
                      <Send color="info" /> : 
                      <Info color="primary" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={event.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < statusData.timeline.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTimelineDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* WebSocket Connection Status */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Real-time updates are currently unavailable. Status information may not be up to date.
        </Alert>
      )}
    </Container>
  );
};

export default ApplicationStatusDashboard;