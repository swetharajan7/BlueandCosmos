/**
 * ExploreX Error Handling & Fallback Systems
 * 
 * Comprehensive error management featuring:
 * - Graceful degradation when APIs are unavailable
 * - User-friendly error messages with actionable suggestions
 * - Retry logic with exponential backoff for API calls
 * - Fallback data sources for critical functionality
 * - Error tracking and monitoring system
 */

// =============================================================================
// ERROR HANDLING MANAGER
// =============================================================================

class ErrorHandlingManager {
  constructor() {
    this.errorLog = [];
    this.fallbackStrategies = new Map();
    this.retryStrategies = new Map();
    this.errorNotificationQueue = [];
    
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      exponentialBackoffMultiplier: 2,
      errorLogMaxSize: 1000,
      enableErrorReporting: true,
      enableUserNotifications: true,
      fallbackTimeout: 5000
    };
    
    this.errorTypes = {
      NETWORK_ERROR: 'network_error',
      API_ERROR: 'api_error',
      VALIDATION_ERROR: 'validation_error',
      PERMISSION_ERROR: 'permission_error',
      TIMEOUT_ERROR: 'timeout_error',
      STORAGE_ERROR: 'storage_error',
      LOCATION_ERROR: 'location_error',
      UNKNOWN_ERROR: 'unknown_error'
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize error handling system
   */
  async initialize() {
    try {
      console.log('🛡️ Initializing Error Handling System...');
      
      // Setup global error handlers
      this.setupGlobalErrorHandlers();
      
      // Setup fallback strategies
      this.setupFallbackStrategies();
      
      // Setup retry strategies
      this.setupRetryStrategies();
      
      // Setup error monitoring
      this.setupErrorMonitoring();
      
      // Load error history
      await this.loadErrorHistory();
      
      this.isInitialized = true;
      console.log('✅ Error Handling System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Error Handling System:', error);
      throw error;
    }
  }

  /**
   * Handle error with appropriate strategy
   */
  async handleError(error, context = {}) {
    try {
      // Classify error
      const errorInfo = this.classifyError(error, context);
      
      // Log error
      this.logError(errorInfo);
      
      // Determine handling strategy
      const strategy = this.determineHandlingStrategy(errorInfo);
      
      // Execute strategy
      const result = await this.executeErrorStrategy(strategy, errorInfo);
      
      // Notify user if needed
      if (this.config.enableUserNotifications && strategy.notifyUser) {
        this.notifyUser(errorInfo, result);
      }
      
      return result;
      
    } catch (handlingError) {
      console.error('❌ Error in error handling:', handlingError);
      return this.getFallbackResult(error, context);
    }
  }

  /**
   * Classify error type and severity
   */
  classifyError(error, context) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      type: this.errorTypes.UNKNOWN_ERROR,
      severity: 'medium',
      recoverable: true,
      userFacing: true
    };

