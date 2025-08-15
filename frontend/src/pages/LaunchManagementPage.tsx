import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import LaunchMonitoringDashboard from '../components/admin/LaunchMonitoringDashboard';
import MaintenanceManagement from '../components/admin/MaintenanceManagement';

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
      id={`launch-tabpanel-${index}`}
      aria-labelledby={`launch-tab-${index}`}
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
    id: `launch-tab-${index}`,
    'aria-controls': `launch-tabpanel-${index}`,
  };
}

const LaunchManagementPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Launch Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Monitor system performance, manage maintenance windows, and oversee the soft launch process.
        </Typography>

        <Paper sx={{ width: '100%', mt: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="launch management tabs">
              <Tab label="Launch Monitoring" {...a11yProps(0)} />
              <Tab label="Maintenance Management" {...a11yProps(1)} />
            </Tabs>
          </Box>
          
          <TabPanel value={tabValue} index={0}>
            <LaunchMonitoringDashboard />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <MaintenanceManagement />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default LaunchManagementPage;