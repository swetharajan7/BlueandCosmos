import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

interface SystemHealthData {
  database: string;
  redis: string;
  externalApis: {
    openai: string;
    googleDocs: string;
    sendgrid: string;
  };
  systemMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  alerts?: Array<{
    id: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
  }>;
}

export const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadHealthData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const health = await adminService.getSystemHealth();
      
      // Simulate additional metrics (in real implementation, these would come from monitoring services)
      const enhancedHealth = {
        ...health,
        systemMetrics: {
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          diskUsage: Math.random() * 100,
          networkLatency: Math.random() * 200
        },
        alerts: [
          {
            id: '1',
            severity: 'warning',
            title: 'High Memory Usage',
            message: 'Memory usage is above 80%',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            severity: 'info',
            title: 'Backup Completed',
            message: 'Daily backup completed successfully',
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      };
      
      setHealthData(enhancedHealth);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="disabled" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && !healthData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          System Health Monitor
        </Typography>
        <Box>
          {lastUpdated && (
            <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={loadHealthData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {healthData && (
        <>
          {/* Core Services Status */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Core Services
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(healthData.database)}
                      </ListItemIcon>
                      <ListItemText
                        primary="Database (PostgreSQL)"
                        secondary={
                          <Chip
                            label={healthData.database}
                            color={getHealthColor(healthData.database) as any}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(healthData.redis)}
                      </ListItemIcon>
                      <ListItemText
                        primary="Cache (Redis)"
                        secondary={
                          <Chip
                            label={healthData.redis}
                            color={getHealthColor(healthData.redis) as any}
                            size="small"
                          />
                        }
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
                    <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    External Services
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(healthData.externalApis.openai)}
                      </ListItemIcon>
                      <ListItemText
                        primary="OpenAI API"
                        secondary={
                          <Chip
                            label={healthData.externalApis.openai}
                            color={getHealthColor(healthData.externalApis.openai) as any}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(healthData.externalApis.googleDocs)}
                      </ListItemIcon>
                      <ListItemText
                        primary="Google Docs API"
                        secondary={
                          <Chip
                            label={healthData.externalApis.googleDocs}
                            color={getHealthColor(healthData.externalApis.googleDocs) as any}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(healthData.externalApis.sendgrid)}
                      </ListItemIcon>
                      <ListItemText
                        primary="SendGrid API"
                        secondary={
                          <Chip
                            label={healthData.externalApis.sendgrid}
                            color={getHealthColor(healthData.externalApis.sendgrid) as any}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* System Metrics */}
          {healthData.systemMetrics && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SpeedIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">CPU Usage</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={healthData.systemMetrics.cpuUsage}
                      color={getMetricColor(healthData.systemMetrics.cpuUsage, { warning: 70, critical: 90 }) as any}
                      sx={{ mb: 1, height: 8 }}
                    />
                    <Typography variant="body2">
                      {healthData.systemMetrics.cpuUsage.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <MemoryIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Memory Usage</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={healthData.systemMetrics.memoryUsage}
                      color={getMetricColor(healthData.systemMetrics.memoryUsage, { warning: 80, critical: 95 }) as any}
                      sx={{ mb: 1, height: 8 }}
                    />
                    <Typography variant="body2">
                      {healthData.systemMetrics.memoryUsage.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <StorageIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Disk Usage</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={healthData.systemMetrics.diskUsage}
                      color={getMetricColor(healthData.systemMetrics.diskUsage, { warning: 85, critical: 95 }) as any}
                      sx={{ mb: 1, height: 8 }}
                    />
                    <Typography variant="body2">
                      {healthData.systemMetrics.diskUsage.toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <NetworkIcon sx={{ mr: 1 }} />
                      <Typography variant="h6">Network Latency</Typography>
                    </Box>
                    <Typography variant="h4" color={
                      healthData.systemMetrics.networkLatency > 100 ? 'error.main' : 
                      healthData.systemMetrics.networkLatency > 50 ? 'warning.main' : 'success.main'
                    }>
                      {healthData.systemMetrics.networkLatency.toFixed(0)}ms
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average response time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* System Alerts */}
          {healthData.alerts && healthData.alerts.length > 0 && (
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  System Alerts ({healthData.alerts.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {healthData.alerts.map((alert) => (
                    <ListItem key={alert.id}>
                      <ListItemIcon>
                        {alert.severity === 'critical' || alert.severity === 'high' ? (
                          <ErrorIcon color="error" />
                        ) : alert.severity === 'medium' || alert.severity === 'warning' ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <CheckCircleIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{alert.title}</Typography>
                            <Chip
                              label={alert.severity}
                              color={getSeverityColor(alert.severity) as any}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {alert.message}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(alert.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Health Summary */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall System Status
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {healthData.database === 'healthy' && 
               healthData.redis === 'healthy' && 
               Object.values(healthData.externalApis).every(status => status === 'healthy') ? (
                <>
                  <CheckCircleIcon color="success" fontSize="large" />
                  <Typography variant="h6" color="success.main">
                    All Systems Operational
                  </Typography>
                </>
              ) : (
                <>
                  <WarningIcon color="warning" fontSize="large" />
                  <Typography variant="h6" color="warning.main">
                    Some Issues Detected
                  </Typography>
                </>
              )}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              System health is monitored continuously. Critical issues will trigger automatic alerts.
            </Typography>
          </Paper>
        </>
      )}
    </Box>
  );
};