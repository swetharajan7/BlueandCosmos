import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  sampleRate: number;
  tracesSampleRate: number;
  enabled: boolean;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
}

export const sentryConfig: SentryConfig = {
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  enabled: process.env.NODE_ENV === 'production' && !!process.env.SENTRY_DSN,
  beforeSend: (event) => {
    // Filter out sensitive information
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  }
};

export class SentryService {
  private static instance: SentryService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): SentryService {
    if (!SentryService.instance) {
      SentryService.instance = new SentryService();
    }
    return SentryService.instance;
  }

  public initialize(app?: Express): void {
    if (this.initialized || !sentryConfig.enabled) {
      return;
    }

    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment,
      release: sentryConfig.release,
      sampleRate: sentryConfig.sampleRate,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      beforeSend: sentryConfig.beforeSend,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        ...(app ? [
          new Tracing.Integrations.Express({ app }),
          new Tracing.Integrations.Postgres(),
          new Tracing.Integrations.Redis()
        ] : [])
      ]
    });

    if (app) {
      // RequestHandler creates a separate execution context using domains
      app.use(Sentry.Handlers.requestHandler());
      // TracingHandler creates a trace for every incoming request
      app.use(Sentry.Handlers.tracingHandler());
    }

    this.initialized = true;
  }

  public captureException(error: Error, context?: Sentry.Contexts): string {
    if (!sentryConfig.enabled) {
      return '';
    }

    return Sentry.captureException(error, {
      contexts: context
    });
  }

  public captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any): string {
    if (!sentryConfig.enabled) {
      return '';
    }

    return Sentry.captureMessage(message, level);
  }

  public addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!sentryConfig.enabled) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  public setUser(user: Sentry.User): void {
    if (!sentryConfig.enabled) {
      return;
    }

    Sentry.setUser(user);
  }

  public setTag(key: string, value: string): void {
    if (!sentryConfig.enabled) {
      return;
    }

    Sentry.setTag(key, value);
  }

  public setContext(key: string, context: any): void {
    if (!sentryConfig.enabled) {
      return;
    }

    Sentry.setContext(key, context);
  }

  public withScope(callback: (scope: Sentry.Scope) => void): void {
    if (!sentryConfig.enabled) {
      return;
    }

    Sentry.withScope(callback);
  }

  public startTransaction(context: Sentry.TransactionContext): Sentry.Transaction {
    if (!sentryConfig.enabled) {
      return {} as Sentry.Transaction;
    }

    return Sentry.startTransaction(context);
  }

  public getErrorHandler(): any {
    if (!sentryConfig.enabled) {
      return (error: any, req: any, res: any, next: any) => next(error);
    }

    return Sentry.Handlers.errorHandler();
  }

  public captureUserAction(userId: string, action: string, resource: string, metadata?: any): void {
    this.addBreadcrumb({
      message: `User ${userId} performed ${action} on ${resource}`,
      category: 'user.action',
      level: 'info',
      data: {
        userId,
        action,
        resource,
        ...metadata
      }
    });
  }

  public capturePerformanceIssue(operation: string, duration: number, threshold: number): void {
    if (duration > threshold) {
      this.captureMessage(
        `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        'warning'
      );
    }
  }

  public captureSecurityEvent(event: string, userId?: string, ipAddress?: string, severity: Sentry.SeverityLevel = 'warning'): void {
    this.withScope((scope) => {
      scope.setTag('security_event', true);
      scope.setContext('security', {
        event,
        userId,
        ipAddress,
        timestamp: new Date().toISOString()
      });
      
      this.captureMessage(`Security event: ${event}`, severity);
    });
  }
}

export const sentryService = SentryService.getInstance();