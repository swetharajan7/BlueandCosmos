import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { adminService } from '../../services/adminService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [businessMetrics, setBusinessMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsData, businessData] = await Promise.all([
        adminService.getAnalytics(timeRange),
        adminService.getBusinessMetrics()
      ]);
      setAnalytics(analyticsData);
      setBusinessMetrics(businessData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Analytics Dashboard
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="1d">Last Day</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
            <MenuItem value="1y">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Conversion Rate
              </Typography>
              <Typography variant="h4" color="primary">
                {businessMetrics?.conversionRate?.toFixed(1) || 0}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Users who created applications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                User Retention
              </Typography>
              <Typography variant="h4" color="success.main">
                {businessMetrics?.userRetention?.toFixed(1) || 0}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                30-day retention rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Processing Time
              </Typography>
              <Typography variant="h4" color="info.main">
                {analytics?.averageProcessingTime?.toFixed(1) || 0}h
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Recommendation completion
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {analytics?.submissionSuccessRate?.toFixed(1) || 0}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Submission success rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* User Activity Over Time */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Activity Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.userRegistrations || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  name="New Users"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* System Usage */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Users
            </Typography>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="primary">
                {businessMetrics?.systemUsage?.dailyActiveUsers || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Daily Active Users
              </Typography>
              
              <Typography variant="h4" color="secondary" sx={{ mt: 2 }}>
                {businessMetrics?.systemUsage?.weeklyActiveUsers || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Weekly Active Users
              </Typography>
              
              <Typography variant="h4" color="info.main" sx={{ mt: 2 }}>
                {businessMetrics?.systemUsage?.monthlyActiveUsers || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Monthly Active Users
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Application Submissions */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Application Submissions
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.applicationSubmissions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Program Type Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Program Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.programTypeDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ program, percent }) => `${program} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics?.programTypeDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Universities */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Universities by Applications
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>University</TableCell>
                    <TableCell align="right">Applications</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(businessMetrics?.topUniversities || []).slice(0, 10).map((uni: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{uni.name}</TableCell>
                      <TableCell align="right">{uni.applications}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Peak Usage Hours */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Peak Usage Hours
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessMetrics?.systemUsage?.peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(hour) => `${hour}:00`}
                  formatter={(value) => [value, 'Active Users']}
                />
                <Bar dataKey="usage" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Monthly Growth */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Growth Metrics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Monthly Growth
                    </Typography>
                    <Typography variant="h4" color={
                      (businessMetrics?.monthlyGrowth || 0) >= 0 ? 'success.main' : 'error.main'
                    }>
                      {businessMetrics?.monthlyGrowth >= 0 ? '+' : ''}
                      {businessMetrics?.monthlyGrowth?.toFixed(1) || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg Apps per User
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {businessMetrics?.averageApplicationsPerUser?.toFixed(1) || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg Recs per App
                    </Typography>
                    <Typography variant="h4" color="secondary">
                      {businessMetrics?.averageRecommendationsPerApplication?.toFixed(1) || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      University Distribution
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {analytics?.universityDistribution?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Universities
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};