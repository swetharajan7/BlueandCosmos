import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { Support as SupportIcon } from '@mui/icons-material';

interface SupportTicketFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (ticketData: any) => Promise<void>;
  context?: any; // Additional context data
}

const SupportTicketForm: React.FC<SupportTicketFormProps> = ({
  open,
  onClose,
  onSubmit,
  context
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'account', label: 'Account Problem' },
    { value: 'application', label: 'Application Help' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'general', label: 'General Support' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        ...formData,
        context_data: context
      });
      
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: 'general'
      });
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SupportIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            Create Support Ticket
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Describe your issue and we'll get back to you as soon as possible.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={handleChange('category')}
              label="Category"
            >
              {categories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Subject"
            value={formData.subject}
            onChange={handleChange('subject')}
            required
            placeholder="Brief description of your issue"
            inputProps={{ maxLength: 255 }}
            helperText={`${formData.subject.length}/255 characters`}
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            required
            multiline
            rows={6}
            placeholder="Please provide detailed information about your issue, including any error messages and steps to reproduce the problem."
            inputProps={{ maxLength: 5000 }}
            helperText={`${formData.description.length}/5000 characters`}
          />

          {context && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                Additional context information will be included with your ticket to help us assist you better.
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !formData.subject.trim() || !formData.description.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Creating...' : 'Create Ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupportTicketForm;