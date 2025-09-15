/**
 * ExploreX Performance Monitoring System
 * 
 * Advanced performance tracking featuring:
 * - Real-time performance metrics collection
 * - Core Web Vitals monitoring (LCP, FID, CLS)
 * - Resource loading performance analysis
 * - Memory usage and leak detection
 * - Network performance optimization
 */

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = new Map();
    this.alerts = [];
    
    this.config = {
      enableCoreWebVitals: true,
      enableResourceMonitoring: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      enableUserTimingAPI: true,
      alertThresholds: {
        lcp: 2500, // ms
        fid: 100,  // ms
        cls: 0.1,  // score
        memoryUsage: 0.8, // 80% of heap limit
        slowResource: 3000, // ms
        slowAPI: 5000 // ms
      },
      monitoringInterval: 30000, // 30 seconds
      maxMetricsHistory: 1000
    };
    
    this.coreWebVitals = {
      lcp: null,
      fid: null,
      cls: null
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize performance monitoring
   */
  async initialize() {
    try {
      console.log('⚡ Initializing Performance Monitor...');
      
      // Setup Core Web Vitals monitoring
      if (this.config.enableCoreWebVitals) {
        this.setupCoreWebVitals();
      }
      
      // Setup resource monitoring
      if (this.config.enableResourceMonitoring) {
        this.setupResourceMonitoring();
      }
      
      // Setup memory monitoring
      if (this.config.enableMemoryMonitoring) {
        this.setupMemoryMonitoring();
      }
      
      // Setup network monitoring
      if (this.config.enableNetworkMonitoring) {
        this.setupNetworkMonitoring();
      }
      
      // Setup User Timing API
      if (this.config.enableUserTimingAPI) {
        this.setupUserTimingAPI();
      }
      
      // Setup periodic monitoring
      this.setupPeriodicMonitoring();
      
      // Setup thresholds
      this.setupThresholds();
      
      this.isInitialized = true;
      console.log('✅ Performance Monitor initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Performance Monitor:', error);
      throw error;
    }
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  setupCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.coreWebVitals.lcp = lastEntry.startTime;
        this.recordMetric('lcp', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url
        });
        
        this.checkThreshold('lcp', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.coreWebVitals.fid = entry.processingStart - entry.startTime;
          this.recordMetric('fid', this.coreWebVitals.fid, {
            eventType: entry.name,
            target: entry.target?.tagName
          });
          
          this.checkThreshold('fid', this.coreWebVitals.fid);
        }
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      let clsEntries = [];
      
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        }
        
        this.coreWebVitals.cls = clsValue;
        this.recordMetric('cls', clsValue, {
          entryCount: clsEntries.length
        });
        
        this.checkThreshold('cls', clsValue);
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }

    // Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        this.recordMetric('ttfb', ttfb);
        this.checkThreshold('ttfb', ttfb);
      }
    });
  }

  /**
   * Setup resource monitoring
   */
  setupResourceMonitoring() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.responseEnd - entry.startTime;
          
          this.recordMetric('resource_load_time', duration, {
            name: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize,
            cached: entry.transferSize === 0
          });
          
          // Alert on slow resources
          if (duration > this.config.alertThresholds.slowResource) {
            this.createAlert('slow_resource', {
              resource: entry.name,
              duration,
              type: entry.initiatorType
            });
          }
          
          // Track resource types
          this.recordMetric(`resource_${entry.initiatorType}`, duration, {
            name: entry.name,
            size: entry.transferSize
          });
        }
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      const monitorMemory = () => {
        const memory = performance.memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        this.recordMetric('memory_used', memory.usedJSHeapSize, {
          unit: 'bytes',
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usageRatio
        });
        
        this.recordMetric('memory_usage_ratio', usageRatio);
        
        // Alert on high memory usage
        if (usageRatio > this.config.alertThresholds.memoryUsage) {
          this.createAlert('high_memory_usage', {
            usageRatio,
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      };
      
      // Monitor immediately and then periodically
      monitorMemory();
      setInterval(monitorMemory, this.config.monitoringInterval);
    }
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const recordConnectionInfo = () => {
        this.recordMetric('network_effective_type', 0, {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      
      recordConnectionInfo();
      connection.addEventListener('change', recordConnectionInfo);
    }

    // Monitor fetch performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordMetric('api_response_time', duration, {
          url: typeof url === 'string' ? url : url.url,
          status: response.status,
          ok: response.ok
        });
        
        // Alert on slow API calls
        if (duration > this.config.alertThresholds.slowAPI) {
          this.createAlert('slow_api', {
            url: typeof url === 'string' ? url : url.url,
            duration,
            status: response.status
          });
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.recordMetric('api_error', duration, {
          url: typeof url === 'string' ? url : url.url,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  /**
   * Setup User Timing API
   */
  setupUserTimingAPI() {
    // Provide convenient methods for custom timing
    window.ExploreXPerformance = {
      mark: (name) => {
        if ('performance' in window && 'mark' in performance) {
          performance.mark(name);
        }
      },
      
      measure: (name, startMark, endMark) => {
        if ('performance' in window && 'measure' in performance) {
          try {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name, 'measure')[0];
            
            this.recordMetric('custom_timing', measure.duration, {
              name,
              startMark,
              endMark
            });
            
            return measure.duration;
          } catch (error) {
            console.warn('Failed to create performance measure:', error);
          }
        }
        return null;
      }
    };

    // Monitor existing user timing entries
    if ('PerformanceObserver' in window) {
      const userTimingObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.recordMetric('user_timing', entry.duration, {
              name: entry.name,
              startTime: entry.startTime
            });
          }
        }
      });
      
      try {
        userTimingObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('userTiming', userTimingObserver);
      } catch (error) {
        console.warn('User timing observer not supported:', error);
      }
    }
  }

  /**
   * Setup periodic monitoring
   */
  setupPeriodicMonitoring() {
    setInterval(() => {
      this.collectPeriodicMetrics();
    }, this.config.monitoringInterval);
  }

  /**
   * Collect periodic metrics
   */
  collectPeriodicMetrics() {
    // Frame rate monitoring
    this.measureFrameRate();
    
    // DOM complexity
    this.measureDOMComplexity();
    
    // Event listener count
    this.measureEventListeners();
    
    // Local storage usage
    this.measureStorageUsage();
  }

  /**
   * Measure frame rate
   */
  measureFrameRate() {
    let frameCount = 0;
    let startTime = performance.now();
    
    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - startTime >= 1000) {
        this.recordMetric('frame_rate', frameCount, { unit: 'fps' });
        frameCount = 0;
        startTime = currentTime;
      }
      
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
  }

  /**
   * Measure DOM complexity
   */
  measureDOMComplexity() {
    const elementCount = document.querySelectorAll('*').length;
    const depth = this.calculateDOMDepth(document.body);
    
    this.recordMetric('dom_elements', elementCount);
    this.recordMetric('dom_depth', depth);
  }

  /**
   * Calculate DOM depth
   */
  calculateDOMDepth(element, depth = 0) {
    let maxDepth = depth;
    
    for (const child of element.children) {
      const childDepth = this.calculateDOMDepth(child, depth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
    
    return maxDepth;
  }

  /**
   * Measure event listeners (approximation)
   */
  measureEventListeners() {
    // This is an approximation - actual count is hard to determine
    const elements = document.querySelectorAll('*');
    let listenerCount = 0;
    
    elements.forEach(element => {
      // Check for common event attributes
      const eventAttrs = ['onclick', 'onload', 'onchange', 'onsubmit'];
      eventAttrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
          listenerCount++;
        }
      });
    });
    
    this.recordMetric('event_listeners', listenerCount);
  }

  /**
   * Measure storage usage
   */
  measureStorageUsage() {
    try {
      let localStorageSize = 0;
      let sessionStorageSize = 0;
      
      // Calculate localStorage size
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }
      
      // Calculate sessionStorage size
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
      }
      
      this.recordMetric('local_storage_size', localStorageSize, { unit: 'characters' });
      this.recordMetric('session_storage_size', sessionStorageSize, { unit: 'characters' });
      
    } catch (error) {
      console.warn('Failed to measure storage usage:', error);
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metric = {
      value,
      timestamp: Date.now(),
      metadata
    };
    
    this.metrics.get(name).push(metric);
    
    // Maintain history limit
    const history = this.metrics.get(name);
    if (history.length > this.config.maxMetricsHistory) {
      history.splice(0, history.length - this.config.maxMetricsHistory);
    }
    
    // Send to analytics if available
    if (window.ExploreXAnalytics?.AnalyticsManager) {
      window.ExploreXAnalytics.AnalyticsManager.prototype.trackPerformance?.(name, value, metadata);
    }
  }

  /**
   * Setup thresholds
   */
  setupThresholds() {
    for (const [metric, threshold] of Object.entries(this.config.alertThresholds)) {
      this.thresholds.set(metric, threshold);
    }
  }

  /**
   * Check threshold and create alert if exceeded
   */
  checkThreshold(metricName, value) {
    const threshold = this.thresholds.get(metricName);
    if (threshold && value > threshold) {
      this.createAlert('threshold_exceeded', {
        metric: metricName,
        value,
        threshold
      });
    }
  }

  /**
   * Create performance alert
   */
  createAlert(type, data) {
    const alert = {
      id: this.generateAlertId(),
      type,
      data,
      timestamp: Date.now(),
      severity: this.getAlertSeverity(type, data)
    };
    
    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    console.warn(`⚠️ Performance Alert [${type}]:`, data);
    
    // Send to error handling system if available
    if (window.ExploreXErrorHandling?.ErrorHandlingManager) {
      const error = new Error(`Performance alert: ${type}`);
      error.performanceData = data;
      window.ExploreXErrorHandling.ErrorHandlingManager.prototype.handleError?.(error, {
        type: 'performance_alert',
        alertType: type,
        data
      });
    }
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type, data) {
    const severityMap = {
      'threshold_exceeded': 'medium',
      'slow_resource': 'low',
      'slow_api': 'medium',
      'high_memory_usage': 'high'
    };
    
    return severityMap[type] || 'low';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      coreWebVitals: { ...this.coreWebVitals },
      metrics: {},
      alerts: this.alerts.slice(-10), // Last 10 alerts
      timestamp: Date.now()
    };
    
    // Calculate metric summaries
    for (const [name, history] of this.metrics) {
      if (history.length > 0) {
        const values = history.map(h => h.value);
        const recent = history.slice(-10); // Last 10 values
        
        summary.metrics[name] = {
          current: values[values.length - 1],
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          trend: this.calculateTrend(recent),
          count: history.length
        };
      }
    }
    
    return summary;
  }

  /**
   * Calculate trend for recent values
   */
  calculateTrend(recentValues) {
    if (recentValues.length < 2) return 'stable';
    
    const first = recentValues[0].value;
    const last = recentValues[recentValues.length - 1].value;
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXPerformanceMonitor = {
  PerformanceMonitor
};

console.log('⚡ ExploreX Performance Monitor loaded');