import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add,
  Build,
  Schedule,
  CheckCircle,
  Error,
  Warning,
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore,
  Assignment,
  Update
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  impactLevel: 'low' | 'medium' | 'high';
  affectedServices: string[];
  notificationsSent: boolean;
}

interface UpdateProcedure {
  id: string;
  version: string;
  description: string;
  type: 'hotfix' | 'feature' | 'security' | 'maintenance';
  rollbackPlan: string;
  testingChecklist: string[];
  deploymentSteps: string[];
  status: 'planned' | 'testing' | 'ready' | 'deployed' | 'rolled_back';
  createdAt: Date;
  deployedAt?: Date;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    responseTime?: number;
  }>;
}

const MaintenanceManagement: React.FC = () => {
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [updateProcedures, setUpdateProcedures] = useState<UpdateProcedure[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  
  // Form states
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
    impactLevel: 'low' as 'low' | 'medium' | 'high',
    affectedServices: [] as string[]
  });

  const [updateForm, setUpdateForm] = useState({
    version: '',
    description: '',
    type: 'feature' as 'hotfix' | 'feature' | 'security' | 'maintenance',
    rollbackPlan: '',
    testingChecklist: [''],
    deploymentSteps: ['']
  });

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      setMaintenanceWindows([]);
      setUpdateProcedures([]);
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      setLoading(true);
      // Simulate health check API call
      const mockHealthCheck: HealthCheck = {
        status: 'healthy',
        checks: [
          { name: 'Database', status: 'pass', message: 'Database responsive in 45ms', responseTime: 45 },
          { name: 'Redis', status: 'pass', message: 'Redis responsive in 12ms', responseTime: 12 },
          { name: 'OpenAI API', status: 'pass', message: 'OpenAI API responsive in 234ms', responseTime: 234 },
          { name: 'Google Docs API', status: 'warn', message: 'Google Docs API responsive in 1.2s', responseTime: 1200 },
          { name: 'CPU Usage', status: 'pass', message: 'CPU usage: 45%' },
          { name: 'Memory Usage', status: 'pass', message: 'Memory usage: 62%' },
          { name: 'Disk Usage', status: 'pass', message: 'Disk usage: 34%' }
        ]
      };
      
      setHealthCheck(mockHealthCheck);
      setHealthDialogOpen(true);
    } catch (error) {
      console.error('Failed to run health check:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleMaintenanceWindow = async () => {
    try {
      // In a real implementation, this would be an API call
      const newWindow: MaintenanceWindow = {
        id: Math.random().toString(36).substr(2, 9),
        ...maintenanceForm,
        status: 'scheduled',
        notificationsSent: false
      };
      
      setMaintenanceWindows([...maintenanceWindows, newWindow]);
      setMaintenanceDialogOpen(false);
      resetMaintenanceForm();
    } catch (error) {
      console.error('Failed to schedule maintenance window:', error);
    }
  };

  const createUpdateProcedure = async () => {
    try {
      // In a real implementation, this would be an API call
      const newUpdate: UpdateProcedure = {
        id: Math.random().toString(36).substr(2, 9),
        ...updateForm,
        status: 'planned',
        createdAt: new Date()
      };
      
      setUpdateProcedures([...updateProcedures, newUpdate]);
      setUpdateDialogOpen(false);
      resetUpdateForm();
    } catch (error) {
      console.error('Failed to create update procedure:', error);
    }
  };

  const startMaintenanceWindow = async (windowId: string) => {
    try {
      const updatedWindows = maintenanceWindows.map(window =>
        window.id === windowId
          ? { ...window, status: 'in_progress' as const, actualStart: new Date() }
          : window
      );
      setMaintenanceWindows(updatedWindows);
    } catch (error) {
      console.error('Failed to start maintenance window:', error);
    }
  };

  const completeMaintenanceWindow = async (windowId: string) => {
    try {
      const updatedWindows = maintenanceWindows.map(window =>
        window.id === windowId
          ? { ...window, status: 'completed' as const, actualEnd: new Date() }
          : window
      );
      setMaintenanceWindows(updatedWindows);
    } catch (error) {
      console.error('Failed to complete maintenance window:', error);
    }
  };

  const executeUpdate = async (updateId: string) => {
    try {
      const updatedProcedures = updateProcedures.map(update =>
        update.id === updateId
          ? { ...update, status: 'deployed' as const, deployedAt: new Date() }
          : update
      );
      setUpdateProcedures(updatedProcedures);
    } catch (error) {
      console.error('Failed to execute update:', error);
    }
  };

  const rollbackUpdate = async (updateId: string) => {
    try {
      const updatedProcedures = updateProcedures.map(update =>
        update.id === updateId
          ? { ...update, status: 'rolled_back' as const }
          : update
      );
      setUpdateProcedures(updatedProcedures);
    } catch (error) {
      console.error('Failed to rollback update:', error);
    }
  };

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      title: '',
      description: '',
      scheduledStart: new Date(),
      scheduledEnd: new Date(),
      impactLevel: 'low',
      affectedServices: []
    });
  };

  const resetUpdateForm = () => {
    setUpdateForm({
      version: '',
      description: '',
      type: 'feature',
      rollbackPlan: '',
      testingChecklist: [''],
      deploymentSteps: ['']
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': case 'planned': return 'info';
      case 'in_progress': case 'testing': return 'warning';
      case 'completed': case 'deployed': case 'ready': return 'success';
      case 'cancelled': case 'rolled_back': return 'error';
      default: return 'default';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'pass': case 'healthy': return 'success';
      case 'warn': case 'degraded': return 'warning';
      case 'fail': case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const addChecklistItem = (type: 'testing' | 'deployment') => {
    if (type === 'testing') {
      setUpdateForm({
        ...updateForm,
        testingChecklist: [...updateForm.testingChecklist, '']
      });
    } else {
      setUpdateForm({
        ...updateForm,
        deploymentSteps: [...updateForm.deploymentSteps, '']
      });
    }
  };

  const updateChecklistItem = (type: 'testing' | 'deployment', index: number, value: string) => {
    if (type === 'testing') {
      const updated = [...updateForm.testingChecklist];
      updated[index] = value;
      setUpdateForm({ ...updateForm, testingChecklist: updated });
    } else {
      const updated = [...updateForm.deploymentSteps];
      updated[index] = value;
      setUpdateForm({ ...updateForm, deploymentSteps: updated });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Maintenance Management</Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={runHealthCheck}
              sx={{ mr: 1 }}
              disabled={loading}
            >
              Health Check
            </Button>
            <Button
              variant="outlined"
              startIcon={<Schedule />}
              onClick={() => setMaintenanceDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              Schedule Maintenance
            </Button>
            <Button
              variant="outlined"
              startIcon={<Update />}
              onClick={() => setUpdateDialogOpen(true)}
            >
              Create Update
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Maintenance Windows */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Maintenance Windows
                </Typography>
                {maintenanceWindows.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No maintenance windows scheduled
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Scheduled</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {maintenanceWindows.map((window) => (
                          <TableRow key={window.id}>
                            <TableCell>{window.title}</TableCell>
                            <TableCell>
                              {window.scheduledStart.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={window.status}
                                color={getStatusColor(window.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {window.status === 'scheduled' && (
                                <Button
                                  size="small"
                                  startIcon={<PlayArrow />}
                                  onClick={() => startMaintenanceWindow(window.id)}
                                >
                                  Start
                                </Button>
                              )}
                              {window.status === 'in_progress' && (
                                <Button
                                  size="small"
                                  startIcon={<Stop />}
                                  onClick={() => completeMaintenanceWindow(window.id)}
                                >
                                  Complete
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Update Procedures */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Update Procedures
                </Typography>
                {updateProcedures.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No update procedures created
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Version</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {updateProcedures.map((update) => (
                          <TableRow key={update.id}>
                            <TableCell>{update.version}</TableCell>
                            <TableCell>
                              <Chip label={update.type} size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={update.status}
                                color={getStatusColor(update.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {update.status === 'ready' && (
                                <Button
                                  size="small"
                                  startIcon={<PlayArrow />}
                                  onClick={() => executeUpdate(update.id)}
                                >
                                  Deploy
                                </Button>
                              )}
                              {update.status === 'deployed' && (
                                <Button
                                  size="small"
                                  startIcon={<Error />}
                                  onClick={() => rollbackUpdate(update.id)}
                                  color="error"
                                >
                                  Rollback
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Schedule Maintenance Dialog */}
        <Dialog open={maintenanceDialogOpen} onClose={() => setMaintenanceDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Schedule Maintenance Window</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Title"
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                margin="normal"
              />
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                margin="normal"
              />

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <DateTimePicker
                    label="Scheduled Start"
                    value={maintenanceForm.scheduledStart}
                    onChange={(date) => date && setMaintenanceForm({ ...maintenanceForm, scheduledStart: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DateTimePicker
                    label="Scheduled End"
                    value={maintenanceForm.scheduledEnd}
                    onChange={(date) => date && setMaintenanceForm({ ...maintenanceForm, scheduledEnd: date })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth margin="normal">
                <InputLabel>Impact Level</InputLabel>
                <Select
                  value={maintenanceForm.impactLevel}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, impactLevel: e.target.value as any })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMaintenanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={scheduleMaintenanceWindow} variant="contained">Schedule</Button>
          </DialogActions>
        </Dialog>

        {/* Create Update Dialog */}
        <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Update Procedure</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Version"
                    value={updateForm.version}
                    onChange={(e) => setUpdateForm({ ...updateForm, version: e.target.value })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={updateForm.type}
                      onChange={(e) => setUpdateForm({ ...updateForm, type: e.target.value as any })}
                    >
                      <MenuItem value="hotfix">Hotfix</MenuItem>
                      <MenuItem value="feature">Feature</MenuItem>
                      <MenuItem value="security">Security</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                margin="normal"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Rollback Plan"
                value={updateForm.rollbackPlan}
                onChange={(e) => setUpdateForm({ ...updateForm, rollbackPlan: e.target.value })}
                margin="normal"
              />

              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Testing Checklist</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {updateForm.testingChecklist.map((item, index) => (
                    <TextField
                      key={index}
                      fullWidth
                      label={`Test Step ${index + 1}`}
                      value={item}
                      onChange={(e) => updateChecklistItem('testing', index, e.target.value)}
                      margin="normal"
                    />
                  ))}
                  <Button
                    startIcon={<Add />}
                    onClick={() => addChecklistItem('testing')}
                    sx={{ mt: 1 }}
                  >
                    Add Test Step
                  </Button>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Deployment Steps</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {updateForm.deploymentSteps.map((step, index) => (
                    <TextField
                      key={index}
                      fullWidth
                      label={`Deployment Step ${index + 1}`}
                      value={step}
                      onChange={(e) => updateChecklistItem('deployment', index, e.target.value)}
                      margin="normal"
                    />
                  ))}
                  <Button
                    startIcon={<Add />}
                    onClick={() => addChecklistItem('deployment')}
                    sx={{ mt: 1 }}
                  >
                    Add Deployment Step
                  </Button>
                </AccordionDetails>
              </Accordion>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={createUpdateProcedure} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Health Check Dialog */}
        <Dialog open={healthDialogOpen} onClose={() => setHealthDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>System Health Check</DialogTitle>
          <DialogContent>
            {healthCheck && (
              <Box sx={{ pt: 1 }}>
                <Alert severity={getHealthStatusColor(healthCheck.status)} sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    Overall Status: {healthCheck.status.toUpperCase()}
                  </Typography>
                </Alert>

                <List>
                  {healthCheck.checks.map((check, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {check.status === 'pass' && <CheckCircle color="success" />}
                        {check.status === 'warn' && <Warning color="warning" />}
                        {check.status === 'fail' && <Error color="error" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={check.name}
                        secondary={check.message}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHealthDialogOpen(false)}>Close</Button>
            <Button onClick={runHealthCheck} variant="contained">Run Again</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default MaintenanceManagement;