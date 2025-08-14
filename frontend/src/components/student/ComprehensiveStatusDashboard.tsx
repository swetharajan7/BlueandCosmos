import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Support as SupportIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface StatusReport {
  applications: Array<{
    id: string;
    applicantName: string;
    programType: string;
    applicationTerm: string;
    status: string;
    totalUniversities: number;
    submissionStats: {
      pending: number;
      submitted: number;
      confirmed: number;
      failed: number;
    };
    universities: Array<{
      name: string;
      status: string;
      submittedAt?: string;
      confirmedAt?: string;
      externalReference?: string;
      errorMessage?: string;
    }>;
  }>;
  overallStats: {
    totalApplications: number;
    totalSubmissions: number;
    successRate: number;
    pendingCount: number;
    failedCount: number;
  };
}

interface SupportTicket {
  issueType: string;
  subject: string;
  description: string;
  priority: string;
  submissionId?: string;
}

const ComprehensiveStatusDashboard: React.FC = () => {
  const [statusReport, setStatusReport] = useState<StatusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportTicket, setSupportTicket] = useState<SupportTicket>({
    issueType: 'other',
    subject: '',
    description: '',
    priority: 'medium'
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    fetchStatusReport();
  }, []);

  const fetchStatusReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/confirmation/status-report', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status report');
      }

      const data = await response.json();
      setStatusReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status report');
    } finally {
      setLoading(false);
    }
  };

  const sendConfirmationSummary = async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/confirmation/recommendations/${recommendationId}/confirmation-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send confirmation summary');
      }

      alert('Confirmation summary email sent successfully!');
    } catch (err) {
      alert('Failed to send confirmation summary: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const createSupportTicket = async () => {
    try {
      setSubmittingTicket(true);
      setError(null);

      const response = await fetch('/api/confirmation/support-tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supportTicket)
      });

      if (!response.ok) {
        throw new Error('Failed to create support ticket');
      }

      const data = await response.json();
      setTicketSuccess(`Support ticket created successfully! Ticket ID: ${data.data.ticketId}`);
      setSupportDialogOpen(false);
      setSupportTicket({
        issueType: 'other',
        subject: '',
        description: '',
        priority: 'medium'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon color="success" />;
      case 'submitted':
        return <ScheduleIcon color="primary" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'submitted':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateProgress = (stats: StatusReport['applications'][0]['submissionStats']) => {
    const total = stats.pending + stats.submitted + stats.confirmed + stats.failed;
    if (total === 0) return 0;
    return (stats.confirmed / total) * 100;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Comprehensive Status Dashboard
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading your comprehensive status report...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchStatusReport} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!statusReport) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No status report data available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          📋 Comprehensive Status Dashboard
        </Typography>
        <Box>
          <Tooltip title="Refresh Status">
            <IconButton onClick={fetchStatusReport} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<SupportIcon />}
            onClick={() => setSupportDialogOpen(true)}
            sx={{ ml: 1 }}
          >
            Get Support
          </Button>
        </Box>
      </Box>

      {ticketSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setTicketSuccess(null)}>
          {ticketSuccess}
        </Alert>
      )}

      {/* Overall Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 Overall Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {statusReport.overallStats.totalApplications}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Applications
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {statusReport.overallStats.totalSubmissions}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Submissions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {statusReport.overallStats.successRate}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Success Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {statusReport.overallStats.pendingCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {statusReport.overallStats.failedCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Failed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Applications Detail */}
      <Typography variant="h6" gutterBottom>
        🎓 Application Details
      </Typography>
      
      {statusReport.applications.map((application) => (
        <Accordion key={application.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">
                  {application.applicantName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {application.programType} • {application.applicationTerm} • {application.totalUniversities} universities
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Chip
                  size="small"
                  label={`${application.submissionStats.confirmed} Confirmed`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${application.submissionStats.pending} Pending`}
                  color="warning"
                  variant="outlined"
                />
                {application.submissionStats.failed > 0 && (
                  <Chip
                    size="small"
                    label={`${application.submissionStats.failed} Failed`}
                    color="error"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Progress Overview
              </Typography>
              <LinearProgress
                variant="determinate"
                value={calculateProgress(application.submissionStats)}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {application.submissionStats.confirmed} of {application.totalUniversities} submissions confirmed
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              University Submission Status
            </Typography>
            <List dense>
              {application.universities.map((university, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    {getStatusIcon(university.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {university.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={university.status.toUpperCase()}
                          color={getStatusColor(university.status)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {university.submittedAt && (
                          <Typography variant="body2" color="textSecondary">
                            Submitted: {new Date(university.submittedAt).toLocaleDateString()}
                          </Typography>
                        )}
                        {university.confirmedAt && (
                          <Typography variant="body2" color="success.main">
                            Confirmed: {new Date(university.confirmedAt).toLocaleDateString()}
                          </Typography>
                        )}
                        {university.externalReference && (
                          <Typography variant="body2" color="textSecondary">
                            Reference: {university.externalReference}
                          </Typography>
                        )}
                        {university.errorMessage && (
                          <Typography variant="body2" color="error.main">
                            Error: {university.errorMessage}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => {
                  // Find the recommendation ID for this application
                  // This would need to be passed from the parent or fetched
                  // For now, we'll use a placeholder
                  alert('Confirmation summary feature requires recommendation ID');
                }}
              >
                Send Confirmation Summary
              </Button>
              {application.submissionStats.failed > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<SupportIcon />}
                  onClick={() => {
                    setSupportTicket({
                      ...supportTicket,
                      issueType: 'submission_failed',
                      subject: `Failed submissions for ${application.applicantName}`,
                      description: `I need help with failed submissions for my application to ${application.universities.filter(u => u.status === 'failed').map(u => u.name).join(', ')}.`
                    });
                    setSupportDialogOpen(true);
                  }}
                >
                  Report Issues
                </Button>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Support Ticket Dialog */}
      <Dialog open={supportDialogOpen} onClose={() => setSupportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SupportIcon sx={{ mr: 1 }} />
            Create Support Ticket
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Issue Type"
                value={supportTicket.issueType}
                onChange={(e) => setSupportTicket({ ...supportTicket, issueType: e.target.value })}
              >
                <MenuItem value="submission_failed">Submission Failed</MenuItem>
                <MenuItem value="confirmation_missing">Confirmation Missing</MenuItem>
                <MenuItem value="university_error">University Error</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Priority"
                value={supportTicket.priority}
                onChange={(e) => setSupportTicket({ ...supportTicket, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={supportTicket.subject}
                onChange={(e) => setSupportTicket({ ...supportTicket, subject: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={supportTicket.description}
                onChange={(e) => setSupportTicket({ ...supportTicket, description: e.target.value })}
                placeholder="Please describe your issue in detail..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={createSupportTicket}
            variant="contained"
            disabled={submittingTicket || !supportTicket.subject || !supportTicket.description}
          >
            {submittingTicket ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComprehensiveStatusDashboard;