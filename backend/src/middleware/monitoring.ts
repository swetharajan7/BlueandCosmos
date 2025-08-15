import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metricsService';
import { cloudWatchLogger } from '../config/cloudwatch';
import { sentryService } from '../config/sentry';
import { newRelicService } from '../config/newrelic';

export interface MonitoringRequest extends Request {
  startTime?: number;
  requestId?: string;
}

export const requestTracking = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  req.startTime = Date.now();
  req.requestId = generateRequestId();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Set user context for monitoring
  if (req.user) {
    sentryService.setUser({
      id: req.user.id,
      email: req.user.email
    });
    
    newRelicService.addCustomAttribute('user.id', req.user.id);
    newRelicService.addCustomAttribute('user.role', req.user.role);
  }
  
  // Add request context
  sentryService.setContext('request', {
    id: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
};

export const responseTracking = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;
    const success = statusCode < 400;
    
    // Record metrics
    metricsService.recordMetric('http.request.duration', responseTime, 'milliseconds', {
      method: req.method,
      route: req.route?.path || req.path,
      status: statusCode.toString()
    });
    
    metricsService.recordMetric('http.request.count', 1, 'count', {
      method: req.method,
      route: req.route?.path || req.path,
      status: statusCode.toString(),
      success: success.toString()
    });
    
    // Log request details
    cloudWatchLogger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    });
    
    // Record performance in New Relic
    newRelicService.recordMetric(`Custom/HTTP/${req.method}${req.route?.path || req.path}`, responseTime);
    
    // Add breadcrumb for Sentry
    sentryService.addBreadcrumb({
      message: `${req.method} ${req.url}`,
      category: 'http',
      level: success ? 'info' : 'error',
      data: {
        method: req.method,
        url: req.url,
        statusCode,
        responseTime
      }
    });
    
    // Log slow requests
    if (responseTime > 1000) {
      cloudWatchLogger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        responseTime,
        threshold: 1000
      });
      
      sentryService.captureMessage(
        `Slow request: ${req.method} ${req.url} took ${responseTime}ms`,
        'warning'
      );
    }
    
    // Log errors
    if (!success) {
      cloudWatchLogger.error('HTTP Error', new Error(`HTTP ${statusCode}`), {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode,
        responseTime
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

export const errorTracking = (error: Error, req: MonitoringRequest, res: Response, next: NextFunction): void => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  // Record error metrics
  metricsService.recordMetric('http.error.count', 1, 'count', {
    method: req.method,
    route: req.route?.path || req.path,
    error: error.name
  });
  
  // Log error
  cloudWatchLogger.error('Unhandled error', error, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    responseTime,
    userId: req.user?.id,
    stack: error.stack
  });
  
  // Capture in Sentry
  sentryService.withScope((scope) => {
    scope.setTag('request_id', req.requestId || 'unknown');
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    sentryService.captureException(error);
  });
  
  // Record in New Relic
  newRelicService.noticeError(error, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userId: req.user?.id
  });
  
  next(error);
};

export const rateLimitTracking = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  const rateLimitLimit = res.get('X-RateLimit-Limit');
  
  if (rateLimitRemaining && rateLimitLimit) {
    const remaining = parseInt(rateLimitRemaining);
    const limit = parseInt(rateLimitLimit);
    const usage = ((limit - remaining) / limit) * 100;
    
    metricsService.recordMetric('rate_limit.usage', usage, 'percentage', {
      endpoint: req.route?.path || req.path,
      userId: req.user?.id || 'anonymous'
    });
    
    // Alert if rate limit usage is high
    if (usage > 80) {
      cloudWatchLogger.warn('High rate limit usage', {
        requestId: req.requestId,
        endpoint: req.route?.path || req.path,
        usage,
        remaining,
        limit,
        userId: req.user?.id
      });
    }
  }
  
  next();
};

export const businessMetricsTracking = (req: MonitoringRequest, res: Response, next: NextFunction): void => {
  // Track business-specific events based on the endpoint
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (res.statusCode < 400) {
      const route = req.route?.path;
      const method = req.method;
      
      // Track specific business events
      if (method === 'POST') {
        if (route?.includes('/applications')) {
          metricsService.recordUserAction('application_created', req.user?.id);
        } else if (route?.includes('/recommendations')) {
          metricsService.recordUserAction('recommendation_created', req.user?.id);
        } else if (route?.includes('/users/register')) {
          metricsService.recordUserAction('user_registered', req.user?.id);
        } else if (route?.includes('/auth/login')) {
          metricsService.recordUserAction('user_login', req.user?.id);
        }
      }
      
      if (method === 'PUT' && route?.includes('/recommendations') && route?.includes('/submit')) {
        metricsService.recordUserAction('recommendation_submitted', req.user?.id);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Combined middleware for easy setup
export const setupMonitoring = () => [
  requestTracking,
  responseTracking,
  rateLimitTracking,
  businessMetricsTracking
];