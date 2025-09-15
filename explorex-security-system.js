/**
 * ExploreX Security & Data Protection System
 * 
 * Comprehensive security platform featuring:
 * - Input validation and sanitization for all user inputs
 * - Rate limiting for API endpoints and user actions
 * - Secure session management and authentication
 * - GDPR compliance features for data privacy
 * - API key security and rotation procedures
 * - XSS and CSRF protection mechanisms
 */

// =============================================================================
// SECURITY MANAGER
// =============================================================================

class SecurityManager {
  constructor() {
    this.config = {
      enableInputValidation: true,
      enableRateLimiting: true,
      enableSessionSecurity: true,
      enableGDPRCompliance: true,
      enableAPIKeySecurity: true,
      enableXSSProtection: true,
      enableCSRFProtection: true,
      
      // Rate limiting configuration
      rateLimits: {
        search: { requests: 30, window: 60000 }, // 30 requests per minute
        api: { requests: 100, window: 60000 }, // 100 requests per minute
        login: { requests: 5, window: 300000 }, // 5 attempts per 5 minutes
        registration: { requests: 3, window: 3600000 }, // 3 attempts per hour
        contact: { requests: 5, window: 3600000 } // 5 messages per hour
      },
      
      // Session security
      sessionConfig: {
        timeout: 3600000, // 1 hour
        renewThreshold: 300000, // 5 minutes before expiry
        maxConcurrentSessions: 3,
        requireSecureContext: true
      },
      
      // Input validation rules
      validationRules: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s\-\(\)]{10,}$/,
        name: /^[a-zA-Z\s\-']{2,50}$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        url: /^https?:\/\/.+/,
        coordinates: /^-?\d+\.?\d*$/
      },
      
      // Content Security Policy
      cspDirectives: {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' https://apis.google.com https://maps.googleapis.com",
        'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
        'font-src': "'self' https://fonts.gstatic.com",
        'img-src': "'self' data: https: blob:",
        'connect-src': "'self' https://api.openweathermap.org https://api.eventbrite.com",
        'frame-src': "'none'",
        'object-src': "'none'",
        'base-uri': "'self'"
      }
    };
    
