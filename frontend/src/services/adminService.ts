import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class AdminService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // System Overview
  async getSystemOverview() {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/overview`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async getSystemHealth() {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/health`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Analytics
  async getAnalytics(timeRange: string = '7d') {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/analytics?timeRange=${timeRange}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async getBusinessMetrics(startDate?: string, endDate?: string) {
    let url = `${API_BASE_URL}/admin-dashboard/business-metrics`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, this.getAuthHeaders());
    return response.data;
  }

  // User Management
  async getUsers(filters: {
    page: number;
    limit: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/users?${params.toString()}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async getUserDetails(userId: string) {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/users/${userId}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async updateUserStatus(userId: string, status: string, reason?: string) {
    const response = await axios.put(
      `${API_BASE_URL}/admin-dashboard/users/${userId}/status`,
      { status, reason },
      this.getAuthHeaders()
    );
    return response.data;
  }

  async resetUserPassword(userId: string) {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/users/${userId}/reset-password`,
      {},
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Application Management
  async getApplications(filters: {
    page: number;
    limit: number;
    status?: string;
    university?: string;
  }) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/applications?${params.toString()}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async getApplicationDetails(applicationId: string) {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/applications/${applicationId}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // System Configuration
  async getSystemConfig() {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/config`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async updateSystemConfig(config: any) {
    const response = await axios.put(
      `${API_BASE_URL}/admin-dashboard/config`,
      { config },
      this.getAuthHeaders()
    );
    return response.data;
  }

  async validateConfig(config: any) {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/config/validate`,
      { config },
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Backup Management
  async getBackups() {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/backups`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async createBackup(type: string = 'full') {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/backups`,
      { type },
      this.getAuthHeaders()
    );
    return response.data;
  }

  async restoreBackup(backupId: string) {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/backups/${backupId}/restore`,
      {},
      this.getAuthHeaders()
    );
    return response.data;
  }

  async deleteBackup(backupId: string) {
    const response = await axios.delete(
      `${API_BASE_URL}/admin-dashboard/backups/${backupId}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // System Alerts
  async getSystemAlerts(filters?: {
    severity?: string;
    resolved?: boolean;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/alerts?${params.toString()}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  async resolveAlert(alertId: string) {
    const response = await axios.put(
      `${API_BASE_URL}/admin-dashboard/alerts/${alertId}/resolve`,
      {},
      this.getAuthHeaders()
    );
    return response.data;
  }

  // System Metrics
  async getSystemMetrics(metricName?: string, timeRange: string = '24h') {
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);
    if (metricName) params.append('metricName', metricName);

    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/metrics?${params.toString()}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/audit-logs?${params.toString()}`,
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Export Data
  async exportUsers(format: 'csv' | 'json' = 'csv') {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/export/users?format=${format}`,
      {
        ...this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
    return response.data;
  }

  async exportApplications(format: 'csv' | 'json' = 'csv') {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/export/applications?format=${format}`,
      {
        ...this.getAuthHeaders(),
        responseType: 'blob'
      }
    );
    return response.data;
  }

  // System Maintenance
  async enableMaintenanceMode(message?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/maintenance/enable`,
      { message },
      this.getAuthHeaders()
    );
    return response.data;
  }

  async disableMaintenanceMode() {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/maintenance/disable`,
      {},
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Cache Management
  async clearCache(cacheType?: string) {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/cache/clear`,
      { cacheType },
      this.getAuthHeaders()
    );
    return response.data;
  }

  // Database Operations
  async runDatabaseMaintenance() {
    const response = await axios.post(
      `${API_BASE_URL}/admin-dashboard/database/maintenance`,
      {},
      this.getAuthHeaders()
    );
    return response.data;
  }

  async getDatabaseStats() {
    const response = await axios.get(
      `${API_BASE_URL}/admin-dashboard/database/stats`,
      this.getAuthHeaders()
    );
    return response.data;
  }
}

export const adminService = new AdminService();