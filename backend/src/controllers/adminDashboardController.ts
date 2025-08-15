import { Request, Response } from 'express';
import { AdminDashboardService } from '../services/adminDashboardService';
import { UserManagementService } from '../services/userManagementService';
import { SystemConfigService } from '../services/systemConfigService';
import { BackupService } from '../services/backupService';

export class AdminDashboardController {
  private adminDashboardService: AdminDashboardService;
  private userManagementService: UserManagementService;
  private systemConfigService: SystemConfigService;
  private backupService: BackupService;

  constructor() {
    this.adminDashboardService = new AdminDashboardService();
    this.userManagementService = new UserManagementService();
    this.systemConfigService = new SystemConfigService();
    this.backupService = new BackupService();
  }

  // System Overview Dashboard
  async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.adminDashboardService.getSystemOverview();
      res.json(overview);
    } catch (error) {
      console.error('Error fetching system overview:', error);
      res.status(500).json({ error: 'Failed to fetch system overview' });
    }
  }

  // Analytics and Metrics
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '7d' } = req.query;
      const analytics = await this.adminDashboardService.getAnalytics(timeRange as string);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  // Business Metrics
  async getBusinessMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const metrics = await this.adminDashboardService.getBusinessMetrics(
        startDate as string,
        endDate as string
      );
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      res.status(500).json({ error: 'Failed to fetch business metrics' });
    }
  }

  // User Management
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;
      const users = await this.userManagementService.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        role: role as string,
        status: status as string,
        search: search as string
      });
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const userDetails = await this.userManagementService.getUserDetails(userId);
      res.json(userDetails);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;
      const result = await this.userManagementService.updateUserStatus(userId, status, reason);
      res.json(result);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await this.userManagementService.resetUserPassword(userId);
      res.json(result);
    } catch (error) {
      console.error('Error resetting user password:', error);
      res.status(500).json({ error: 'Failed to reset user password' });
    }
  }

  // System Configuration
  async getSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await this.systemConfigService.getSystemConfig();
      res.json(config);
    } catch (error) {
      console.error('Error fetching system config:', error);
      res.status(500).json({ error: 'Failed to fetch system config' });
    }
  }

  async updateSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;
      const result = await this.systemConfigService.updateSystemConfig(config);
      res.json(result);
    } catch (error) {
      console.error('Error updating system config:', error);
      res.status(500).json({ error: 'Failed to update system config' });
    }
  }

  // Backup and Recovery
  async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'full' } = req.body;
      const backup = await this.backupService.createBackup(type);
      res.json(backup);
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  async getBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = await this.backupService.getBackups();
      res.json(backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  }

  async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params;
      const result = await this.backupService.restoreBackup(backupId);
      res.json(result);
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  }

  // System Health
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.adminDashboardService.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  }

  // Application Management
  async getApplications(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, status, university } = req.query;
      const applications = await this.adminDashboardService.getApplications({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        university: university as string
      });
      res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }

  async getApplicationDetails(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const details = await this.adminDashboardService.getApplicationDetails(applicationId);
      res.json(details);
    } catch (error) {
      console.error('Error fetching application details:', error);
      res.status(500).json({ error: 'Failed to fetch application details' });
    }
  }
}