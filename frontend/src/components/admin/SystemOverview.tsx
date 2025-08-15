import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Email as EmailIcon
} from '@mui/icons-material';

interface SystemOverviewProps {
  data: any;
  onRefresh: () => void;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ data, onRefresh }) => {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          System Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* System Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Statistics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Total Users"
                    secondary={data?.totalUsers?.toLocaleString() || '0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Applications"
                    secondary={data?.totalApplications?.toLocaleString() || '0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Recommendations"
                    secondary={data?.totalRecommendations?.toLocaleString() || '0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Submissions"
                    secondary={data?.totalSubmissions?.toLocaleString() || '0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Active Users (24h)"
                    secondary={data?.activeUsers?.toLocaleString() || '0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="System Uptime"
                    secondary={formatUptime(data?.systemUptime || 0)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Database"
                    secondary={
                      <Chip
                        label={data?.databaseHealth || 'Unknown'}
                        color={getHealthColor(data?.databaseHealth) as any}
                        size="small"
                        icon={getHealthIcon(data?.databaseHealth)}
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CloudIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Redis Cache"
                    secondary={
                      <Chip
                        label={data?.redisHealth || 'Unknown'}
                        color={getHealthColor(data?.redisHealth) as any}
                        size="small"
                        icon={getHealthIcon(data?.redisHealth)}
                      />
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="External APIs"
                    secondary="Third-party service status"
                  />
                </ListItem>
                <ListItem sx={{ pl: 4 }}>
                  <ListItemText
                    primary="OpenAI"
                    secondary={
                      <Chip
                        label={data?.externalApiHealth?.openai || 'Unknown'}
                        color={getHealthColor(data?.externalApiHealth?.openai) as any}
                        size="small"
                        icon={getHealthIcon(data?.externalApiHealth?.openai)}
                      />
                    }
                  />
                </ListItem>
                <ListItem sx={{ pl: 4 }}>
                  <ListItemText
                    primary="Google Docs"
                    secondary={
                      <Chip
                        label={data?.externalApiHealth?.googleDocs || 'Unknown'}
                        color={getHealthColor(data?.externalApiHealth?.googleDocs) as any}
                        size="small"
                        icon={getHealthIcon(data?.externalApiHealth?.googleDocs)}
                      />
                    }
                  />
                </ListItem>
                <ListItem sx={{ pl: 4 }}>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="SendGrid"
                    secondary={
                      <Chip
                        label={data?.externalApiHealth?.sendgrid || 'Unknown'}
                        color={getHealthColor(data?.externalApiHealth?.sendgrid) as any}
                        size="small"
                        icon={getHealthIcon(data?.externalApiHealth?.sendgrid)}
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Resource Usage */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resource Usage
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Memory Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={65} // This would come from actual system metrics
                      sx={{ mt: 1, mb: 1 }}
                    />
                    <Typography variant="body2">
                      65% (2.1GB / 3.2GB)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      CPU Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={42}
                      sx={{ mt: 1, mb: 1 }}
                    />
                    <Typography variant="body2">
                      42%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Disk Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={78}
                      sx={{ mt: 1, mb: 1 }}
                    />
                    <Typography variant="body2">
                      78% (156GB / 200GB)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent System Activity
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="System backup completed successfully"
                    secondary="2 hours ago"
                  />
                  <Chip label="Success" color="success" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Database maintenance completed"
                    secondary="6 hours ago"
                  />
                  <Chip label="Maintenance" color="info" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="High memory usage detected"
                    secondary="1 day ago"
                  />
                  <Chip label="Warning" color="warning" size="small" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="System update applied"
                    secondary="3 days ago"
                  />
                  <Chip label="Update" color="info" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};