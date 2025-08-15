import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Avatar
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  Support as SupportIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface SupportTicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_role: 'user' | 'support' | 'system';
  created_at: string;
}

interface SupportTicketDetail {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  messages: SupportTicketMessage[];
}

interface SupportTicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

const SupportTicketDetail: React.FC<SupportTicketDetailProps> = ({
  ticketId,
  onBack
}) => {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicketDetail();
  }, [ticketId]);

  const fetchTicketDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ticket details');
      }

      const data = await response.json();
      setTicket(data.data.ticket);
      setMessages(data.data.ticket.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, data.data.message]);
      setNewMessage('');
      
      // Refresh ticket to get updated status
      await fetchTicketDetail();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'primary';
      case 'in_progress':
        return 'info';
      case 'waiting_for_user':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSenderAvatar = (senderRole: string) => {
    switch (senderRole) {
      case 'support':
        return <Avatar sx={{ bgcolor: 'primary.main' }}><SupportIcon /></Avatar>;
      case 'system':
        return <Avatar sx={{ bgcolor: 'grey.500' }}>S</Avatar>;
      default:
        return <Avatar sx={{ bgcolor: 'secondary.main' }}><PersonIcon /></Avatar>;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !ticket) {
    return (
      <Box>
        <Button
          startIcon={<BackIcon />}
          onClick={onBack}
          sx={{ mb: 2 }}
        >
          Back to Tickets
        </Button>
        <Alert severity="error">
          {error || 'Ticket not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {ticket.subject}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={ticket.status.replace('_', ' ')}
                color={getStatusColor(ticket.status) as any}
                variant="outlined"
              />
              <Chip
                label={ticket.priority}
                color={getPriorityColor(ticket.priority) as any}
                variant="filled"
              />
            </Box>
          </Box>

          <Typography variant="body1" sx={{ mb: 2 }}>
            {ticket.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Category:</strong> {ticket.category}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Created:</strong> {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Last Updated:</strong> {format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm')}
            </Typography>
            {ticket.resolved_at && (
              <Typography variant="body2" color="text.secondary">
                <strong>Resolved:</strong> {format(new Date(ticket.resolved_at), 'MMM dd, yyyy HH:mm')}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Conversation
          </Typography>

          {messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No messages yet. Start the conversation below.
            </Typography>
          ) : (
            <List>
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <Box sx={{ mr: 2, mt: 0.5 }}>
                      {getSenderAvatar(message.sender_role)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2">
                            {message.sender_name}
                          </Typography>
                          <Chip
                            label={message.sender_role}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(message.created_at), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            mt: 1,
                            backgroundColor: message.sender_role === 'user' ? 'primary.50' : 'grey.50'
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.message}
                          </Typography>
                        </Paper>
                      }
                    />
                  </ListItem>
                  {index < messages.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {ticket.status !== 'closed' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Add Message
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              variant="outlined"
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 5000 }}
              helperText={`${newMessage.length}/5000 characters`}
            />

            <Button
              variant="contained"
              startIcon={sendingMessage ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>
      )}

      {ticket.status === 'closed' && (
        <Alert severity="info">
          This ticket has been closed. If you need further assistance, please create a new ticket.
        </Alert>
      )}
    </Box>
  );
};

export default SupportTicketDetail;