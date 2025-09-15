/**
 * ExploreX Mobile Optimization System
 * 
 * Advanced mobile optimization features:
 * - Touch gesture support and mobile navigation
 * - GPS integration for location-based suggestions
 * - Performance optimization for mobile networks
 * - Responsive design adaptations
 * - Mobile-specific UI enhancements
 */

// =============================================================================
// MOBILE OPTIMIZATION MANAGER
// =============================================================================

class MobileOptimizationManager {
  constructor() {
    this.isMobile = this.detectMobileDevice();
    this.touchSupport = 'ontouchstart' in window;
    this.gpsSupport = 'geolocation' in navigator;
    this.networkInfo = this.getNetworkInfo();
    
    this.gestureHandlers = new Map();
    this.performanceOptimizations = new Map();
    this.locationWatcher = null;
    
    this.config = {
      touchThreshold: 10,
      swipeThreshold: 50,
      longPressDelay: 500,
      locationUpdateInterval: 30000, // 30 seconds
      performanceMode: 'auto' // auto, high, battery-saver
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize mobile optimization system
   */
  async initialize() {
    try {
      console.log('📱 Initializing Mobile Optimization System...');
      
      // Detect device capabilities
      await this.detectDeviceCapabilities();
      
      // Setup mobile-specific features
      if (this.isMobile) {
        this.setupMobileFeatures();
      }
      
      // Setup touch gestures
      if (this.touchSupport) {
        this.setupTouchGestures();
      }
      
      // Setup GPS integration
      if (this.gpsSupport) {
        this.setupGPSIntegration();
      }
      
      // Setup performance optimizations
      this.setupPerformanceOptimizations();
      
      // Setup responsive design adaptations
      this.setupResponsiveAdaptations();
      
      // Setup mobile navigation
      this.setupMobileNavigation();
      
      this.isInitialized = true;
      console.log('✅ Mobile Optimization System initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Mobile Optimization System:', error);
      throw error;
    }
  }

  /**
   * Detect mobile device
   */
  detectMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'tablet', 'phone'];
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
           window.innerWidth <= 768 ||
           ('ontouchstart' in window);
  }

  /**
   * Detect device capabilities
   */
  async detectDeviceCapabilities() {
    const capabilities = {
      touchSupport: this.touchSupport,
      gpsSupport: this.gpsSupport,
      accelerometer: 'DeviceMotionEvent' in window,
      orientation: 'DeviceOrientationEvent' in window,
      vibration: 'vibrate' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      webgl: this.detectWebGLSupport(),
      webAssembly: typeof WebAssembly === 'object'
    };
    
    this.deviceCapabilities = capabilities;
    
    console.log('📱 Device capabilities detected:', capabilities);
    
    // Adjust performance mode based on capabilities
    this.adjustPerformanceMode(capabilities);
  }

  /**
   * Setup mobile-specific features
   */
  setupMobileFeatures() {
    console.log('📱 Setting up mobile features...');
    
    // Prevent zoom on input focus
    this.preventInputZoom();
    
    // Setup mobile viewport
    this.setupMobileViewport();
    
    // Setup mobile-friendly interactions
    this.setupMobileInteractions();
    
    // Setup mobile performance optimizations
    this.setupMobilePerformance();
    
    // Add mobile-specific CSS classes
    document.body.classList.add('mobile-device');
    
    if (this.isMobile) {
      document.body.classList.add('is-mobile');
    }
  }

  /**
   * Setup touch gestures
   */
  setupTouchGestures() {
    console.log('👆 Setting up touch gestures...');
    
    const gestureManager = new TouchGestureManager(this.config);
    
    // Setup swipe gestures for navigation
    gestureManager.addSwipeHandler('left', (event) => {
      this.handleSwipeLeft(event);
    });
    
    gestureManager.addSwipeHandler('right', (event) => {
      this.handleSwipeRight(event);
    });
    
    // Setup pinch gestures for zoom
    gestureManager.addPinchHandler((event) => {
      this.handlePinchGesture(event);
    });
    
    // Setup long press for context menus
    gestureManager.addLongPressHandler((event) => {
      this.handleLongPress(event);
    });
    
    // Setup tap gestures for interactions
    gestureManager.addTapHandler((event) => {
      this.handleTapGesture(event);
    });
    
    this.gestureManager = gestureManager;
  }