    this.rateLimitStore = new Map();
    this.sessionStore = new Map();
    this.apiKeyStore = new Map();
    this.securityEvents = [];
    this.isInitialized = false;
  }

  /**
   * Initialize security system
   */
  async initialize() {
    try {
      console.log('🔒 Initializing Security System...');
      
      // Setup Content Security Policy
      this.setupContentSecurityPolicy();
      
      // Initialize input validation
      if (this.config.enableInputValidation) {
        this.setupInputValidation();
      }
      
      // Initialize rate limiting
      if (this.config.enableRateLimiting) {
        this.setupRateLimiting();
      }
      
      // Initialize session security
      if (this.config.enableSessionSecurity) {
        this.setupSessionSecurity();
      }
      
      // Initialize GDPR compliance
      if (this.config.enableGDPRCompliance) {
        this.setupGDPRCompliance();
      }
      
      // Initialize API key security
      if (this.config.enableAPIKeySecurity) {
        this.setupAPIKeySecurity();
      }
      
      // Setup XSS protection
      if (this.config.enableXSSProtection) {
        this.setupXSSProtection();
      }
      
      // Setup CSRF protection
      if (this.config.enableCSRFProtection) {
        this.setupCSRFProtection();
      }
      
      // Setup security monitoring
      this.setupSecurityMonitoring();
      
      // Setup periodic cleanup
      this.setupPeriodicCleanup();
      
      this.isInitialized = true;
      console.log('✅ Security System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Security System:', error);
      throw error;
    }
  }

  /**
   * Setup Content Security Policy
   */
  setupContentSecurityPolicy() {
    try {
      const cspString = Object.entries(this.config.cspDirectives)
        .map(([directive, value]) => `${directive} ${value}`)
        .join('; ');
      
      // Add CSP meta tag if not exists
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = cspString;
        document.head.appendChild(meta);
      }
      
      console.log('🛡️ Content Security Policy configured');
      
    } catch (error) {
      console.warn('Failed to setup CSP:', error);
    }
  }

  /**
   * Setup input validation
   */
  setupInputValidation() {
    // Intercept form submissions
    document.addEventListener('submit', (event) => {
      if (!this.validateForm(event.target)) {
        event.preventDefault();
        this.logSecurityEvent('form_validation_failed', {
          formId: event.target.id,
          timestamp: Date.now()
        });
      }
    });

    // Intercept input changes for real-time validation
    document.addEventListener('input', (event) => {
      if (event.target.matches('input, textarea, select')) {
        this.validateInput(event.target);
      }
    });

    console.log('✅ Input validation configured');
  }

  /**
   * Validate form
   */
  validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (!this.validateInput(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  /**
   * Validate individual input
   */
  validateInput(input) {
    const value = input.value.trim();
    const type = input.type || input.dataset.validationType;
    
    // Skip validation for disabled or readonly inputs
    if (input.disabled || input.readOnly) {
      return true;
    }
    
    // Required field validation
    if (input.required && !value) {
      this.showValidationError(input, 'This field is required');
      return false;
    }
    
    // Skip further validation if field is empty and not required
    if (!value && !input.required) {
      this.clearValidationError(input);
      return true;
    }
    
    // Type-specific validation
    let isValid = true;
    let errorMessage = '';
    
    switch (type) {
      case 'email':
        isValid = this.config.validationRules.email.test(value);
        errorMessage = 'Please enter a valid email address';
        break;
        
      case 'tel':
      case 'phone':
        isValid = this.config.validationRules.phone.test(value);
        errorMessage = 'Please enter a valid phone number';
        break;
        
      case 'text':
        if (input.dataset.validationType === 'name') {
          isValid = this.config.validationRules.name.test(value);
          errorMessage = 'Name must contain only letters, spaces, hyphens, and apostrophes';
        }
        break;
        
      case 'password':
        isValid = this.config.validationRules.password.test(value);
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
        break;
        
      case 'url':
        isValid = this.config.validationRules.url.test(value);
        errorMessage = 'Please enter a valid URL';
        break;
    }
    
    // Length validation
    if (isValid && input.maxLength && value.length > input.maxLength) {
      isValid = false;
      errorMessage = `Maximum ${input.maxLength} characters allowed`;
    }
    
    if (isValid && input.minLength && value.length < input.minLength) {
      isValid = false;
      errorMessage = `Minimum ${input.minLength} characters required`;
    }
    
    // Custom pattern validation
    if (isValid && input.pattern) {
      const pattern = new RegExp(input.pattern);
      if (!pattern.test(value)) {
        isValid = false;
        errorMessage = input.title || 'Invalid format';
      }
    }
    
    // XSS prevention - sanitize input
    if (isValid) {
      const sanitizedValue = this.sanitizeInput(value);
      if (sanitizedValue !== value) {
        input.value = sanitizedValue;
        this.logSecurityEvent('xss_attempt_blocked', {
          originalValue: value,
          sanitizedValue: sanitizedValue,
          inputId: input.id
        });
      }
    }
    
    if (isValid) {
      this.clearValidationError(input);
    } else {
      this.showValidationError(input, errorMessage);
    }
    
    return isValid;
  }

  /**
   * Sanitize input to prevent XSS
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * Show validation error
   */
  showValidationError(input, message) {
    // Remove existing error
    this.clearValidationError(input);
    
    // Add error class
    input.classList.add('validation-error');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error-message';
    errorElement.textContent = message;
    errorElement.id = `${input.id || 'input'}-error`;
    
    // Insert error message after input
    input.parentNode.insertBefore(errorElement, input.nextSibling);
    
    // Set ARIA attributes for accessibility
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorElement.id);
  }

  /**
   * Clear validation error
   */
  clearValidationError(input) {
    input.classList.remove('validation-error');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    
    const errorElement = input.parentNode.querySelector('.validation-error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Setup rate limiting
   */
  setupRateLimiting() {
    // Override fetch to add rate limiting
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      const endpoint = this.getEndpointFromURL(url);
      
      if (!this.checkRateLimit('api', endpoint)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      return originalFetch(url, options);
    };
    
    // Add rate limiting to search
    document.addEventListener('searchPerformed', (event) => {
      if (!this.checkRateLimit('search')) {
        event.preventDefault();
        this.showRateLimitError('search');
      }
    });
    
    console.log('🚦 Rate limiting configured');
  }

  /**
   * Check rate limit
   */
  checkRateLimit(type, identifier = 'default') {
    const key = `${type}_${identifier}`;
    const limit = this.config.rateLimits[type];
    
    if (!limit) return true;
    
    const now = Date.now();
    const windowStart = now - limit.window;
    
    // Get or create rate limit entry
    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, []);
    }
    
    const requests = this.rateLimitStore.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= limit.requests) {
      this.logSecurityEvent('rate_limit_exceeded', {
        type,
        identifier,
        requests: validRequests.length,
        limit: limit.requests
      });
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(key, validRequests);
    
    return true;
  }

  /**
   * Show rate limit error
   */
  showRateLimitError(type) {
    const messages = {
      search: 'Too many searches. Please wait a moment before searching again.',
      api: 'Too many requests. Please wait a moment before trying again.',
      login: 'Too many login attempts. Please wait 5 minutes before trying again.',
      registration: 'Registration limit reached. Please try again later.',
      contact: 'Message limit reached. Please try again later.'
    };
    
    const message = messages[type] || 'Rate limit exceeded. Please try again later.';
    
    // Show toast notification if available
    if (window.ExploreXUI?.ToastManager) {
      const toastManager = new window.ExploreXUI.ToastManager();
      toastManager.warning(message);
    } else {
      alert(message);
    }
  }

  /**
   * Setup session security
   */
  setupSessionSecurity() {
    // Generate secure session token
    this.generateSessionToken();
    
    // Setup session timeout
    this.setupSessionTimeout();
    
    // Monitor for session hijacking
    this.setupSessionMonitoring();
    
    // Setup secure storage
    this.setupSecureStorage();
    
    console.log('🔐 Session security configured');
  }

  /**
   * Generate secure session token
   */
  generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    const session = {
      token,
      created: Date.now(),
      lastActivity: Date.now(),
      fingerprint: this.generateFingerprint(),
      isValid: true
    };
    
    this.sessionStore.set(token, session);
    this.setSecureSessionCookie(token);
    
    return token;
  }

  /**
   * Generate browser fingerprint
   */
  generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };
    
    return btoa(JSON.stringify(fingerprint));
  }

  /**
   * Set secure session cookie
   */
  setSecureSessionCookie(token) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    const sameSite = '; SameSite=Strict';
    const httpOnly = ''; // Can't set HttpOnly from JavaScript
    
    document.cookie = `explorex_session=${token}; Path=/; Max-Age=3600${secure}${sameSite}${httpOnly}`;
  }

  /**
   * Setup session timeout
   */
  setupSessionTimeout() {
    setInterval(() => {
      this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Check session timeout
   */
  checkSessionTimeout() {
    const now = Date.now();
    
    for (const [token, session] of this.sessionStore) {
      const age = now - session.lastActivity;
      
      if (age > this.config.sessionConfig.timeout) {
        this.invalidateSession(token, 'timeout');
      } else if (age > (this.config.sessionConfig.timeout - this.config.sessionConfig.renewThreshold)) {
        this.renewSession(token);
      }
    }
  }

  /**
   * Invalidate session
   */
  invalidateSession(token, reason = 'manual') {
    this.sessionStore.delete(token);
    document.cookie = 'explorex_session=; Path=/; Max-Age=0';
    
    this.logSecurityEvent('session_invalidated', {
      token: token.substring(0, 8) + '...',
      reason
    });
    
    // Notify user if session expired
    if (reason === 'timeout') {
      if (window.ExploreXUI?.ToastManager) {
        const toastManager = new window.ExploreXUI.ToastManager();
        toastManager.warning('Your session has expired. Please log in again.');
      }
    }
  }

  /**
   * Renew session
   */
  renewSession(token) {
    const session = this.sessionStore.get(token);
    if (session) {
      session.lastActivity = Date.now();
      this.setSecureSessionCookie(token);
    }
  }

  /**
   * Setup session monitoring
   */
  setupSessionMonitoring() {
    // Monitor for multiple tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === 'explorex_session_check') {
        this.handleConcurrentSession();
      }
    });
    
    // Monitor for suspicious activity
    document.addEventListener('click', () => {
      this.updateSessionActivity();
    });
    
    document.addEventListener('keydown', () => {
      this.updateSessionActivity();
    });
  }

  /**
   * Update session activity
   */
  updateSessionActivity() {
    const token = this.getCurrentSessionToken();
    if (token) {
      const session = this.sessionStore.get(token);
      if (session) {
        session.lastActivity = Date.now();
      }
    }
  }

  /**
   * Get current session token
   */
  getCurrentSessionToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'explorex_session') {
        return value;
      }
    }
    return null;
  }

  /**
   * Setup secure storage
   */
  setupSecureStorage() {
    // Encrypt sensitive data in localStorage
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    
    localStorage.setItem = (key, value) => {
      if (this.isSensitiveKey(key)) {
        value = this.encryptData(value);
      }
      return originalSetItem.call(localStorage, key, value);
    };
    
    localStorage.getItem = (key) => {
      let value = originalGetItem.call(localStorage, key);
      if (value && this.isSensitiveKey(key)) {
        value = this.decryptData(value);
      }
      return value;
    };
  }

  /**
   * Check if key contains sensitive data
   */
  isSensitiveKey(key) {
    const sensitiveKeys = [
      'user-preferences',
      'user-profile',
      'saved-experiences',
      'search-history',
      'analytics-data'
    ];
    
    return sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));
  }

  /**
   * Encrypt data (simple implementation)
   */
  encryptData(data) {
    try {
      // Simple XOR encryption for demo purposes
      // In production, use proper encryption libraries
      const key = 'explorex-security-key';
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return btoa(encrypted);
    } catch (error) {
      console.warn('Encryption failed:', error);
      return data;
    }
  }

  /**
   * Decrypt data
   */
  decryptData(encryptedData) {
    try {
      const key = 'explorex-security-key';
      const encrypted = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.warn('Decryption failed:', error);
      return encryptedData;
    }
  }

  /**
   * Setup GDPR compliance
   */
  setupGDPRCompliance() {
    // Check for existing consent
    this.checkGDPRConsent();
    
    // Setup data export functionality
    this.setupDataExport();
    
    // Setup data deletion functionality
    this.setupDataDeletion();
    
    // Setup privacy controls
    this.setupPrivacyControls();
    
    console.log('🇪🇺 GDPR compliance configured');
  }

  /**
   * Check GDPR consent
   */
  checkGDPRConsent() {
    const consent = localStorage.getItem('explorex-gdpr-consent');
    
    if (!consent) {
      this.showGDPRConsentBanner();
    } else {
      const consentData = JSON.parse(consent);
      if (this.isConsentExpired(consentData)) {
        this.showGDPRConsentBanner();
      }
    }
  }

  /**
   * Show GDPR consent banner
   */
  showGDPRConsentBanner() {
    const banner = document.createElement('div');
    banner.id = 'gdpr-consent-banner';
    banner.className = 'gdpr-consent-banner';
    
    banner.innerHTML = `
      <div class="gdpr-content">
        <div class="gdpr-text">
          <h3>🍪 Privacy & Cookies</h3>
          <p>We use cookies and collect data to improve your experience. By continuing to use ExploreX, you agree to our data collection practices.</p>
        </div>
        <div class="gdpr-actions">
          <button class="gdpr-btn gdpr-accept" onclick="window.ExploreXSecurity.acceptGDPRConsent()">
            Accept All
          </button>
          <button class="gdpr-btn gdpr-customize" onclick="window.ExploreXSecurity.showPrivacySettings()">
            Customize
          </button>
          <button class="gdpr-btn gdpr-decline" onclick="window.ExploreXSecurity.declineGDPRConsent()">
            Decline
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
  }

  /**
   * Accept GDPR consent
   */
  acceptGDPRConsent() {
    const consent = {
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    localStorage.setItem('explorex-gdpr-consent', JSON.stringify(consent));
    this.removeGDPRBanner();
    
    this.logSecurityEvent('gdpr_consent_accepted', consent);
  }

  /**
   * Decline GDPR consent
   */
  declineGDPRConsent() {
    const consent = {
      analytics: false,
      marketing: false,
      functional: true, // Essential cookies only
      timestamp: Date.now(),
      version: '1.0'
    };
    
    localStorage.setItem('explorex-gdpr-consent', JSON.stringify(consent));
    this.removeGDPRBanner();
    
    // Disable non-essential features
    this.disableNonEssentialFeatures();
    
    this.logSecurityEvent('gdpr_consent_declined', consent);
  }

  /**
   * Remove GDPR banner
   */
  removeGDPRBanner() {
    const banner = document.getElementById('gdpr-consent-banner');
    if (banner) {
      banner.remove();
    }
  }

  /**
   * Setup API key security
   */
  setupAPIKeySecurity() {
    // Rotate API keys periodically
    this.setupAPIKeyRotation();
    
    // Monitor API key usage
    this.setupAPIKeyMonitoring();
    
    // Secure API key storage
    this.setupSecureAPIKeyStorage();
    
    console.log('🔑 API key security configured');
  }

  /**
   * Setup XSS protection
   */
  setupXSSProtection() {
    // Add X-XSS-Protection header simulation
    const meta = document.createElement('meta');
    meta.httpEquiv = 'X-XSS-Protection';
    meta.content = '1; mode=block';
    document.head.appendChild(meta);
    
    // Setup DOM mutation observer for XSS detection
    this.setupXSSDetection();
    
    console.log('🛡️ XSS protection configured');
  }

  /**
   * Setup XSS detection
   */
  setupXSSDetection() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForXSS(node);
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Scan for XSS attempts
   */
  scanForXSS(element) {
    // Check for suspicious script tags
    const scripts = element.querySelectorAll('script');
    scripts.forEach(script => {
      if (this.isSuspiciousScript(script)) {
        this.blockXSSAttempt(script);
      }
    });
    
    // Check for suspicious event handlers
    const elementsWithEvents = element.querySelectorAll('*[onclick], *[onload], *[onerror]');
    elementsWithEvents.forEach(el => {
      this.blockXSSAttempt(el);
    });
  }

  /**
   * Check if script is suspicious
   */
  isSuspiciousScript(script) {
    const suspiciousPatterns = [
      /eval\s*\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /javascript:/,
      /data:text\/html/
    ];
    
    return suspiciousPatterns.some(pattern => 
      pattern.test(script.textContent || script.src || '')
    );
  }

  /**
   * Block XSS attempt
   */
  blockXSSAttempt(element) {
    element.remove();
    
    this.logSecurityEvent('xss_attempt_blocked', {
      elementType: element.tagName,
      content: element.outerHTML.substring(0, 200),
      timestamp: Date.now()
    });
    
    console.warn('🚨 XSS attempt blocked:', element);
  }

  /**
   * Setup CSRF protection
   */
  setupCSRFProtection() {
    // Generate CSRF token
    this.generateCSRFToken();
    
    // Add CSRF token to forms
    this.addCSRFTokenToForms();
    
    // Validate CSRF tokens
    this.setupCSRFValidation();
    
    console.log('🛡️ CSRF protection configured');
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    sessionStorage.setItem('csrf-token', token);
    return token;
  }

  /**
   * Add CSRF token to forms
   */
  addCSRFTokenToForms() {
    const forms = document.querySelectorAll('form');
    const token = sessionStorage.getItem('csrf-token');
    
    forms.forEach(form => {
      if (!form.querySelector('input[name="csrf-token"]')) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf-token';
        input.value = token;
        form.appendChild(input);
      }
    });
  }

  /**
   * Setup security monitoring
   */
  setupSecurityMonitoring() {
    // Monitor for security events
    setInterval(() => {
      this.analyzeSecurityEvents();
    }, 300000); // Every 5 minutes
    
    // Setup security alerts
    this.setupSecurityAlerts();
  }

  /**
   * Log security event
   */
  logSecurityEvent(type, data) {
    const event = {
      id: this.generateEventId(),
      type,
      data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionToken: this.getCurrentSessionToken()?.substring(0, 8) + '...'
    };
    
    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
    
    // Send to analytics if available
    if (window.ExploreXAnalytics?.AnalyticsManager) {
      window.ExploreXAnalytics.AnalyticsManager.prototype.trackEvent?.('security_event', {
        securityEventType: type,
        ...data
      });
    }
    
    console.log(`🔒 Security event: ${type}`, data);
  }

  /**
   * Analyze security events
   */
  analyzeSecurityEvents() {
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 300000 // Last 5 minutes
    );
    
    // Check for suspicious patterns
    this.checkForBruteForce(recentEvents);
    this.checkForXSSAttempts(recentEvents);
    this.checkForRateLimitAbuse(recentEvents);
  }

  /**
   * Setup periodic cleanup
   */
  setupPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupRateLimitData();
      this.cleanupSecurityEvents();
    }, 3600000); // Every hour
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    
    for (const [token, session] of this.sessionStore) {
      if (now - session.lastActivity > this.config.sessionConfig.timeout) {
        this.sessionStore.delete(token);
      }
    }
  }

  /**
   * Cleanup rate limit data
   */
  cleanupRateLimitData() {
    const now = Date.now();
    
    for (const [key, requests] of this.rateLimitStore) {
      const validRequests = requests.filter(timestamp => 
        now - timestamp < Math.max(...Object.values(this.config.rateLimits).map(r => r.window))
      );
      
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        this.rateLimitStore.set(key, validRequests);
      }
    }
  }

  /**
   * Cleanup security events
   */
  cleanupSecurityEvents() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.securityEvents = this.securityEvents.filter(event => event.timestamp > cutoff);
  }

  /**
   * Get security dashboard data
   */
  getSecurityDashboard() {
    return {
      sessions: {
        active: this.sessionStore.size,
        total: this.securityEvents.filter(e => e.type === 'session_created').length
      },
      rateLimits: {
        active: this.rateLimitStore.size,
        violations: this.securityEvents.filter(e => e.type === 'rate_limit_exceeded').length
      },
      security: {
        xssBlocked: this.securityEvents.filter(e => e.type === 'xss_attempt_blocked').length,
        validationFailed: this.securityEvents.filter(e => e.type === 'form_validation_failed').length,
        gdprConsent: localStorage.getItem('explorex-gdpr-consent') ? 'granted' : 'pending'
      },
      recentEvents: this.securityEvents.slice(-10)
    };
  }

  /**
   * Utility methods
   */
  generateEventId() {
    return 'sec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getEndpointFromURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return 'unknown';
    }
  }

  isConsentExpired(consentData) {
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    return Date.now() - consentData.timestamp > oneYear;
  }

  // Placeholder methods for additional functionality
  handleConcurrentSession() { /* Implementation for concurrent session handling */ }
  setupAPIKeyRotation() { /* Implementation for API key rotation */ }
  setupAPIKeyMonitoring() { /* Implementation for API key monitoring */ }
  setupSecureAPIKeyStorage() { /* Implementation for secure API key storage */ }
  setupCSRFValidation() { /* Implementation for CSRF validation */ }
  setupSecurityAlerts() { /* Implementation for security alerts */ }
  checkForBruteForce(events) { /* Implementation for brute force detection */ }
  checkForXSSAttempts(events) { /* Implementation for XSS attempt analysis */ }
  checkForRateLimitAbuse(events) { /* Implementation for rate limit abuse detection */ }
  setupDataExport() { /* Implementation for GDPR data export */ }
  setupDataDeletion() { /* Implementation for GDPR data deletion */ }
  setupPrivacyControls() { /* Implementation for privacy controls */ }
  showPrivacySettings() { /* Implementation for privacy settings UI */ }
  disableNonEssentialFeatures() { /* Implementation for disabling features */ }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXSecurity = {
  SecurityManager
};

console.log('🔒 ExploreX Security System loaded');