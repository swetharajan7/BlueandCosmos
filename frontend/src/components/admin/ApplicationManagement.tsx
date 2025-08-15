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
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

interface Application {
  id: string;
  legal_name: string;
  program_type: string;
  application_term: string;
  status: string;
  created_at: string;
  student_name: string;
  student_email: string;
  recommendation_count: number;
  submission_count: number;
}

interface ApplicationDetails extends Application {
  student_phone?: string;
  universities: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  recommendations: Array<{
    id: string;
    recommender_name: string;
    recommender_email: string;
    title: string;
    organization: string;
    status: string;
    created_at: string;
    submitted_at?: string;
  }>;
  submissions: Array<{
    id: string;
    university_name: string;
    status: string;
    submitted_at?: string;
    confirmed_at?: string;
  }>;
}

export const ApplicationManagement: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalApplications, setTotalApplications] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    university: ''
  });

  // Application details dialog
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetails | null>(null);
  const [applicationDetailsOpen, setApplicationDetailsOpen] = useState(false);
  const [applicationDetailsLoading, setApplicationDetailsLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [page, rowsPerPage, filters]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await adminService.getApplications({
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      });
      setApplications(response.applications);
      setTotalApplications(response.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleViewApplication = async (application: Application) => {
    try {
      setApplicationDetailsLoading(true);
      setApplicationDetailsOpen(true);
      const details = await adminService.getApplicationDetails(application.id);
      setSelectedApplication(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load application details');
    } finally {
      setApplicationDetailsLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: any = {
      draft: 'default',
      pending: 'warning',
      submitted: 'info',
      completed: 'success'
    };

    return (
      <Chip
        label={status}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  const getProgramTypeChip = (programType: string) => {
    const programColors: any = {
      undergraduate: 'primary',
      graduate: 'secondary',
      mba: 'success',
      llm: 'info',
      medical: 'warning',
      phd: 'error'
    };

    return (
      <Chip
        label={programType.toUpperCase()}
        color={programColors[programType] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Application Management
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
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="University"
              value={filters.university}
              onChange={(e) => handleFilterChange('university', e.target.value)}
              placeholder="Search by university..."
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadApplications}
              disabled={loading}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Applications Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Applicant</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Term</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Recommendations</TableCell>
              <TableCell>Submissions</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {application.legal_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {application.student_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {application.student_email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{getProgramTypeChip(application.program_type)}</TableCell>
                  <TableCell>{application.application_term}</TableCell>
                  <TableCell>{getStatusChip(application.status)}</TableCell>
                  <TableCell align="center">{application.recommendation_count}</TableCell>
                  <TableCell align="center">{application.submission_count}</TableCell>
                  <TableCell>{formatDate(application.created_at)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewApplication(application)}
                      title="View Details"
                    >
                      <ViewIcon />
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
          count={totalApplications}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Application Details Dialog */}
      <Dialog
        open={applicationDetailsOpen}
        onClose={() => setApplicationDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Application Details
          {selectedApplication && ` - ${selectedApplication.legal_name}`}
        </DialogTitle>
        <DialogContent>
          {applicationDetailsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : selectedApplication ? (
            <Box>
              {/* Basic Information */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Application Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Legal Name"
                            secondary={selectedApplication.legal_name}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Program Type"
                            secondary={getProgramTypeChip(selectedApplication.program_type)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Application Term"
                            secondary={selectedApplication.application_term}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Status"
                            secondary={getStatusChip(selectedApplication.status)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Created"
                            secondary={formatDate(selectedApplication.created_at)}
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
                        <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Student Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Name"
                            secondary={selectedApplication.student_name}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Email"
                            secondary={selectedApplication.student_email}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Phone"
                            secondary={selectedApplication.student_phone || 'Not provided'}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Universities */}
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Target Universities ({selectedApplication.universities?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {selectedApplication.universities?.map((university) => (
                      <Grid item xs={12} sm={6} md={4} key={university.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="body1" fontWeight="medium">
                              {university.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {university.code}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Recommendations */}
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    Recommendations ({selectedApplication.recommendations?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Recommender</TableCell>
                          <TableCell>Organization</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Submitted</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedApplication.recommendations?.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {rec.recommender_name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {rec.recommender_email}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {rec.organization}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {rec.title}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{getStatusChip(rec.status)}</TableCell>
                            <TableCell>{formatDate(rec.created_at)}</TableCell>
                            <TableCell>
                              {rec.submitted_at ? formatDate(rec.submitted_at) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>

              {/* Submissions */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    Submissions ({selectedApplication.submissions?.length || 0})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>University</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell>Confirmed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedApplication.submissions?.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>{sub.university_name}</TableCell>
                            <TableCell>{getStatusChip(sub.status)}</TableCell>
                            <TableCell>
                              {sub.submitted_at ? formatDate(sub.submitted_at) : '-'}
                            </TableCell>
                            <TableCell>
                              {sub.confirmed_at ? formatDate(sub.confirmed_at) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplicationDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};