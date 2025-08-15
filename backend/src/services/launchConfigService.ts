import { AppError } from '../utils/AppError';

interface LaunchConfiguration {
  softLaunchEnabled: boolean;
  maxUsers: number;
  enabledFeatures: string[];
  betaFeatures: string[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  monitoringSettings: {
    metricsInterval: number;
    alertingEnabled: boolean;
    emailNotifications: boolean;
    slackNotifications: boolean;
  };
  scalingSettings: {
    autoScalingEnabled: boolean;
    minInstances: number;
    maxInstances: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

class LaunchConfigService {
  private config: LaunchConfiguration = {
    softLaunchEnabled: true,
    maxUsers: 100,
    enabledFeatures: [
      'student_registration',
      'application_creation',
      'recommender_invitations',
      'ai_writing_assistant',
      'university_submissions',
      'email_notifications',
      'status_tracking'
    ],
    betaFeatures: [
      'advanced_analytics',
      'bulk_operations',
      'api_access'
    ],
    maintenanceMode: false,
    maintenanceMessage: 'System is currently under maintenance. Please try again later.',
    alertThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2 seconds
      successRate: 0.95, // 95%
      cpuUsage: 80, // 80%
      memoryUsage: 85 // 85%
    },
    monitoringSettings: {
      metricsInterval: 60000, // 1 minute
      alertingEnabled: true,
      emailNotifications: true,
      slackNotifications: false
    },
    scalingSettings: {
      autoScalingEnabled: true,
      minInstances: 2,
      maxInstances: 10,
      scaleUpThreshold: 75, // CPU/Memory %
      scaleDownThreshold: 30 // CPU/Memory %
    }
  };

  async getConfiguration(): Promise<LaunchConfiguration> {
    return { ...this.config };
  }

  async updateConfiguration(updates: Partial<LaunchConfiguration>): Promise<LaunchConfiguration> {
    try {
      this.config = { ...this.config, ...updates };
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Save to persistent storage (database/file)
      await this.saveConfiguration();
      
      console.log('Launch configuration updated:', updates);
      return { ...this.config };
    } catch (error) {
      console.error('Failed to update launch configuration:', error);
      throw new AppError('Configuration update failed', 500);
    }
  }

  async enableSoftLaunch(): Promise<void> {
    await this.updateConfiguration({ softLaunchEnabled: true });
  }

  async disableSoftLaunch(): Promise<void> {
    await this.updateConfiguration({ softLaunchEnabled: false });
  }

  async setUserLimit(maxUsers: number): Promise<void> {
    if (maxUsers < 1) {
      throw new AppError('User limit must be at least 1', 400);
    }
    await this.updateConfiguration({ maxUsers });
  }

  async enableFeature(feature: string): Promise<void> {
    if (!this.config.enabledFeatures.includes(feature)) {
      const enabledFeatures = [...this.config.enabledFeatures, feature];
      await this.updateConfiguration({ enabledFeatures });
    }
  }

  async disableFeature(feature: string): Promise<void> {
    const enabledFeatures = this.config.enabledFeatures.filter(f => f !== feature);
    await this.updateConfiguration({ enabledFeatures });
  }

  async enableBetaFeature(feature: string): Promise<void> {
    if (!this.config.betaFeatures.includes(feature)) {
      const betaFeatures = [...this.config.betaFeatures, feature];
      await this.updateConfiguration({ betaFeatures });
    }
  }

  async disableBetaFeature(feature: string): Promise<void> {
    const betaFeatures = this.config.betaFeatures.filter(f => f !== feature);
    await this.updateConfiguration({ betaFeatures });
  }

  async enableMaintenanceMode(message?: string): Promise<void> {
    const updates: Partial<LaunchConfiguration> = { maintenanceMode: true };
    if (message) {
      updates.maintenanceMessage = message;
    }
    await this.updateConfiguration(updates);
  }

  async disableMaintenanceMode(): Promise<void> {
    await this.updateConfiguration({ maintenanceMode: false });
  }

  async updateAlertThresholds(thresholds: Partial<LaunchConfiguration['alertThresholds']>): Promise<void> {
    const alertThresholds = { ...this.config.alertThresholds, ...thresholds };
    await this.updateConfiguration({ alertThresholds });
  }

  async updateMonitoringSettings(settings: Partial<LaunchConfiguration['monitoringSettings']>): Promise<void> {
    const monitoringSettings = { ...this.config.monitoringSettings, ...settings };
    await this.updateConfiguration({ monitoringSettings });
  }

  async updateScalingSettings(settings: Partial<LaunchConfiguration['scalingSettings']>): Promise<void> {
    const scalingSettings = { ...this.config.scalingSettings, ...settings };
    await this.updateConfiguration({ scalingSettings });
  }

  // Check methods
  async isSoftLaunchEnabled(): Promise<boolean> {
    return this.config.softLaunchEnabled;
  }

  async isFeatureEnabled(feature: string): Promise<boolean> {
    return this.config.enabledFeatures.includes(feature);
  }

  async isBetaFeatureEnabled(feature: string): Promise<boolean> {
    return this.config.betaFeatures.includes(feature);
  }

  async isMaintenanceModeEnabled(): Promise<boolean> {
    return this.config.maintenanceMode;
  }

  async getMaintenanceMessage(): Promise<string> {
    return this.config.maintenanceMessage;
  }

  async getUserLimit(): Promise<number> {
    return this.config.maxUsers;
  }

  async getAlertThresholds(): Promise<LaunchConfiguration['alertThresholds']> {
    return { ...this.config.alertThresholds };
  }

  async getMonitoringSettings(): Promise<LaunchConfiguration['monitoringSettings']> {
    return { ...this.config.monitoringSettings };
  }

  async getScalingSettings(): Promise<LaunchConfiguration['scalingSettings']> {
    return { ...this.config.scalingSettings };
  }

  // Launch readiness checks
  async checkLaunchReadiness(): Promise<{
    ready: boolean;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }> {
    const checks = [];

    // Check if essential features are enabled
    const essentialFeatures = [
      'student_registration',
      'application_creation',
      'recommender_invitations',
      'university_submissions'
    ];

    for (const feature of essentialFeatures) {
      const enabled = await this.isFeatureEnabled(feature);
      checks.push({
        name: `Feature: ${feature}`,
        status: (enabled ? 'pass' : 'fail') as 'pass' | 'fail' | 'warn',
        message: enabled ? 'Enabled' : 'Not enabled'
      });
    }

    // Check user limit
    const userLimit = await this.getUserLimit();
    checks.push({
      name: 'User Limit',
      status: (userLimit > 0 ? 'pass' : 'fail') as 'pass' | 'fail' | 'warn',
      message: `Set to ${userLimit} users`
    });

    // Check alert thresholds
    const thresholds = await this.getAlertThresholds();
    checks.push({
      name: 'Alert Thresholds',
      status: 'pass' as 'pass' | 'fail' | 'warn',
      message: `Error rate: ${thresholds.errorRate * 100}%, Response time: ${thresholds.responseTime}ms`
    });

    // Check monitoring settings
    const monitoring = await this.getMonitoringSettings();
    checks.push({
      name: 'Monitoring',
      status: (monitoring.alertingEnabled ? 'pass' : 'warn') as 'pass' | 'fail' | 'warn',
      message: monitoring.alertingEnabled ? 'Alerting enabled' : 'Alerting disabled'
    });

    // Check scaling settings
    const scaling = await this.getScalingSettings();
    checks.push({
      name: 'Auto Scaling',
      status: (scaling.autoScalingEnabled ? 'pass' : 'warn') as 'pass' | 'fail' | 'warn',
      message: scaling.autoScalingEnabled ? 'Auto scaling enabled' : 'Auto scaling disabled'
    });

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    
    return {
      ready: failedChecks === 0,
      checks
    };
  }

  // Configuration presets
  async applyDevelopmentPreset(): Promise<void> {
    await this.updateConfiguration({
      softLaunchEnabled: false,
      maxUsers: 1000,
      enabledFeatures: [
        'student_registration',
        'application_creation',
        'recommender_invitations',
        'ai_writing_assistant',
        'university_submissions',
        'email_notifications',
        'status_tracking',
        'advanced_analytics',
        'bulk_operations',
        'api_access'
      ],
      betaFeatures: [],
      alertThresholds: {
        errorRate: 0.1, // 10%
        responseTime: 5000, // 5 seconds
        successRate: 0.8, // 80%
        cpuUsage: 90, // 90%
        memoryUsage: 95 // 95%
      },
      monitoringSettings: {
        metricsInterval: 30000, // 30 seconds
        alertingEnabled: false,
        emailNotifications: false,
        slackNotifications: false
      }
    });
  }

  async applyStagingPreset(): Promise<void> {
    await this.updateConfiguration({
      softLaunchEnabled: true,
      maxUsers: 50,
      enabledFeatures: [
        'student_registration',
        'application_creation',
        'recommender_invitations',
        'ai_writing_assistant',
        'university_submissions',
        'email_notifications',
        'status_tracking'
      ],
      betaFeatures: [
        'advanced_analytics',
        'bulk_operations'
      ],
      alertThresholds: {
        errorRate: 0.03, // 3%
        responseTime: 1500, // 1.5 seconds
        successRate: 0.97, // 97%
        cpuUsage: 70, // 70%
        memoryUsage: 80 // 80%
      },
      monitoringSettings: {
        metricsInterval: 60000, // 1 minute
        alertingEnabled: true,
        emailNotifications: true,
        slackNotifications: false
      }
    });
  }

  async applyProductionPreset(): Promise<void> {
    await this.updateConfiguration({
      softLaunchEnabled: false,
      maxUsers: 10000,
      enabledFeatures: [
        'student_registration',
        'application_creation',
        'recommender_invitations',
        'ai_writing_assistant',
        'university_submissions',
        'email_notifications',
        'status_tracking',
        'advanced_analytics'
      ],
      betaFeatures: [
        'bulk_operations',
        'api_access'
      ],
      alertThresholds: {
        errorRate: 0.01, // 1%
        responseTime: 1000, // 1 second
        successRate: 0.99, // 99%
        cpuUsage: 75, // 75%
        memoryUsage: 80 // 80%
      },
      monitoringSettings: {
        metricsInterval: 30000, // 30 seconds
        alertingEnabled: true,
        emailNotifications: true,
        slackNotifications: true
      },
      scalingSettings: {
        autoScalingEnabled: true,
        minInstances: 3,
        maxInstances: 20,
        scaleUpThreshold: 70,
        scaleDownThreshold: 25
      }
    });
  }

  private async validateConfiguration(): Promise<void> {
    // Validate user limit
    if (this.config.maxUsers < 1) {
      throw new AppError('User limit must be at least 1', 400);
    }

    // Validate alert thresholds
    const { alertThresholds } = this.config;
    if (alertThresholds.errorRate < 0 || alertThresholds.errorRate > 1) {
      throw new AppError('Error rate threshold must be between 0 and 1', 400);
    }
    if (alertThresholds.responseTime < 100) {
      throw new AppError('Response time threshold must be at least 100ms', 400);
    }
    if (alertThresholds.successRate < 0 || alertThresholds.successRate > 1) {
      throw new AppError('Success rate threshold must be between 0 and 1', 400);
    }

    // Validate scaling settings
    const { scalingSettings } = this.config;
    if (scalingSettings.minInstances < 1) {
      throw new AppError('Minimum instances must be at least 1', 400);
    }
    if (scalingSettings.maxInstances < scalingSettings.minInstances) {
      throw new AppError('Maximum instances must be greater than minimum instances', 400);
    }
  }

  private async saveConfiguration(): Promise<void> {
    // In a real implementation, this would save to database or file
    // For now, we'll just log the configuration
    console.log('Saving launch configuration:', this.config);
  }
}

export const launchConfigService = new LaunchConfigService();