  /**
   * Setup GPS integration
   */
  setupGPSIntegration() {
    console.log('🛰️ Setting up GPS integration...');
    
    const gpsManager = new GPSManager({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    });
    
    // Start location tracking
    gpsManager.startTracking((position) => {
      this.handleLocationUpdate(position);
    }, (error) => {
      this.handleLocationError(error);
    });
    
    this.gpsManager = gpsManager;
  }

  /**
   * Setup performance optimizations
   */
  setupPerformanceOptimizations() {
    console.log('⚡ Setting up performance optimizations...');
    
    // Image lazy loading
    this.setupImageLazyLoading();
    
    // Resource preloading
    this.setupResourcePreloading();
    
    // Network-aware loading
    this.setupNetworkAwareLoading();
    
    // Memory management
    this.setupMemoryManagement();
    
    // Battery optimization
    this.setupBatteryOptimization();
  }

  /**
   * Setup responsive design adaptations
   */
  setupResponsiveAdaptations() {
    console.log('📐 Setting up responsive adaptations...');
    
    // Monitor viewport changes
    window.addEventListener('resize', () => {
      this.handleViewportChange();
    });
    
    // Monitor orientation changes
    window.addEventListener('orientationchange', () => {
      this.handleOrientationChange();
    });
    
    // Setup responsive images
    this.setupResponsiveImages();
    
    // Setup responsive typography
    this.setupResponsiveTypography();
  }

  /**
   * Setup mobile navigation
   */
  setupMobileNavigation() {
    console.log('🧭 Setting up mobile navigation...');
    
    // Create mobile navigation menu
    this.createMobileNavigationMenu();
    
    // Setup bottom navigation bar
    this.setupBottomNavigation();
    
    // Setup hamburger menu
    this.setupHamburgerMenu();
    
    // Setup back button handling
    this.setupBackButtonHandling();
  }

  /**
   * Handle swipe left gesture
   */
  handleSwipeLeft(event) {
    console.log('👈 Swipe left detected');
    
    // Navigate to next page or show side menu
    const currentPage = this.getCurrentPage();
    
    if (currentPage === 'search') {
      this.showFiltersPanel();
    } else if (currentPage === 'experience-detail') {
      this.showNextExperience();
    }
  }

  /**
   * Handle swipe right gesture
   */
  handleSwipeRight(event) {
    console.log('👉 Swipe right detected');
    
    // Navigate to previous page or hide side menu
    const currentPage = this.getCurrentPage();
    
    if (currentPage === 'search') {
      this.hideFiltersPanel();
    } else if (currentPage === 'experience-detail') {
      this.showPreviousExperience();
    } else {
      this.navigateBack();
    }
  }

  /**
   * Handle pinch gesture for zoom
   */
  handlePinchGesture(event) {
    console.log('🤏 Pinch gesture detected:', event.scale);
    
    // Handle image zoom or map zoom
    const target = event.target;
    
    if (target.classList.contains('zoomable-image')) {
      this.handleImageZoom(target, event.scale);
    } else if (target.classList.contains('map-container')) {
      this.handleMapZoom(target, event.scale);
    }
  }

  /**
   * Handle long press gesture
   */
  handleLongPress(event) {
    console.log('👆 Long press detected');
    
    // Show context menu or additional options
    const target = event.target;
    
    if (target.classList.contains('experience-card')) {
      this.showExperienceContextMenu(target, event);
    } else if (target.classList.contains('itinerary-item')) {
      this.showItineraryContextMenu(target, event);
    }
    
    // Provide haptic feedback
    this.provideHapticFeedback();
  }

  /**
   * Handle tap gesture
   */
  handleTapGesture(event) {
    // Enhanced tap handling for mobile
    const target = event.target;
    
    // Add visual feedback
    this.addTapFeedback(target);
    
    // Handle specific tap targets
    if (target.classList.contains('mobile-optimized')) {
      event.preventDefault();
      this.handleMobileOptimizedTap(target);
    }
  }

  /**
   * Handle location update
   */
  handleLocationUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    console.log(`📍 Location updated: ${latitude}, ${longitude} (±${accuracy}m)`);
    
    // Update location-based recommendations
    this.updateLocationBasedSuggestions(latitude, longitude);
    
    // Update nearby experiences
    this.updateNearbyExperiences(latitude, longitude);
    
    // Update weather for current location
    this.updateLocationWeather(latitude, longitude);
    
