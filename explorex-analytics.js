/**
 * ExploreX Analytics & Performance Monitoring System
 * 
 * Comprehensive analytics platform featuring:
 * - User interaction tracking and behavior analysis
 * - Performance monitoring for search and recommendations
 * - Conversion tracking for bookings and registrations
 * - Real-time system health and usage metrics
 * - A/B testing analytics and optimization insights
 */

// =============================================================================
// ANALYTICS MANAGER
// =============================================================================

class AnalyticsManager {
  constructor() {
    this.events = [];
    this.sessions = new Map();
    this.performanceMetrics = new Map();
    this.userJourneys = new Map();
    this.conversionFunnels = new Map();
    
    this.config = {
      enableTracking: true,
      enablePerformanceMonitoring: true,
      enableUserJourneyTracking: true,
      enableConversionTracking: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      maxEventAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEventsInMemory: 10000,
      enableRealTimeAnalytics: true
    };
    
    this.eventTypes = {
      PAGE_VIEW: 'page_view',
      USER_INTERACTION: 'user_interaction',
      SEARCH: 'search',
      EXPERIENCE_VIEW: 'experience_view',
      EXPERIENCE_CLICK: 'experience_click',
      BOOKING_START: 'booking_start',
      BOOKING_COMPLETE: 'booking_complete',
      REVIEW_SUBMIT: 'review_submit',
      PHOTO_UPLOAD: 'photo_upload',
      ITINERARY_CREATE: 'itinerary_create',
      SOCIAL_SHARE: 'social_share',
      ERROR_OCCURRED: 'error_occurred',
      PERFORMANCE_METRIC: 'performance_metric'
    };
    
    this.isInitialized = false;
    this.currentSession = null;
  }

