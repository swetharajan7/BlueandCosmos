import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tab,
  Tabs,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import { SystemOverview } from '../components/admin/SystemOverview';
import { UserManagement } from '../components/admin/UserManagement';
import { ApplicationManagement } from '../components/admin/ApplicationManagement';
import { SystemConfiguration } from '../components/admin/SystemConfiguration';
import { BackupManagement } from '../components/admin/BackupManagement';
import { AnalyticsDashboard } from '../components/admin/AnalyticsDashboard';
import { SystemHealth } from '../components/admin/SystemHealth';
import { adminService } from '../services/adminService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export const AdminDashboardPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [systemOverview, setSystemOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemOverview();
  }, []);

  const loadSystemOverview = async () => {
    try {
      setLoading(true);
      const overview = await adminService.getSystemOverview();
      setSystemOverview(overview);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load system overview');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Quick Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {systemOverview?.totalUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4">
                {systemOverview?.totalApplications || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Users
              </Typography>
              <Typography variant="h4">
                {systemOverview?.activeUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                System Health
              </Typography>
              <Typography variant="h4" color={
                systemOverview?.databaseHealth === 'healthy' ? 'success.main' : 'error.main'
              }>
                {systemOverview?.databaseHealth === 'healthy' ? '✓' : '✗'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Admin Panel */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="admin dashboard tabs">
            <Tab label="Overview" {...a11yProps(0)} />
            <Tab label="Users" {...a11yProps(1)} />
            <Tab label="Applications" {...a11yProps(2)} />
            <Tab label="Analytics" {...a11yProps(3)} />
            <Tab label="System Health" {...a11yProps(4)} />
            <Tab label="Configuration" {...a11yProps(5)} />
            <Tab label="Backups" {...a11yProps(6)} />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <SystemOverview data={systemOverview} onRefresh={loadSystemOverview} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <UserManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ApplicationManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <AnalyticsDashboard />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <SystemHealth />
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <SystemConfiguration />
        </TabPanel>

        <TabPanel value={currentTab} index={6}>
          <BackupManagement />
        </TabPanel>
      </Paper>
    </Container>
  );
};