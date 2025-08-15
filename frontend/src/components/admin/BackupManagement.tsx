import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

interface Backup {
  id: string;
  type: 'full' | 'incremental' | 'schema';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export const BackupManagement: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create backup dialog
  const [createBackupOpen, setCreateBackupOpen] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'schema'>('full');
  const [creating, setCreating] = useState(false);

  // Restore backup dialog
  const [restoreBackupOpen, setRestoreBackupOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
    // Set up polling for backup status updates
    const interval = setInterval(loadBackups, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupData = await adminService.getBackups();
      setBackups(backupData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await adminService.createBackup(backupType);
      setSuccess('Backup creation started successfully');
      setCreateBackupOpen(false);
      loadBackups();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setRestoring(true);
      await adminService.restoreBackup(selectedBackup.id);
      setSuccess('Backup restoration started successfully');
      setRestoreBackupOpen(false);
      setSelectedBackup(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (backup: Backup) => {
    if (window.confirm(`Are you sure you want to delete backup ${backup.id}?`)) {
      try {
        await adminService.deleteBackup(backup.id);
        setSuccess('Backup deleted successfully');
        loadBackups();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete backup');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusChip = (backup: Backup) => {
    const statusColors: any = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      failed: 'error'
    };

    return (
      <Chip
        label={backup.status.replace('_', ' ')}
        color={statusColors[backup.status] || 'default'}
        size="small"
      />
    );
  };

  const getTypeChip = (type: string) => {
    const typeColors: any = {
      full: 'primary',
      incremental: 'secondary',
      schema: 'info'
    };

    return (
      <Chip
        label={type}
        color={typeColors[type] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Backup Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={() => setCreateBackupOpen(true)}
        >
          Create Backup
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Backup Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Backups
              </Typography>
              <Typography variant="h4">
                {backups.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {backups.filter(b => b.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" color="info.main">
                {backups.filter(b => b.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Size
              </Typography>
              <Typography variant="h4">
                {formatFileSize(backups.reduce((sum, b) => sum + (b.size || 0), 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backups Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No backups found
                </TableCell>
              </TableRow>
            ) : (
              backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {backup.id.substring(0, 12)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{getTypeChip(backup.type)}</TableCell>
                  <TableCell>
                    <Box>
                      {getStatusChip(backup)}
                      {backup.status === 'in_progress' && (
                        <LinearProgress sx={{ mt: 1, width: 100 }} />
                      )}
                      {backup.status === 'failed' && backup.error_message && (
                        <Typography variant="caption" color="error" display="block">
                          {backup.error_message}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {backup.size ? formatFileSize(backup.size) : '-'}
                  </TableCell>
                  <TableCell>{formatDate(backup.created_at)}</TableCell>
                  <TableCell>
                    {backup.completed_at ? formatDate(backup.completed_at) : '-'}
                  </TableCell>
                  <TableCell>
                    {backup.status === 'completed' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreBackupOpen(true);
                          }}
                          title="Restore Backup"
                        >
                          <RestoreIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Download Backup"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteBackup(backup)}
                      title="Delete Backup"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Backup Dialog */}
      <Dialog open={createBackupOpen} onClose={() => setCreateBackupOpen(false)}>
        <DialogTitle>Create New Backup</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Backup Type</InputLabel>
              <Select
                value={backupType}
                onChange={(e) => setBackupType(e.target.value as any)}
                label="Backup Type"
              >
                <MenuItem value="full">Full Backup</MenuItem>
                <MenuItem value="incremental">Incremental Backup</MenuItem>
                <MenuItem value="schema">Schema Only</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              {backupType === 'full' && 'Complete backup of all data and schema'}
              {backupType === 'incremental' && 'Backup of changes since last backup'}
              {backupType === 'schema' && 'Database structure only, no data'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateBackupOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBackup}
            variant="contained"
            disabled={creating}
            startIcon={creating ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Backup Dialog */}
      <Dialog open={restoreBackupOpen} onClose={() => setRestoreBackupOpen(false)}>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Warning:</strong> Restoring a backup will overwrite all current data. 
            This action cannot be undone. Please ensure you have a recent backup before proceeding.
          </Alert>
          {selectedBackup && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Backup ID:</strong> {selectedBackup.id}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Type:</strong> {selectedBackup.type}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Size:</strong> {formatFileSize(selectedBackup.size)}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Created:</strong> {formatDate(selectedBackup.created_at)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreBackupOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="warning"
            disabled={restoring}
            startIcon={restoring ? <CircularProgress size={20} /> : <RestoreIcon />}
          >
            {restoring ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};