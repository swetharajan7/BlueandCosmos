import * as newrelic from 'newrelic';

export interface NewRelicConfig {
  appName: string;
  licenseKey: string;
  enabled: boolean;
  logLevel: string;
  distributedTracing: {
    enabled: boolean;
  };
  transactionTracer: {
    enabled: boolean;
    recordSql: string;
    explainThreshold: number;
  };
  errorCollector: {
    enabled: boolean;
    captureEvents: boolean;
  };
  browserMonitoring: {
    enabled: boolean;
  };
}

export const newRelicConfig: NewRelicConfig = {
  appName: process.env.NEW_RELIC_APP_NAME || 'StellarRec-Backend',
  licenseKey: process.env.NEW_RELIC_LICENSE_KEY || '',
  enabled: process.env.NODE_ENV === 'production',
  logLevel: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  distributedTracing: {
    enabled: true
  },
  transactionTracer: {
    enabled: true,
    recordSql: 'obfuscated',
    explainThreshold: 500
  },
  errorCollector: {
    enabled: true,
    captureEvents: true
  },
  browserMonitoring: {
    enabled: true
  }
};

export class NewRelicService {
  private static instance: NewRelicService;

  private constructor() {}

  public static getInstance(): NewRelicService {
    if (!NewRelicService.instance) {
      NewRelicService.instance = new NewRelicService();
    }
    return NewRelicService.instance;
  }

  public recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (newRelicConfig.enabled) {
      newrelic.recordCustomEvent(eventType, attributes);
    }
  }

  public recordMetric(name: string, value: number): void {
    if (newRelicConfig.enabled) {
      newrelic.recordMetric(name, value);
    }
  }

  public addCustomAttribute(key: string, value: string | number | boolean): void {
    if (newRelicConfig.enabled) {
      newrelic.addCustomAttribute(key, value);
    }
  }

  public noticeError(error: Error, customAttributes?: Record<string, any>): void {
    if (newRelicConfig.enabled) {
      newrelic.noticeError(error, customAttributes);
    }
  }

  public startWebTransaction(url: string, handle: () => Promise<any>): Promise<any> {
    if (newRelicConfig.enabled) {
      return newrelic.startWebTransaction(url, handle);
    }
    return handle();
  }

  public createTracer(name: string, callback: () => any): any {
    if (newRelicConfig.enabled) {
      return newrelic.createTracer(name, callback);
    }
    return callback();
  }

  public getBrowserTimingHeader(): string {
    if (newRelicConfig.enabled) {
      return newrelic.getBrowserTimingHeader();
    }
    return '';
  }
}

export const newRelicService = NewRelicService.getInstance();