    // Classify by error type
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      errorInfo.type = this.errorTypes.NETWORK_ERROR;
      errorInfo.severity = 'high';
      errorInfo.recoverable = true;
    } else if (error.name === 'ValidationError' || error.message.includes('validation')) {
      errorInfo.type = this.errorTypes.VALIDATION_ERROR;
      errorInfo.severity = 'low';
      errorInfo.recoverable = true;
    } else if (error.name === 'PermissionError' || error.message.includes('permission')) {
      errorInfo.type = this.errorTypes.PERMISSION_ERROR;
      errorInfo.severity = 'medium';
      errorInfo.recoverable = false;
    } else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      errorInfo.type = this.errorTypes.TIMEOUT_ERROR;
      errorInfo.severity = 'medium';
      errorInfo.recoverable = true;
    } else if (error.message.includes('storage') || error.message.includes('quota')) {
      errorInfo.type = this.errorTypes.STORAGE_ERROR;
      errorInfo.severity = 'high';
      errorInfo.recoverable = false;
    } else if (error.message.includes('location') || error.message.includes('geolocation')) {
      errorInfo.type = this.errorTypes.LOCATION_ERROR;
      errorInfo.severity = 'medium';
      errorInfo.recoverable = false;
    }

    // Classify by HTTP status codes
    if (error.status) {
      if (error.status >= 500) {
        errorInfo.type = this.errorTypes.API_ERROR;
        errorInfo.severity = 'high';
        errorInfo.recoverable = true;
      } else if (error.status >= 400) {
        errorInfo.type = this.errorTypes.API_ERROR;
        errorInfo.severity = 'medium';
        errorInfo.recoverable = error.status !== 404;
      }
    }

    return errorInfo;
  }

  /**
   * Determine appropriate handling strategy
   */
  determineHandlingStrategy(errorInfo) {
    const strategy = {
      retry: false,
      fallback: false,
      notifyUser: false,
      logLevel: 'error',
      actions: []
    };

    switch (errorInfo.type) {
      case this.errorTypes.NETWORK_ERROR:
        strategy.retry = true;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['check_connection', 'use_cached_data'];
        break;

      case this.errorTypes.API_ERROR:
        strategy.retry = errorInfo.severity === 'high';
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['use_fallback_api', 'show_cached_results'];
        break;

      case this.errorTypes.TIMEOUT_ERROR:
        strategy.retry = true;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['increase_timeout', 'use_cached_data'];
        break;

      case this.errorTypes.PERMISSION_ERROR:
        strategy.retry = false;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['request_permission', 'show_permission_guide'];
        break;

      case this.errorTypes.STORAGE_ERROR:
        strategy.retry = false;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['clear_cache', 'use_memory_storage'];
        break;

      case this.errorTypes.LOCATION_ERROR:
        strategy.retry = false;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['manual_location_input', 'use_ip_location'];
        break;

      case this.errorTypes.VALIDATION_ERROR:
        strategy.retry = false;
        strategy.fallback = false;
        strategy.notifyUser = true;
        strategy.logLevel = 'warn';
        strategy.actions = ['show_validation_help'];
        break;

      default:
        strategy.retry = errorInfo.recoverable;
        strategy.fallback = true;
        strategy.notifyUser = true;
        strategy.actions = ['generic_fallback'];
    }

    return strategy;
  }

  /**
   * Execute error handling strategy
   */
  async executeErrorStrategy(strategy, errorInfo) {
    const result = {
      success: false,
      data: null,
      fallbackUsed: false,
      retryAttempted: false,
      userMessage: null,
      actions: []
    };

    // Attempt retry if strategy allows
    if (strategy.retry && this.shouldRetry(errorInfo)) {
      try {
        result.retryAttempted = true;
        const retryResult = await this.retryOperation(errorInfo);
        
        if (retryResult.success) {
          result.success = true;
          result.data = retryResult.data;
          return result;
        }
      } catch (retryError) {
        console.warn('Retry failed:', retryError.message);
      }
    }

    // Use fallback if strategy allows
    if (strategy.fallback) {
      try {
        const fallbackResult = await this.useFallback(errorInfo);
        result.success = fallbackResult.success;
        result.data = fallbackResult.data;
        result.fallbackUsed = true;
      } catch (fallbackError) {
        console.warn('Fallback failed:', fallbackError.message);
      }
    }

    // Execute strategy actions
    for (const action of strategy.actions) {
      try {
        const actionResult = await this.executeAction(action, errorInfo);
        result.actions.push({ action, result: actionResult });
      } catch (actionError) {
        console.warn(`Action ${action} failed:`, actionError.message);
      }
    }

    // Generate user message
    result.userMessage = this.generateUserMessage(errorInfo, result);

    return result;
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, { type: 'unhandled_promise' });
      event.preventDefault();
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error, { 
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        console.error('Resource loading error:', event.target.src || event.target.href);
        this.handleError(new Error('Resource loading failed'), {
          type: 'resource_error',
          resource: event.target.src || event.target.href,
          element: event.target.tagName
        });
      }
    }, true);
  }

  /**
   * Setup fallback strategies
   */
  setupFallbackStrategies() {
    // API fallback strategies
    this.fallbackStrategies.set('api_experiences', async () => {
      return this.getCachedExperiences() || this.getStaticExperiences();
    });

    this.fallbackStrategies.set('api_weather', async () => {
      return this.getCachedWeather() || this.getDefaultWeather();
    });

    this.fallbackStrategies.set('api_events', async () => {
      return this.getCachedEvents() || this.getStaticEvents();
    });

    this.fallbackStrategies.set('api_location', async () => {
      return this.getIPLocation() || this.getDefaultLocation();
    });

    // Service fallback strategies
    this.fallbackStrategies.set('geolocation', async () => {
      return this.getIPLocation() || this.promptManualLocation();
    });

    this.fallbackStrategies.set('storage', async () => {
      return this.useMemoryStorage() || this.useSessionStorage();
    });

    this.fallbackStrategies.set('network', async () => {
      return this.useOfflineMode() || this.showOfflineMessage();
    });
  }

  /**
   * Setup retry strategies
   */
  setupRetryStrategies() {
    // Network requests
    this.retryStrategies.set(this.errorTypes.NETWORK_ERROR, {
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
      jitter: true
    });

    // API errors
    this.retryStrategies.set(this.errorTypes.API_ERROR, {
      maxRetries: 2,
      baseDelay: 2000,
      backoffMultiplier: 1.5,
      jitter: false
    });

    // Timeout errors
    this.retryStrategies.set(this.errorTypes.TIMEOUT_ERROR, {
      maxRetries: 2,
      baseDelay: 3000,
      backoffMultiplier: 2,
      jitter: true
    });
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(errorInfo) {
    const retryConfig = this.retryStrategies.get(errorInfo.type) || {
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.baseRetryDelay,
      backoffMultiplier: this.config.exponentialBackoffMultiplier,
      jitter: true
    };

    const operation = errorInfo.context.operation;
    if (!operation) {
      throw new Error('No operation to retry');
    }

    let lastError;
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 Retry attempt ${attempt}/${retryConfig.maxRetries}`);
        
        const result = await operation();
        
        console.log(`✅ Retry successful on attempt ${attempt}`);
        return { success: true, data: result, attempts: attempt };
        
      } catch (error) {
        lastError = error;
        
        if (attempt < retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay += Math.random() * 1000;
    }
    
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Use fallback strategy
   */
  async useFallback(errorInfo) {
    const fallbackKey = this.determineFallbackKey(errorInfo);
    const fallbackStrategy = this.fallbackStrategies.get(fallbackKey);
    
    if (!fallbackStrategy) {
      throw new Error(`No fallback strategy for ${fallbackKey}`);
    }

    console.log(`🔄 Using fallback strategy: ${fallbackKey}`);
    
    try {
      const fallbackData = await Promise.race([
        fallbackStrategy(),
        this.timeout(this.config.fallbackTimeout)
      ]);
      
      return { success: true, data: fallbackData };
      
    } catch (fallbackError) {
      console.error('Fallback strategy failed:', fallbackError);
      return { success: false, data: null };
    }
  }

  /**
   * Execute specific action
   */
  async executeAction(action, errorInfo) {
    switch (action) {
      case 'check_connection':
        return this.checkNetworkConnection();
        
      case 'use_cached_data':
        return this.getCachedData(errorInfo.context);
        
      case 'request_permission':
        return this.requestPermission(errorInfo.context);
        
      case 'show_permission_guide':
        return this.showPermissionGuide(errorInfo.context);
        
      case 'clear_cache':
        return this.clearCache();
        
      case 'use_memory_storage':
        return this.switchToMemoryStorage();
        
      case 'manual_location_input':
        return this.promptLocationInput();
        
      case 'use_ip_location':
        return this.getIPLocation();
        
      case 'show_validation_help':
        return this.showValidationHelp(errorInfo);
        
      case 'generic_fallback':
        return this.useGenericFallback(errorInfo);
        
      default:
        console.warn(`Unknown action: ${action}`);
        return null;
    }
  }

  /**
   * Generate user-friendly error message
   */
  generateUserMessage(errorInfo, result) {
    const messages = {
      [this.errorTypes.NETWORK_ERROR]: {
        title: 'Connection Issue',
        message: 'Unable to connect to our servers. Please check your internet connection.',
        actions: ['Try again', 'Use offline mode']
      },
      [this.errorTypes.API_ERROR]: {
        title: 'Service Temporarily Unavailable',
        message: 'Our service is experiencing issues. We\'re showing you cached results.',
        actions: ['Refresh', 'Try again later']
      },
      [this.errorTypes.PERMISSION_ERROR]: {
        title: 'Permission Required',
        message: 'This feature requires permission to access your location or camera.',
        actions: ['Grant permission', 'Learn more']
      },
      [this.errorTypes.LOCATION_ERROR]: {
        title: 'Location Unavailable',
        message: 'Unable to determine your location. You can enter it manually.',
        actions: ['Enter location', 'Use current city']
      },
      [this.errorTypes.STORAGE_ERROR]: {
        title: 'Storage Full',
        message: 'Your device storage is full. Some features may not work properly.',
        actions: ['Clear cache', 'Continue anyway']
      },
      [this.errorTypes.VALIDATION_ERROR]: {
        title: 'Invalid Input',
        message: 'Please check your input and try again.',
        actions: ['Fix input', 'Get help']
      },
      [this.errorTypes.TIMEOUT_ERROR]: {
        title: 'Request Timed Out',
        message: 'The request is taking longer than expected. Please try again.',
        actions: ['Try again', 'Use cached data']
      }
    };

    const template = messages[errorInfo.type] || {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      actions: ['Try again', 'Contact support']
    };

    return {
      ...template,
      fallbackUsed: result.fallbackUsed,
      canRetry: errorInfo.recoverable,
      timestamp: errorInfo.timestamp
    };
  }

  /**
   * Notify user about error
   */
  notifyUser(errorInfo, result) {
    const notification = {
      id: this.generateNotificationId(),
      type: 'error',
      title: result.userMessage.title,
      message: result.userMessage.message,
      actions: result.userMessage.actions,
      severity: errorInfo.severity,
      timestamp: new Date(),
      dismissible: true,
      autoHide: errorInfo.severity === 'low'
    };

    this.errorNotificationQueue.push(notification);
    this.displayErrorNotification(notification);
  }

  /**
   * Display error notification to user
   */
  displayErrorNotification(notification) {
    // Create notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = `error-notification severity-${notification.severity}`;
    notificationEl.id = `notification-${notification.id}`;
    
    notificationEl.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon">${this.getErrorIcon(notification.severity)}</span>
          <span class="notification-title">${notification.title}</span>
          ${notification.dismissible ? '<button class="notification-close">×</button>' : ''}
        </div>
        <div class="notification-message">${notification.message}</div>
        ${notification.actions.length > 0 ? `
          <div class="notification-actions">
            ${notification.actions.map((action, index) => 
              `<button class="notification-action" data-action="${index}">${action}</button>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Add to page
    const container = this.getNotificationContainer();
    container.appendChild(notificationEl);

    // Setup event listeners
    this.setupNotificationEventListeners(notificationEl, notification);

    // Auto-hide if configured
    if (notification.autoHide) {
      setTimeout(() => {
        this.hideNotification(notification.id);
      }, 5000);
    }
  }

  /**
   * Log error for monitoring
   */
  logError(errorInfo) {
    // Add to error log
    this.errorLog.push(errorInfo);
    
    // Maintain log size
    if (this.errorLog.length > this.config.errorLogMaxSize) {
      this.errorLog = this.errorLog.slice(-this.config.errorLogMaxSize);
    }

    // Console logging
    const logLevel = errorInfo.severity === 'high' ? 'error' : 
                    errorInfo.severity === 'medium' ? 'warn' : 'info';
    
    console[logLevel](`[${errorInfo.type}] ${errorInfo.message}`, errorInfo);

    // Send to monitoring service if enabled
    if (this.config.enableErrorReporting) {
      this.reportError(errorInfo);
    }

    // Save to local storage
    this.saveErrorLog();
  }

  /**
   * Setup error monitoring
   */
  setupErrorMonitoring() {
    // Monitor performance issues
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 3000) { // 3 second threshold
            this.handleError(new Error('Performance issue detected'), {
              type: 'performance',
              duration: entry.duration,
              entryType: entry.entryType
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usageRatio > 0.9) { // 90% memory usage
          this.handleError(new Error('High memory usage detected'), {
            type: 'memory',
            usage: usageRatio,
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Utility methods
   */
  shouldRetry(errorInfo) {
    return errorInfo.recoverable && 
           errorInfo.context.retryCount < this.config.maxRetries;
  }

  determineFallbackKey(errorInfo) {
    if (errorInfo.context.apiEndpoint) {
      return `api_${errorInfo.context.apiEndpoint}`;
    }
    
    switch (errorInfo.type) {
      case this.errorTypes.LOCATION_ERROR:
        return 'geolocation';
      case this.errorTypes.STORAGE_ERROR:
        return 'storage';
      case this.errorTypes.NETWORK_ERROR:
        return 'network';
      default:
        return 'generic';
    }
  }

  getFallbackResult(error, context) {
    return {
      success: false,
      data: null,
      fallbackUsed: false,
      retryAttempted: false,
      userMessage: {
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        actions: ['Try again']
      }
    };
  }

  generateErrorId() {
    return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateNotificationId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getErrorIcon(severity) {
    const icons = {
      low: '⚠️',
      medium: '❗',
      high: '🚨'
    };
    return icons[severity] || '❓';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  getNotificationContainer() {
    let container = document.getElementById('error-notifications');
    if (!container) {
      container = document.createElement('div');
      container.id = 'error-notifications';
      container.className = 'error-notifications-container';
      document.body.appendChild(container);
    }
    return container;
  }

  setupNotificationEventListeners(element, notification) {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideNotification(notification.id);
      });
    }

    // Action buttons
    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.handleNotificationAction(notification, index);
      });
    });
  }

  hideNotification(notificationId) {
    const element = document.getElementById(`notification-${notificationId}`);
    if (element) {
      element.remove();
    }
  }

  handleNotificationAction(notification, actionIndex) {
    const action = notification.actions[actionIndex];
    console.log(`User clicked action: ${action}`);
    
    // Handle specific actions
    switch (action.toLowerCase()) {
      case 'try again':
        window.location.reload();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'contact support':
        this.openSupportPage();
        break;
      default:
        console.log(`Unhandled action: ${action}`);
    }
    
    this.hideNotification(notification.id);
  }

  // Placeholder implementations for fallback methods
  async getCachedExperiences() { return []; }
  async getStaticExperiences() { return []; }
  async getCachedWeather() { return null; }
  async getDefaultWeather() { return { temp: 20, condition: 'clear' }; }
  async getCachedEvents() { return []; }
  async getStaticEvents() { return []; }
  async getIPLocation() { return { lat: 0, lng: 0, city: 'Unknown' }; }
  async getDefaultLocation() { return { lat: 0, lng: 0, city: 'Default' }; }
  async promptManualLocation() { return null; }
  async useMemoryStorage() { return true; }
  async useSessionStorage() { return true; }
  async useOfflineMode() { return true; }
  async showOfflineMessage() { return true; }
  async checkNetworkConnection() { return navigator.onLine; }
  async getCachedData(context) { return null; }
  async requestPermission(context) { return false; }
  async showPermissionGuide(context) { return true; }
  async clearCache() { return true; }
  async switchToMemoryStorage() { return true; }
  async promptLocationInput() { return null; }
  async showValidationHelp(errorInfo) { return true; }
  async useGenericFallback(errorInfo) { return null; }
  async reportError(errorInfo) { console.log('Error reported:', errorInfo.id); }
  async loadErrorHistory() { console.log('Error history loaded'); }
  async saveErrorLog() { console.log('Error log saved'); }
  openSupportPage() { console.log('Opening support page'); }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXErrorHandling = {
  ErrorHandlingManager
};

console.log('🛡️ ExploreX Error Handling System loaded');