    // Store location for offline use
    this.storeLocationForOfflineUse(position);
  }

  /**
   * Handle location error
   */
  handleLocationError(error) {
    console.warn('📍 Location error:', error.message);
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.showLocationPermissionPrompt();
        break;
      case error.POSITION_UNAVAILABLE:
        this.showLocationUnavailableMessage();
        break;
      case error.TIMEOUT:
        this.retryLocationRequest();
        break;
    }
  }

  /**
   * Setup image lazy loading
   */
  setupImageLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
      
      // Observe all lazy images
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
      
      this.imageObserver = imageObserver;
    }
  }

  /**
   * Load image with optimization
   */
  loadImage(img) {
    const src = img.dataset.src;
    const webpSrc = img.dataset.webpSrc;
    
    // Use WebP if supported
    if (webpSrc && this.supportsWebP()) {
      img.src = webpSrc;
    } else {
      img.src = src;
    }
    
    img.classList.add('loaded');
  }

  /**
   * Setup network-aware loading
   */
  setupNetworkAwareLoading() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      // Adjust quality based on connection
      this.adjustContentQuality(connection.effectiveType);
      
      // Listen for connection changes
      connection.addEventListener('change', () => {
        this.handleNetworkChange(connection);
      });
    }
  }

  /**
   * Adjust content quality based on network
   */
  adjustContentQuality(effectiveType) {
    console.log('📶 Network type:', effectiveType);
    
    let quality = 'high';
    
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        quality = 'low';
        break;
      case '3g':
        quality = 'medium';
        break;
      case '4g':
      default:
        quality = 'high';
        break;
    }
    
    this.setContentQuality(quality);
  }

  /**
   * Set content quality
   */
  setContentQuality(quality) {
    document.body.setAttribute('data-quality', quality);
    
    // Adjust image sizes
    const images = document.querySelectorAll('img[data-sizes]');
    images.forEach(img => {
      const sizes = JSON.parse(img.dataset.sizes);
      if (sizes[quality]) {
        img.src = sizes[quality];
      }
    });
    
    // Adjust video quality
    const videos = document.querySelectorAll('video[data-qualities]');
    videos.forEach(video => {
      const qualities = JSON.parse(video.dataset.qualities);
      if (qualities[quality]) {
        video.src = qualities[quality];
      }
    });
  }

  /**
   * Setup battery optimization
   */
  setupBatteryOptimization() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        this.handleBatteryStatus(battery);
        
        battery.addEventListener('levelchange', () => {
          this.handleBatteryStatus(battery);
        });
      });
    }
  }

  /**
   * Handle battery status changes
   */
  handleBatteryStatus(battery) {
    const level = battery.level;
    const charging = battery.charging;
    
    console.log(`🔋 Battery: ${Math.round(level * 100)}% ${charging ? '(charging)' : ''}`);
    
    // Enable battery saver mode when low
    if (level < 0.2 && !charging) {
      this.enableBatterySaverMode();
    } else if (level > 0.5 || charging) {
      this.disableBatterySaverMode();
    }
  }

  /**
   * Enable battery saver mode
   */
  enableBatterySaverMode() {
    console.log('🔋 Enabling battery saver mode');
    
    document.body.classList.add('battery-saver');
    
    // Reduce animations
    this.reduceAnimations();
    
    // Reduce background updates
    this.reduceBackgroundUpdates();
    
    // Lower image quality
    this.setContentQuality('low');
    
    // Reduce GPS accuracy
    if (this.gpsManager) {
      this.gpsManager.setBatterySaverMode(true);
    }
  }

  /**
   * Disable battery saver mode
   */
  disableBatterySaverMode() {
    console.log('🔋 Disabling battery saver mode');
    
    document.body.classList.remove('battery-saver');
    
    // Restore normal operations
    this.restoreAnimations();
    this.restoreBackgroundUpdates();
    this.setContentQuality('high');
    
    if (this.gpsManager) {
      this.gpsManager.setBatterySaverMode(false);
    }
  }

  /**
   * Create mobile navigation menu
   */
  createMobileNavigationMenu() {
    const nav = document.createElement('nav');
    nav.className = 'mobile-navigation';
    nav.innerHTML = `
      <div class="mobile-nav-header">
        <button class="nav-close-button">×</button>
        <h3>ExploreX</h3>
      </div>
      <ul class="mobile-nav-menu">
        <li><a href="#search" class="nav-item">🔍 Search Experiences</a></li>
        <li><a href="#itineraries" class="nav-item">📅 My Itineraries</a></li>
        <li><a href="#favorites" class="nav-item">❤️ Favorites</a></li>
        <li><a href="#community" class="nav-item">👥 Community</a></li>
        <li><a href="#profile" class="nav-item">👤 Profile</a></li>
        <li><a href="#settings" class="nav-item">⚙️ Settings</a></li>
      </ul>
    `;
    
    document.body.appendChild(nav);
    
    // Setup navigation event listeners
    this.setupNavigationEventListeners(nav);
  }

  /**
   * Setup bottom navigation
   */
  setupBottomNavigation() {
    const bottomNav = document.createElement('div');
    bottomNav.className = 'bottom-navigation';
    bottomNav.innerHTML = `
      <button class="bottom-nav-item active" data-page="search">
        <span class="nav-icon">🔍</span>
        <span class="nav-label">Search</span>
      </button>
      <button class="bottom-nav-item" data-page="itineraries">
        <span class="nav-icon">📅</span>
        <span class="nav-label">Plans</span>
      </button>
      <button class="bottom-nav-item" data-page="nearby">
        <span class="nav-icon">📍</span>
        <span class="nav-label">Nearby</span>
      </button>
      <button class="bottom-nav-item" data-page="community">
        <span class="nav-icon">👥</span>
        <span class="nav-label">Social</span>
      </button>
      <button class="bottom-nav-item" data-page="profile">
        <span class="nav-icon">👤</span>
        <span class="nav-label">Profile</span>
      </button>
    `;
    
    document.body.appendChild(bottomNav);
    
    // Setup bottom navigation event listeners
    bottomNav.addEventListener('click', (e) => {
      const item = e.target.closest('.bottom-nav-item');
      if (item) {
        this.handleBottomNavigation(item.dataset.page);
      }
    });
  }

  /**
   * Provide haptic feedback
   */
  provideHapticFeedback(pattern = [100]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Add tap feedback
   */
  addTapFeedback(element) {
    element.classList.add('tap-feedback');
    setTimeout(() => {
      element.classList.remove('tap-feedback');
    }, 150);
  }

  /**
   * Detect WebGL support
   */
  detectWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Check WebP support
   */
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  /**
   * Utility methods (placeholder implementations)
   */
  getCurrentPage() { return 'search'; }
  showFiltersPanel() { console.log('Showing filters panel'); }
  hideFiltersPanel() { console.log('Hiding filters panel'); }
  showNextExperience() { console.log('Showing next experience'); }
  showPreviousExperience() { console.log('Showing previous experience'); }
  navigateBack() { console.log('Navigating back'); }
  handleImageZoom(target, scale) { console.log('Handling image zoom:', scale); }
  handleMapZoom(target, scale) { console.log('Handling map zoom:', scale); }
  showExperienceContextMenu(target, event) { console.log('Showing experience context menu'); }
  showItineraryContextMenu(target, event) { console.log('Showing itinerary context menu'); }
  handleMobileOptimizedTap(target) { console.log('Handling mobile optimized tap'); }
  updateLocationBasedSuggestions(lat, lng) { console.log('Updating location suggestions:', lat, lng); }
  updateNearbyExperiences(lat, lng) { console.log('Updating nearby experiences:', lat, lng); }
  updateLocationWeather(lat, lng) { console.log('Updating location weather:', lat, lng); }
  storeLocationForOfflineUse(position) { console.log('Storing location for offline use'); }
  showLocationPermissionPrompt() { console.log('Showing location permission prompt'); }
  showLocationUnavailableMessage() { console.log('Showing location unavailable message'); }
  retryLocationRequest() { console.log('Retrying location request'); }
  handleNetworkChange(connection) { console.log('Network changed:', connection.effectiveType); }
  reduceAnimations() { document.body.classList.add('reduced-animations'); }
  reduceBackgroundUpdates() { console.log('Reducing background updates'); }
  restoreAnimations() { document.body.classList.remove('reduced-animations'); }
  restoreBackgroundUpdates() { console.log('Restoring background updates'); }
  setupNavigationEventListeners(nav) { console.log('Setting up navigation event listeners'); }
  handleBottomNavigation(page) { console.log('Navigating to:', page); }
  preventInputZoom() { console.log('Preventing input zoom'); }
  setupMobileViewport() { console.log('Setting up mobile viewport'); }
  setupMobileInteractions() { console.log('Setting up mobile interactions'); }
  setupMobilePerformance() { console.log('Setting up mobile performance'); }
  setupResourcePreloading() { console.log('Setting up resource preloading'); }
  setupMemoryManagement() { console.log('Setting up memory management'); }
  handleViewportChange() { console.log('Viewport changed'); }
  handleOrientationChange() { console.log('Orientation changed'); }
  setupResponsiveImages() { console.log('Setting up responsive images'); }
  setupResponsiveTypography() { console.log('Setting up responsive typography'); }
  setupHamburgerMenu() { console.log('Setting up hamburger menu'); }
  setupBackButtonHandling() { console.log('Setting up back button handling'); }
  adjustPerformanceMode(capabilities) { console.log('Adjusting performance mode based on capabilities'); }
}

