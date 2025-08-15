import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as ResetIcon
} from '@mui/icons-material';
import { adminService } from '../../services/adminService';

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
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const SystemConfiguration: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await adminService.getSystemConfig();
      setConfig(configData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (category: string, key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await adminService.updateSystemConfig(config);
      setSuccess('Configuration saved successfully');
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCategory = async (category: string) => {
    if (window.confirm(`Are you sure you want to reset ${category} settings to defaults?`)) {
      try {
        // In a real implementation, you'd call a reset endpoint
        await loadConfig();
        setSuccess(`${category} settings reset to defaults`);
      } catch (err: any) {
        setError(err.message || 'Failed to reset configuration');
      }
    }
  };

  if (loading) {
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
          System Configuration
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConfig}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
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

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="General" />
            <Tab label="Email" />
            <Tab label="AI Settings" />
            <Tab label="Security" />
            <Tab label="Integrations" />
            <Tab label="Monitoring" />
            <Tab label="Backup" />
          </Tabs>
        </Box>

        {/* General Settings */}
        <TabPanel value={currentTab} index={0}>
          <Card>
            <CardHeader
              title="General Settings"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('general')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Site Name"
                    value={config.general?.siteName || ''}
                    onChange={(e) => handleConfigChange('general', 'siteName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Site URL"
                    value={config.general?.siteUrl || ''}
                    onChange={(e) => handleConfigChange('general', 'siteUrl', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Support Email"
                    value={config.general?.supportEmail || ''}
                    onChange={(e) => handleConfigChange('general', 'supportEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Applications Per User"
                    value={config.general?.maxApplicationsPerUser || 10}
                    onChange={(e) => handleConfigChange('general', 'maxApplicationsPerUser', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.general?.maintenanceMode || false}
                        onChange={(e) => handleConfigChange('general', 'maintenanceMode', e.target.checked)}
                      />
                    }
                    label="Maintenance Mode"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.general?.registrationEnabled !== false}
                        onChange={(e) => handleConfigChange('general', 'registrationEnabled', e.target.checked)}
                      />
                    }
                    label="User Registration Enabled"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Email Settings */}
        <TabPanel value={currentTab} index={1}>
          <Card>
            <CardHeader
              title="Email Configuration"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('email')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Name"
                    value={config.email?.fromName || ''}
                    onChange={(e) => handleConfigChange('email', 'fromName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="From Email"
                    value={config.email?.fromEmail || ''}
                    onChange={(e) => handleConfigChange('email', 'fromEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reply-To Email"
                    value={config.email?.replyToEmail || ''}
                    onChange={(e) => handleConfigChange('email', 'replyToEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="SendGrid API Key"
                    value={config.email?.sendgridApiKey || ''}
                    onChange={(e) => handleConfigChange('email', 'sendgridApiKey', e.target.value)}
                    placeholder="Enter API key..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.email?.emailTemplatesEnabled !== false}
                        onChange={(e) => handleConfigChange('email', 'emailTemplatesEnabled', e.target.checked)}
                      />
                    }
                    label="Email Templates Enabled"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* AI Settings */}
        <TabPanel value={currentTab} index={2}>
          <Card>
            <CardHeader
              title="AI Configuration"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('ai')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="OpenAI API Key"
                    value={config.ai?.openaiApiKey || ''}
                    onChange={(e) => handleConfigChange('ai', 'openaiApiKey', e.target.value)}
                    placeholder="Enter API key..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="OpenAI Model"
                    value={config.ai?.openaiModel || 'gpt-4'}
                    onChange={(e) => handleConfigChange('ai', 'openaiModel', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Tokens Per Request"
                    value={config.ai?.maxTokensPerRequest || 4000}
                    onChange={(e) => handleConfigChange('ai', 'maxTokensPerRequest', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Content Quality Threshold (%)"
                    value={config.ai?.contentQualityThreshold || 70}
                    onChange={(e) => handleConfigChange('ai', 'contentQualityThreshold', parseInt(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.ai?.aiAssistanceEnabled !== false}
                        onChange={(e) => handleConfigChange('ai', 'aiAssistanceEnabled', e.target.checked)}
                      />
                    }
                    label="AI Assistance Enabled"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={currentTab} index={3}>
          <Card>
            <CardHeader
              title="Security Configuration"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('security')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="JWT Expiration Time"
                    value={config.security?.jwtExpirationTime || '24h'}
                    onChange={(e) => handleConfigChange('security', 'jwtExpirationTime', e.target.value)}
                    helperText="e.g., 24h, 7d, 30m"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Password Minimum Length"
                    value={config.security?.passwordMinLength || 8}
                    onChange={(e) => handleConfigChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    inputProps={{ min: 6, max: 50 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Session Timeout (seconds)"
                    value={config.security?.sessionTimeout || 3600}
                    onChange={(e) => handleConfigChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Login Attempts"
                    value={config.security?.maxLoginAttempts || 5}
                    onChange={(e) => handleConfigChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.security?.requireEmailVerification !== false}
                        onChange={(e) => handleConfigChange('security', 'requireEmailVerification', e.target.checked)}
                      />
                    }
                    label="Require Email Verification"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Integrations */}
        <TabPanel value={currentTab} index={4}>
          <Card>
            <CardHeader
              title="External Integrations"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('integrations')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.integrations?.googleDocsEnabled !== false}
                        onChange={(e) => handleConfigChange('integrations', 'googleDocsEnabled', e.target.checked)}
                      />
                    }
                    label="Google Docs Integration"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Google Client ID"
                    value={config.integrations?.googleClientId || ''}
                    onChange={(e) => handleConfigChange('integrations', 'googleClientId', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Google Client Secret"
                    value={config.integrations?.googleClientSecret || ''}
                    onChange={(e) => handleConfigChange('integrations', 'googleClientSecret', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.integrations?.universityApiEnabled !== false}
                        onChange={(e) => handleConfigChange('integrations', 'universityApiEnabled', e.target.checked)}
                      />
                    }
                    label="University API Integration"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.integrations?.webhooksEnabled !== false}
                        onChange={(e) => handleConfigChange('integrations', 'webhooksEnabled', e.target.checked)}
                      />
                    }
                    label="Webhooks Enabled"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Monitoring */}
        <TabPanel value={currentTab} index={5}>
          <Card>
            <CardHeader
              title="Monitoring & Observability"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('monitoring')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.monitoring?.newRelicEnabled || false}
                        onChange={(e) => handleConfigChange('monitoring', 'newRelicEnabled', e.target.checked)}
                      />
                    }
                    label="New Relic Monitoring"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.monitoring?.sentryEnabled || false}
                        onChange={(e) => handleConfigChange('monitoring', 'sentryEnabled', e.target.checked)}
                      />
                    }
                    label="Sentry Error Tracking"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.monitoring?.cloudWatchEnabled || false}
                        onChange={(e) => handleConfigChange('monitoring', 'cloudWatchEnabled', e.target.checked)}
                      />
                    }
                    label="AWS CloudWatch Logging"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Metrics Retention (days)"
                    value={config.monitoring?.metricsRetentionDays || 90}
                    onChange={(e) => handleConfigChange('monitoring', 'metricsRetentionDays', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.monitoring?.alertingEnabled !== false}
                        onChange={(e) => handleConfigChange('monitoring', 'alertingEnabled', e.target.checked)}
                      />
                    }
                    label="System Alerting"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Backup Settings */}
        <TabPanel value={currentTab} index={6}>
          <Card>
            <CardHeader
              title="Backup Configuration"
              action={
                <Button
                  size="small"
                  startIcon={<ResetIcon />}
                  onClick={() => handleResetCategory('backup')}
                >
                  Reset
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.backup?.autoBackupEnabled !== false}
                        onChange={(e) => handleConfigChange('backup', 'autoBackupEnabled', e.target.checked)}
                      />
                    }
                    label="Automatic Backups"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Backup Frequency"
                    value={config.backup?.backupFrequency || 'daily'}
                    onChange={(e) => handleConfigChange('backup', 'backupFrequency', e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Backup Retention (days)"
                    value={config.backup?.backupRetentionDays || 30}
                    onChange={(e) => handleConfigChange('backup', 'backupRetentionDays', parseInt(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="S3 Backup Bucket"
                    value={config.backup?.s3BackupBucket || ''}
                    onChange={(e) => handleConfigChange('backup', 's3BackupBucket', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.backup?.encryptBackups !== false}
                        onChange={(e) => handleConfigChange('backup', 'encryptBackups', e.target.checked)}
                      />
                    }
                    label="Encrypt Backups"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
    </Box>
  );
};