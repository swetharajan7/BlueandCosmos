import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { invitationService, InvitationRequest, RecommenderInvitation } from '../../services/invitationService';

interface RecommenderManagerProps {
  applicationId: string;
  onRecommendersChange?: (count: number) => void;
}

const RecommenderManager: React.FC<RecommenderManagerProps> = ({
  applicationId,
  onRecommendersChange
}) => {
  const [recommenders, setRecommenders] = useState<RecommenderInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedRecommender, setSelectedRecommender] = useState<RecommenderInvitation | null>(null);
  const [inviteForm, setInviteForm] = useState<InvitationRequest>({
    recommender_email: '',
    custom_message: ''
  });
  const [resendMessage, setResendMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecommenders();
  }, [applicationId]);

  useEffect(() => {
    onRecommendersChange?.(recommenders.length);
  }, [recommenders, onRecommendersChange]);

  const loadRecommenders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invitationService.getApplicationRecommenders(applicationId);
      setRecommenders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteForm.recommender_email.trim()) {
      setError('Email address is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await invitationService.sendInvitation(applicationId, inviteForm);
      
      // Reload recommenders list
      await loadRecommenders();
      
      // Reset form and close dialog
      setInviteForm({ recommender_email: '', custom_message: '' });
      setInviteDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!selectedRecommender) return;

    try {
      setSubmitting(true);
      setError(null);
      
      await invitationService.resendInvitation(
        applicationId,
        selectedRecommender.id,
        resendMessage.trim() || undefined
      );
      
      // Reload recommenders list
      await loadRecommenders();
      
      // Reset and close dialog
      setResendMessage('');
      setResendDialogOpen(false);
      setSelectedRecommender(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvitation = async (recommender: RecommenderInvitation) => {
    if (!window.confirm(`Are you sure you want to remove ${recommender.professional_email}?`)) {
      return;
    }

    try {
      setError(null);
      await invitationService.deleteInvitation(applicationId, recommender.id);
      await loadRecommenders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusChip = (recommender: RecommenderInvitation) => {
    switch (recommender.status) {
      case 'confirmed':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Confirmed"
            color="success"
            size="small"
          />
        );
      case 'invited':
        return (
          <Chip
            icon={<ScheduleIcon />}
            label="Pending"
            color="warning"
            size="small"
          />
        );
      case 'expired':
        return (
          <Chip
            icon={<ErrorIcon />}
            label="Expired"
            color="error"
            size="small"
          />
        );
      default:
        return (
          <Chip
            label={recommender.status}
            size="small"
          />
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Recommenders ({recommenders.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite Recommender
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {recommenders.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No recommenders invited yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click "Invite Recommender" to send your first invitation
            </Typography>
          </Box>
        ) : (
          <List>
            {recommenders.map((recommender, index) => (
              <React.Fragment key={recommender.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {recommender.professional_email}
                        </Typography>
                        {getStatusChip(recommender)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {recommender.title && recommender.organization && (
                          <Typography variant="body2" color="text.secondary">
                            {recommender.title} at {recommender.organization}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Invited: {formatDate(recommender.invited_at)}
                          {recommender.confirmed_at && (
                            <> • Confirmed: {formatDate(recommender.confirmed_at)}</>
                          )}
                          {recommender.invitation_expires && recommender.status === 'invited' && (
                            <> • Expires: {formatDate(recommender.invitation_expires)}</>
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={1}>
                      {recommender.status === 'invited' && (
                        <Tooltip title="Resend invitation">
                          <IconButton
                            edge="end"
                            onClick={() => {
                              setSelectedRecommender(recommender);
                              setResendDialogOpen(true);
                            }}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {recommender.status !== 'confirmed' && (
                        <Tooltip title="Remove invitation">
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteInvitation(recommender)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Invite Dialog */}
        <Dialog
          open={inviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Invite Recommender</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Recommender Email"
              type="email"
              fullWidth
              variant="outlined"
              value={inviteForm.recommender_email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, recommender_email: e.target.value })
              }
              required
            />
            <TextField
              margin="dense"
              label="Personal Message (Optional)"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              value={inviteForm.custom_message}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, custom_message: e.target.value })
              }
              placeholder="Add a personal message to include in the invitation email..."
              helperText="This message will be included in the invitation email to your recommender"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendInvitation}
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <EmailIcon />}
            >
              {submitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Resend Dialog */}
        <Dialog
          open={resendDialogOpen}
          onClose={() => setResendDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Resend Invitation</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Resending invitation to: {selectedRecommender?.professional_email}
            </Typography>
            <TextField
              margin="dense"
              label="Additional Message (Optional)"
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              value={resendMessage}
              onChange={(e) => setResendMessage(e.target.value)}
              placeholder="Add an additional message for the resent invitation..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResendDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleResendInvitation}
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <RefreshIcon />}
            >
              {submitting ? 'Resending...' : 'Resend Invitation'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RecommenderManager;