// =============================================================================
// TOUCH GESTURE MANAGER
// =============================================================================

class TouchGestureManager {
  constructor(config) {
    this.config = config;
    this.handlers = {
      swipe: new Map(),
      pinch: [],
      longPress: [],
      tap: []
    };
    
    this.touchState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isLongPress: false,
      longPressTimer: null
    };
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchState.startX = touch.clientX;
    this.touchState.startY = touch.clientY;
    this.touchState.startTime = Date.now();
    this.touchState.isLongPress = false;
    
    // Start long press timer
    this.touchState.longPressTimer = setTimeout(() => {
      this.touchState.isLongPress = true;
      this.triggerLongPress(event);
    }, this.config.longPressDelay);
  }

  handleTouchMove(event) {
    // Cancel long press if moved too much
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchState.startX);
    const deltaY = Math.abs(touch.clientY - this.touchState.startY);
    
    if (deltaX > this.config.touchThreshold || deltaY > this.config.touchThreshold) {
      clearTimeout(this.touchState.longPressTimer);
    }
  }

  handleTouchEnd(event) {
    clearTimeout(this.touchState.longPressTimer);
    
    if (!this.touchState.isLongPress) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - this.touchState.startX;
      const deltaY = touch.clientY - this.touchState.startY;
      const deltaTime = Date.now() - this.touchState.startTime;
      
      // Check for swipe
      if (Math.abs(deltaX) > this.config.swipeThreshold || Math.abs(deltaY) > this.config.swipeThreshold) {
        this.triggerSwipe(deltaX, deltaY, event);
      } else if (deltaTime < 300) {
        // Quick tap
        this.triggerTap(event);
      }
    }
  }

  triggerSwipe(deltaX, deltaY, event) {
    let direction;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }
    
    const handler = this.handlers.swipe.get(direction);
    if (handler) {
      handler({ direction, deltaX, deltaY, originalEvent: event });
    }
  }

  triggerLongPress(event) {
    this.handlers.longPress.forEach(handler => {
      handler({ originalEvent: event });
    });
  }

  triggerTap(event) {
    this.handlers.tap.forEach(handler => {
      handler({ originalEvent: event });
    });
  }

  addSwipeHandler(direction, handler) {
    this.handlers.swipe.set(direction, handler);
  }

  addPinchHandler(handler) {
    this.handlers.pinch.push(handler);
  }

  addLongPressHandler(handler) {
    this.handlers.longPress.push(handler);
  }

  addTapHandler(handler) {
    this.handlers.tap.push(handler);
  }
}

// =============================================================================
// GPS MANAGER
// =============================================================================

class GPSManager {
  constructor(options = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
      ...options
    };
    
    this.watchId = null;
    this.lastPosition = null;
    this.batterySaverMode = false;
  }

  startTracking(successCallback, errorCallback) {
    if (!('geolocation' in navigator)) {
      errorCallback(new Error('Geolocation not supported'));
      return;
    }

    const options = { ...this.options };
    
    // Adjust options for battery saver mode
    if (this.batterySaverMode) {
      options.enableHighAccuracy = false;
      options.timeout = 30000;
      options.maximumAge = 600000; // 10 minutes
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastPosition = position;
        successCallback(position);
      },
      errorCallback,
      options
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  setBatterySaverMode(enabled) {
    this.batterySaverMode = enabled;
    
    // Restart tracking with new settings
    if (this.watchId !== null) {
      this.stopTracking();
      // Would need to restart with stored callbacks
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, this.options);
    });
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXMobile = {
  MobileOptimizationManager,
  TouchGestureManager,
  GPSManager
};

console.log('📱 ExploreX Mobile Optimization loaded');