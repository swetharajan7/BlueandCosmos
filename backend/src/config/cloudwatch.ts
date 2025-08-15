import AWS from 'aws-sdk';
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

export interface CloudWatchConfig {
  logGroupName: string;
  logStreamName: string;
  awsRegion: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  retentionInDays: number;
  enabled: boolean;
}

export const cloudWatchConfig: CloudWatchConfig = {
  logGroupName: process.env.CLOUDWATCH_LOG_GROUP || '/aws/stellarrec/backend',
  logStreamName: process.env.CLOUDWATCH_LOG_STREAM || `backend-${new Date().toISOString().split('T')[0]}`,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  retentionInDays: parseInt(process.env.CLOUDWATCH_RETENTION_DAYS || '30'),
  enabled: process.env.NODE_ENV === 'production'
};

// Configure AWS SDK
if (cloudWatchConfig.awsAccessKeyId && cloudWatchConfig.awsSecretAccessKey) {
  AWS.config.update({
    accessKeyId: cloudWatchConfig.awsAccessKeyId,
    secretAccessKey: cloudWatchConfig.awsSecretAccessKey,
    region: cloudWatchConfig.awsRegion
  });
}

export class CloudWatchLogger {
  private logger: winston.Logger;
  private static instance: CloudWatchLogger;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'stellarrec-backend',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      },
      transports: [
        // Console transport for local development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Add CloudWatch transport for production
    if (cloudWatchConfig.enabled) {
      this.logger.add(new WinstonCloudWatch({
        logGroupName: cloudWatchConfig.logGroupName,
        logStreamName: cloudWatchConfig.logStreamName,
        awsRegion: cloudWatchConfig.awsRegion,
        retentionInDays: cloudWatchConfig.retentionInDays,
        jsonMessage: true,
        messageFormatter: (item: any) => {
          return JSON.stringify({
            timestamp: item.timestamp,
            level: item.level,
            message: item.message,
            meta: item.meta,
            stack: item.stack
          });
        }
      }));
    }
  }

  public static getInstance(): CloudWatchLogger {
    if (!CloudWatchLogger.instance) {
      CloudWatchLogger.instance = new CloudWatchLogger();
    }
    return CloudWatchLogger.instance;
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, { error: error?.stack, ...meta });
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public logUserAction(userId: string, action: string, resource: string, meta?: any): void {
    this.info('User action', {
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  public logSystemEvent(event: string, severity: 'info' | 'warn' | 'error', meta?: any): void {
    this.logger.log(severity, `System event: ${event}`, {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  public logPerformanceMetric(metric: string, value: number, unit: string, meta?: any): void {
    this.info('Performance metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  public logSecurityEvent(event: string, userId?: string, ipAddress?: string, meta?: any): void {
    this.warn('Security event', {
      event,
      userId,
      ipAddress,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }
}

export const cloudWatchLogger = CloudWatchLogger.getInstance();