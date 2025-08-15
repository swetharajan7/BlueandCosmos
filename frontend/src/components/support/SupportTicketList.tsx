import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Support as SupportIcon,
  OpenInNew as OpenIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    message: string;
    sender_name: string;
    created_at: string;
  };
}

interface SupportTicketListProps {
  onCreateTicket: () => void;
  onViewTicket: (ticketId: string) => void;
}

const SupportTicketList: React.FC<SupportTicketListProps> = ({
  onCreateTicket,
  onViewTicket
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/support/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.data.tickets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const getCategoryLabel = (category: string) => {
    const labels = {
      'technical': 'Technical',
      'account': 'Account',
      'application': 'Application',
      'billing': 'Billing',
      'general': 'General'
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <SupportIcon sx={{ mr: 1 }} />
          Support Tickets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateTicket}
        >
          Create Ticket
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="">All Tickets</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="waiting_for_user">Waiting for User</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {tickets.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SupportIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No support tickets found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {statusFilter 
                ? `No tickets with status "${statusFilter}"`
                : "You haven't created any support tickets yet."
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateTicket}
            >
              Create Your First Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <List>
          {tickets.map((ticket, index) => (
            <React.Fragment key={ticket.id}>
              <ListItem
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {ticket.subject}
                      </Typography>
                      <Chip
                        label={ticket.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(ticket.status) as any}
                        variant="outlined"
                      />
                      <Chip
                        label={ticket.priority}
                        size="small"
                        color={getPriorityColor(ticket.priority) as any}
                        variant="filled"
                      />
                      <Chip
                        label={getCategoryLabel(ticket.category)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Created: {format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                      {ticket.last_message && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Last message from {ticket.last_message.sender_name}:{' '}
                          {ticket.last_message.message.length > 100
                            ? `${ticket.last_message.message.substring(0, 100)}...`
                            : ticket.last_message.message
                          }
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenIcon />}
                    onClick={() => onViewTicket(ticket.id)}
                  >
                    View
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              {index < tickets.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default SupportTicketList;