  /**
   * Initialize analytics system
   */
  async initialize() {
    try {
      console.log('📊 Initializing Analytics System...');
      
      // Start new session
      this.startSession();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }
      
      // Setup user journey tracking
      if (this.config.enableUserJourneyTracking) {
        this.setupUserJourneyTracking();
      }
      
      // Setup conversion funnels
      if (this.config.enableConversionTracking) {
        this.setupConversionTracking();
      }
      
      // Setup periodic data flush
      this.setupDataFlush();
      
      // Load historical data
      await this.loadHistoricalData();
      
      this.isInitialized = true;
      console.log('✅ Analytics System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Analytics System:', error);
      throw error;
    }
  }

  /**
   * Track event
   */
  trackEvent(eventType, eventData = {}) {
    if (!this.config.enableTracking || !this.isInitialized) return;

    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: Date.now(),
        sessionId: this.currentSession?.id,
        userId: this.getCurrentUserId(),
        data: eventData,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        referrer: document.referrer
      };

      // Add to events array
      this.events.push(event);
      
      // Update session
      if (this.currentSession) {
        this.currentSession.eventCount++;
        this.currentSession.lastActivity = Date.now();
      }
      
      // Update user journey
      this.updateUserJourney(event);
      
      // Update conversion funnel
      this.updateConversionFunnel(event);
      
      // Real-time processing
      if (this.config.enableRealTimeAnalytics) {
        this.processEventRealTime(event);
      }
      
      // Maintain memory limits
      this.maintainEventLimits();
      
      console.log(`📊 Event tracked: ${eventType}`, event);
      
    } catch (error) {
      console.error('❌ Failed to track event:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView(page, additionalData = {}) {
    this.trackEvent(this.eventTypes.PAGE_VIEW, {
      page,
      title: document.title,
      ...additionalData
    });
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(element, action, additionalData = {}) {
    this.trackEvent(this.eventTypes.USER_INTERACTION, {
      element: element.tagName || element,
      action,
      elementId: element.id,
      elementClass: element.className,
      ...additionalData
    });
  }

  /**
   * Track search
   */
  trackSearch(query, filters = {}, results = []) {
    this.trackEvent(this.eventTypes.SEARCH, {
      query,
      filters,
      resultCount: results.length,
      hasResults: results.length > 0,
      searchDuration: performance.now() // Will be calculated by caller
    });
  }

  /**
   * Track experience interaction
   */
  trackExperienceView(experienceId, experienceData = {}) {
    this.trackEvent(this.eventTypes.EXPERIENCE_VIEW, {
      experienceId,
      experienceName: experienceData.name,
      experienceType: experienceData.type,
      experienceLocation: experienceData.location,
      viewDuration: 0 // Will be updated when user leaves
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionType, conversionData = {}) {
    const conversionEvents = {
      booking: this.eventTypes.BOOKING_COMPLETE,
      review: this.eventTypes.REVIEW_SUBMIT,
      photo: this.eventTypes.PHOTO_UPLOAD,
      itinerary: this.eventTypes.ITINERARY_CREATE,
      share: this.eventTypes.SOCIAL_SHARE
    };

    const eventType = conversionEvents[conversionType] || this.eventTypes.USER_INTERACTION;
    
    this.trackEvent(eventType, {
      conversionType,
      conversionValue: conversionData.value || 0,
      ...conversionData
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metricName, value, additionalData = {}) {
    this.trackEvent(this.eventTypes.PERFORMANCE_METRIC, {
      metricName,
      value,
      unit: additionalData.unit || 'ms',
      ...additionalData
    });

    // Store in performance metrics map
    if (!this.performanceMetrics.has(metricName)) {
      this.performanceMetrics.set(metricName, []);
    }
    
    this.performanceMetrics.get(metricName).push({
      value,
      timestamp: Date.now(),
      ...additionalData
    });
  }

  /**
   * Start new session
   */
  startSession() {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      eventCount: 0,
      pageViews: 0,
      interactions: 0,
      conversions: 0,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      initialUrl: window.location.href
    };
    
    this.sessions.set(sessionId, this.currentSession);
    
    console.log(`📊 New session started: ${sessionId}`);
  }

  /**
   * Setup event listeners for automatic tracking
   */
  setupEventListeners() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', { timestamp: Date.now() });
      } else {
        this.trackEvent('page_visible', { timestamp: Date.now() });
      }
    });

    // Track clicks
    document.addEventListener('click', (event) => {
      this.trackUserInteraction(event.target, 'click', {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.trackUserInteraction(event.target, 'form_submit', {
        formId: event.target.id,
        formAction: event.target.action
      });
    });

    // Track scroll events (throttled)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackUserInteraction(document, 'scroll', {
          scrollY: window.scrollY,
          scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
        });
      }, 1000);
    });

    // Track window resize
    window.addEventListener('resize', () => {
      this.trackEvent('viewport_change', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    });

    // Track beforeunload for session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            this.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.loadEventStart);
            this.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
            this.trackPerformance('first_byte_time', navigation.responseStart - navigation.requestStart);
          }
        }, 0);
      });
    }

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) { // Track slow resources
            this.trackPerformance('slow_resource', entry.duration, {
              resourceName: entry.name,
              resourceType: entry.initiatorType
            });
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.trackPerformance('memory_usage', memory.usedJSHeapSize, {
          unit: 'bytes',
          totalHeapSize: memory.totalJSHeapSize,
          heapSizeLimit: memory.jsHeapSizeLimit
        });
      }, 60000); // Every minute
    }

    // Monitor FPS (simplified)
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.trackPerformance('fps', frameCount, { unit: 'fps' });
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Setup user journey tracking
   */
  setupUserJourneyTracking() {
    // Track page transitions
    let currentPage = window.location.pathname;
    
    const trackPageTransition = () => {
      const newPage = window.location.pathname;
      if (newPage !== currentPage) {
        this.trackEvent('page_transition', {
          fromPage: currentPage,
          toPage: newPage,
          transitionTime: Date.now()
        });
        currentPage = newPage;
      }
    };

    // Listen for URL changes (for SPAs)
    window.addEventListener('popstate', trackPageTransition);
    
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      trackPageTransition();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      trackPageTransition();
    };
  }

  /**
   * Setup conversion tracking
   */
  setupConversionTracking() {
    // Define conversion funnels
    this.conversionFunnels.set('booking_funnel', {
      steps: [
        'experience_view',
        'booking_start',
        'booking_complete'
      ],
      users: new Map()
    });

    this.conversionFunnels.set('engagement_funnel', {
      steps: [
        'page_view',
        'search',
        'experience_view',
        'user_interaction'
      ],
      users: new Map()
    });

    this.conversionFunnels.set('social_funnel', {
      steps: [
        'experience_view',
        'review_submit',
        'photo_upload',
        'social_share'
      ],
      users: new Map()
    });
  }

  /**
   * Update user journey
   */
  updateUserJourney(event) {
    const userId = event.userId || 'anonymous';
    
    if (!this.userJourneys.has(userId)) {
      this.userJourneys.set(userId, {
        events: [],
        startTime: event.timestamp,
        lastActivity: event.timestamp
      });
    }
    
    const journey = this.userJourneys.get(userId);
    journey.events.push({
      type: event.type,
      timestamp: event.timestamp,
      data: event.data
    });
    journey.lastActivity = event.timestamp;
    
    // Keep only recent events (last 100)
    if (journey.events.length > 100) {
      journey.events = journey.events.slice(-100);
    }
  }

  /**
   * Update conversion funnel
   */
  updateConversionFunnel(event) {
    const userId = event.userId || event.sessionId;
    
    for (const [funnelName, funnel] of this.conversionFunnels) {
      if (funnel.steps.includes(event.type)) {
        if (!funnel.users.has(userId)) {
          funnel.users.set(userId, {
            steps: [],
            startTime: event.timestamp
          });
        }
        
        const userFunnel = funnel.users.get(userId);
        const stepIndex = funnel.steps.indexOf(event.type);
        
        // Add step if not already completed
        if (!userFunnel.steps.some(step => step.stepIndex === stepIndex)) {
          userFunnel.steps.push({
            stepIndex,
            stepName: event.type,
            timestamp: event.timestamp,
            data: event.data
          });
          
          // Sort steps by index
          userFunnel.steps.sort((a, b) => a.stepIndex - b.stepIndex);
        }
      }
    }
  }

  /**
   * Process event in real-time
   */
  processEventRealTime(event) {
    // Real-time alerts for critical events
    if (event.type === this.eventTypes.ERROR_OCCURRED && event.data.severity === 'high') {
      this.sendRealTimeAlert('High severity error occurred', event);
    }
    
    // Real-time performance monitoring
    if (event.type === this.eventTypes.PERFORMANCE_METRIC && event.data.value > 5000) {
      this.sendRealTimeAlert('Performance issue detected', event);
    }
    
    // Real-time conversion tracking
    if (event.type === this.eventTypes.BOOKING_COMPLETE) {
      this.sendRealTimeAlert('Conversion completed', event);
    }
  }

  /**
   * Get analytics dashboard data
   */
  getAnalyticsDashboard(timeRange = '24h') {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const rangeMs = timeRanges[timeRange] || timeRanges['24h'];
    const startTime = now - rangeMs;
    
    // Filter events by time range
    const filteredEvents = this.events.filter(event => event.timestamp >= startTime);
    
    return {
      overview: this.getOverviewMetrics(filteredEvents),
      userEngagement: this.getUserEngagementMetrics(filteredEvents),
      performance: this.getPerformanceMetrics(startTime),
      conversions: this.getConversionMetrics(filteredEvents),
      userJourneys: this.getUserJourneyAnalytics(startTime),
      topPages: this.getTopPages(filteredEvents),
      topSearches: this.getTopSearches(filteredEvents),
      errorAnalysis: this.getErrorAnalysis(filteredEvents)
    };
  }

  /**
   * Get overview metrics
   */
  getOverviewMetrics(events) {
    const uniqueUsers = new Set(events.map(e => e.userId || e.sessionId)).size;
    const pageViews = events.filter(e => e.type === this.eventTypes.PAGE_VIEW).length;
    const interactions = events.filter(e => e.type === this.eventTypes.USER_INTERACTION).length;
    const conversions = events.filter(e => e.type === this.eventTypes.BOOKING_COMPLETE).length;
    
    return {
      uniqueUsers,
      pageViews,
      interactions,
      conversions,
      conversionRate: pageViews > 0 ? (conversions / pageViews * 100).toFixed(2) : 0,
      avgSessionDuration: this.calculateAverageSessionDuration(),
      bounceRate: this.calculateBounceRate()
    };
  }

  /**
   * Get user engagement metrics
   */
  getUserEngagementMetrics(events) {
    const searches = events.filter(e => e.type === this.eventTypes.SEARCH);
    const experienceViews = events.filter(e => e.type === this.eventTypes.EXPERIENCE_VIEW);
    const socialShares = events.filter(e => e.type === this.eventTypes.SOCIAL_SHARE);
    
    return {
      totalSearches: searches.length,
      avgSearchResults: searches.reduce((sum, s) => sum + (s.data.resultCount || 0), 0) / searches.length || 0,
      experienceViews: experienceViews.length,
      socialShares: socialShares.length,
      engagementScore: this.calculateEngagementScore(events)
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(startTime) {
    const metrics = {};
    
    for (const [metricName, values] of this.performanceMetrics) {
      const recentValues = values.filter(v => v.timestamp >= startTime);
      
      if (recentValues.length > 0) {
        const sortedValues = recentValues.map(v => v.value).sort((a, b) => a - b);
        
        metrics[metricName] = {
          avg: recentValues.reduce((sum, v) => sum + v.value, 0) / recentValues.length,
          min: Math.min(...sortedValues),
          max: Math.max(...sortedValues),
          p50: sortedValues[Math.floor(sortedValues.length * 0.5)],
          p95: sortedValues[Math.floor(sortedValues.length * 0.95)],
          count: recentValues.length
        };
      }
    }
    
    return metrics;
  }

  /**
   * Utility methods
   */
  generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getCurrentUserId() {
    return window.ExploreXUser?.getCurrentUser()?.id || null;
  }

  maintainEventLimits() {
    if (this.events.length > this.config.maxEventsInMemory) {
      this.events = this.events.slice(-this.config.maxEventsInMemory);
    }
  }

  setupDataFlush() {
    setInterval(() => {
      this.flushData();
    }, this.config.flushInterval);
  }

  async flushData() {
    if (this.events.length === 0) return;
    
    try {
      // In production, this would send data to analytics service
      console.log(`📊 Flushing ${this.events.length} analytics events`);
      
      // Save to local storage as backup
      this.saveToLocalStorage();
      
      // Clear old events
      const cutoff = Date.now() - this.config.maxEventAge;
      this.events = this.events.filter(event => event.timestamp > cutoff);
      
    } catch (error) {
      console.error('❌ Failed to flush analytics data:', error);
    }
  }

  saveToLocalStorage() {
    try {
      const data = {
        events: this.events.slice(-1000), // Keep last 1000 events
        sessions: Array.from(this.sessions.entries()),
        timestamp: Date.now()
      };
      
      localStorage.setItem('explorex-analytics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error);
    }
  }

  async loadHistoricalData() {
    try {
      const stored = localStorage.getItem('explorex-analytics');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Load events (filter out old ones)
        const cutoff = Date.now() - this.config.maxEventAge;
        this.events = (data.events || []).filter(event => event.timestamp > cutoff);
        
        // Load sessions
        if (data.sessions) {
          this.sessions = new Map(data.sessions);
        }
        
        console.log(`📊 Loaded ${this.events.length} historical events`);
      }
    } catch (error) {
      console.warn('Failed to load historical analytics data:', error);
    }
  }

  endSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
      
      this.trackEvent('session_end', {
        sessionDuration: this.currentSession.duration,
        eventCount: this.currentSession.eventCount
      });
    }
  }

  sendRealTimeAlert(message, event) {
    console.log(`🚨 Real-time alert: ${message}`, event);
    // In production, this would send to monitoring service
  }

  // Placeholder calculation methods
  calculateAverageSessionDuration() {
    const completedSessions = Array.from(this.sessions.values()).filter(s => s.endTime);
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    return Math.round(totalDuration / completedSessions.length / 1000); // seconds
  }

  calculateBounceRate() {
    const singlePageSessions = Array.from(this.sessions.values()).filter(s => s.pageViews <= 1);
    const totalSessions = this.sessions.size;
    
    return totalSessions > 0 ? (singlePageSessions.length / totalSessions * 100).toFixed(2) : 0;
  }

  calculateEngagementScore(events) {
    // Simple engagement score based on different interaction types
    const weights = {
      [this.eventTypes.PAGE_VIEW]: 1,
      [this.eventTypes.SEARCH]: 2,
      [this.eventTypes.EXPERIENCE_VIEW]: 3,
      [this.eventTypes.USER_INTERACTION]: 1,
      [this.eventTypes.SOCIAL_SHARE]: 5,
      [this.eventTypes.BOOKING_COMPLETE]: 10
    };
    
    return events.reduce((score, event) => {
      return score + (weights[event.type] || 0);
    }, 0);
  }

  getConversionMetrics(events) { return {}; }
  getUserJourneyAnalytics(startTime) { return {}; }
  getTopPages(events) { return []; }
  getTopSearches(events) { return []; }
  getErrorAnalysis(events) { return {}; }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXAnalytics = {
  AnalyticsManager
};

console.log('📊 ExploreX Analytics System loaded');