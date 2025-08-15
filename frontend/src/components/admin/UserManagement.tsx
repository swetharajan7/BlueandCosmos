import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  VpnKey as ResetPasswordIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  activity_count: number;
}

interface UserDetails extends User {
  applications?: any[];
  recommendations?: any[];
  sessions?: any[];
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  // User details dialog
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);

  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: string;
    user: User | null;
  }>({
    open: false,
    type: '',
    user: null
  });

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      });
      setUsers(response.users);
      setTotalUsers(response.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleViewUser = async (user: User) => {
    try {
      setUserDetailsLoading(true);
      setUserDetailsOpen(true);
      const details = await adminService.getUserDetails(user.id);
      setSelectedUser(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleUserAction = (type: string, user: User) => {
    setActionDialog({
      open: true,
      type,
      user
    });
  };

  const executeUserAction = async () => {
    if (!actionDialog.user) return;

    try {
      const { type, user } = actionDialog;
      
      switch (type) {
        case 'activate':
        case 'deactivate':
        case 'verify':
        case 'unverify':
          await adminService.updateUserStatus(user.id, type);
          break;
        case 'reset-password':
          await adminService.resetUserPassword(user.id);
          break;
        case 'delete':
          // In a real implementation, you'd handle user deletion
          console.log('Delete user:', user.id);
          break;
      }

      setActionDialog({ open: false, type: '', user: null });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    }
  };

  const getStatusChip = (user: User) => {
    if (!user.is_active) {
      return <Chip label="Inactive" color="error" size="small" />;
    }
    if (!user.is_verified) {
      return <Chip label="Unverified" color="warning" size="small" />;
    }
    return <Chip label="Active" color="success" size="small" />;
  };

  const getRoleChip = (role: string) => {
    const colors: any = {
      admin: 'error',
      student: 'primary',
      recommender: 'secondary'
    };
    return <Chip label={role} color={colors[role] || 'default'} size="small" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search users"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Name or email..."
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                label="Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="recommender">Recommender</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="unverified">Unverified</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadUsers}
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Activity</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{getStatusChip(user)}</TableCell>
                  <TableCell>{user.activity_count}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewUser(user)}
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                    {user.is_active ? (
                      <IconButton
                        size="small"
                        onClick={() => handleUserAction('deactivate', user)}
                        title="Deactivate User"
                      >
                        <BlockIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleUserAction('activate', user)}
                        title="Activate User"
                      >
                        <ActivateIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleUserAction('reset-password', user)}
                      title="Reset Password"
                    >
                      <ResetPasswordIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details
          {selectedUser && ` - ${selectedUser.first_name} ${selectedUser.last_name}`}
        </DialogTitle>
        <DialogContent>
          {userDetailsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedUser ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Name"
                          secondary={`${selectedUser.first_name} ${selectedUser.last_name}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Email"
                          secondary={selectedUser.email}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Phone"
                          secondary={selectedUser.phone || 'Not provided'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Role"
                          secondary={selectedUser.role}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Status"
                          secondary={getStatusChip(selectedUser)}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Activity Summary
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Applications"
                          secondary={selectedUser.applications?.length || 0}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Recommendations"
                          secondary={selectedUser.recommendations?.length || 0}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Active Sessions"
                          secondary={selectedUser.sessions?.filter(s => s.is_active).length || 0}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Last Login"
                          secondary={selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: '', user: null })}
      >
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionDialog.type.replace('-', ' ')} user{' '}
            {actionDialog.user?.first_name} {actionDialog.user?.last_name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setActionDialog({ open: false, type: '', user: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={executeUserAction}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};