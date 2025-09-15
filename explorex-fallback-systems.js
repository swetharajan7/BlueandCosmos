/**
 * ExploreX Fallback Systems & Data Sources
 * 
 * Comprehensive fallback mechanisms featuring:
 * - Static data sources for critical functionality
 * - Cached data management and retrieval
 * - Alternative API endpoints and services
 * - Offline data synchronization
 * - Graceful service degradation
 */

// =============================================================================
// FALLBACK DATA MANAGER
// =============================================================================

class FallbackDataManager {
  constructor() {
    this.staticData = new Map();
    this.cachedData = new Map();
    this.alternativeAPIs = new Map();
    this.offlineQueue = [];
    
    this.config = {
      cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      syncRetryInterval: 30000, // 30 seconds
      fallbackTimeout: 5000
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize fallback systems
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Fallback Systems...');
      
      // Load static data
      await this.loadStaticData();
      
      // Setup cache management
      this.setupCacheManagement();
      
      // Setup alternative APIs
      this.setupAlternativeAPIs();
      
      // Setup offline synchronization
      this.setupOfflineSync();
      
      this.isInitialized = true;
      console.log('✅ Fallback Systems initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Fallback Systems:', error);
      throw error;
    }
  }

  /**
   * Get fallback data for specific service
   */
  async getFallbackData(service, params = {}) {
    try {
      console.log(`🔄 Getting fallback data for: ${service}`);
      
      // Try cached data first
      const cachedData = await this.getCachedData(service, params);
      if (cachedData && !this.isCacheExpired(cachedData)) {
        console.log(`✅ Using cached data for ${service}`);
        return cachedData.data;
      }
      
      // Try alternative API
      const alternativeData = await this.tryAlternativeAPI(service, params);
      if (alternativeData) {
        console.log(`✅ Using alternative API for ${service}`);
        await this.cacheData(service, params, alternativeData);
        return alternativeData;
      }
      
      // Use static fallback data
      const staticData = this.getStaticData(service, params);
      if (staticData) {
        console.log(`✅ Using static fallback for ${service}`);
        return staticData;
      }
      
      throw new Error(`No fallback data available for ${service}`);
      
    } catch (error) {
      console.error(`❌ Fallback data retrieval failed for ${service}:`, error);
      return this.getEmptyFallback(service);
    }
  }

  /**
   * Load static data sources
   */
  async loadStaticData() {
    // Static experiences data
    this.staticData.set('experiences', [
      {
        id: 'griffith-observatory',
        name: 'Griffith Observatory',
        type: 'observatory',
        location: {
          latitude: 34.1184,
          longitude: -118.3004,
          address: '2800 E Observatory Rd, Los Angeles, CA 90027',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA'
        },
        description: 'Iconic observatory with planetarium shows and telescope viewing',
        rating: 4.5,
        price: 0,
        operatingHours: [
          { dayOfWeek: 2, openTime: '12:00 PM', closeTime: '10:00 PM', isClosed: false },
          { dayOfWeek: 3, openTime: '12:00 PM', closeTime: '10:00 PM', isClosed: false },
          { dayOfWeek: 4, openTime: '12:00 PM', closeTime: '10:00 PM', isClosed: false },
          { dayOfWeek: 5, openTime: '12:00 PM', closeTime: '10:00 PM', isClosed: false },
          { dayOfWeek: 6, openTime: '10:00 AM', closeTime: '10:00 PM', isClosed: false },
          { dayOfWeek: 0, openTime: '10:00 AM', closeTime: '10:00 PM', isClosed: false }
        ],
        amenities: ['parking', 'gift_shop', 'cafe', 'wheelchair_accessible'],
        tags: ['stargazing', 'planetarium', 'free', 'family_friendly']
      },
      {
        id: 'kennedy-space-center',
        name: 'Kennedy Space Center Visitor Complex',
        type: 'space-center',
        location: {
          latitude: 28.5721,
          longitude: -80.6480,
          address: 'Space Commerce Way, Merritt Island, FL 32953',
          city: 'Merritt Island',
          state: 'FL',
          country: 'USA'
        },
        description: 'NASA\'s premier space center with exhibits, tours, and IMAX theater',
        rating: 4.8,
        price: 75,
        operatingHours: [
          { dayOfWeek: 0, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 1, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 2, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 3, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 4, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 5, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false },
          { dayOfWeek: 6, openTime: '9:00 AM', closeTime: '5:00 PM', isClosed: false }
        ],
        amenities: ['parking', 'restaurant', 'gift_shop', 'wheelchair_accessible'],
        tags: ['nasa', 'space_shuttle', 'educational', 'tours']
      }
    ]);

    // Static weather data
    this.staticData.set('weather', {
      default: {
        temperature: 20,
        condition: 'clear',
        humidity: 50,
        windSpeed: 10,
        visibility: 'good',
        cloudCover: 20,
        uvIndex: 5
      }
    });

    // Static events data
    this.staticData.set('events', [
      {
        id: 'perseid-meteor-shower',
        name: 'Perseid Meteor Shower',
        type: 'celestial_event',
        startDate: '2024-07-17',
        endDate: '2024-08-24',
        peakDate: '2024-08-12',
        description: 'Annual meteor shower with up to 60 meteors per hour at peak',
        visibility: 'global',
        bestViewingTime: '2:00 AM - 4:00 AM'
      }
    ]);

    console.log('📦 Static data loaded successfully');
  }
}  /**

   * Setup cache management
   */
  setupCacheManagement() {
    // Initialize cache from localStorage
    this.loadCacheFromStorage();
    
    // Setup periodic cache cleanup
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute
    
    // Setup cache size monitoring
    setInterval(() => {
      this.monitorCacheSize();
    }, 300000); // Every 5 minutes
  }

  /**
   * Setup alternative API endpoints
   */
  setupAlternativeAPIs() {
    // Alternative weather APIs
    this.alternativeAPIs.set('weather', [
      {
        name: 'OpenWeatherMap',
        endpoint: 'https://api.openweathermap.org/data/2.5/weather',
        transform: this.transformOpenWeatherData.bind(this)
      },
      {
        name: 'WeatherAPI',
        endpoint: 'https://api.weatherapi.com/v1/current.json',
        transform: this.transformWeatherAPIData.bind(this)
      }
    ]);

    // Alternative location APIs
    this.alternativeAPIs.set('location', [
      {
        name: 'IPGeolocation',
        endpoint: 'https://api.ipgeolocation.io/ipgeo',
        transform: this.transformIPGeolocationData.bind(this)
      },
      {
        name: 'IPInfo',
        endpoint: 'https://ipinfo.io/json',
        transform: this.transformIPInfoData.bind(this)
      }
    ]);
  }

  /**
   * Setup offline synchronization
   */
  setupOfflineSync() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, syncing offline data...');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline, enabling offline mode...');
      this.enableOfflineMode();
    });

    // Periodic sync attempt
    setInterval(() => {
      if (navigator.onLine && this.offlineQueue.length > 0) {
        this.syncOfflineData();
      }
    }, this.config.syncRetryInterval);
  }

  /**
   * Get cached data
   */
  async getCachedData(service, params) {
    const cacheKey = this.generateCacheKey(service, params);
    return this.cachedData.get(cacheKey);
  }

  /**
   * Cache data with expiration
   */
  async cacheData(service, params, data) {
    const cacheKey = this.generateCacheKey(service, params);
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      service,
      params,
      size: JSON.stringify(data).length
    };
    
    this.cachedData.set(cacheKey, cacheEntry);
    this.saveCacheToStorage();
  }

  /**
   * Try alternative API endpoints
   */
  async tryAlternativeAPI(service, params) {
    const alternatives = this.alternativeAPIs.get(service);
    if (!alternatives) return null;

    for (const api of alternatives) {
      try {
        console.log(`🔄 Trying alternative API: ${api.name}`);
        
        const response = await Promise.race([
          fetch(this.buildAPIURL(api.endpoint, params)),
          this.timeout(this.config.fallbackTimeout)
        ]);
        
        if (response.ok) {
          const data = await response.json();
          return api.transform ? api.transform(data) : data;
        }
        
      } catch (error) {
        console.warn(`Alternative API ${api.name} failed:`, error.message);
      }
    }
    
    return null;
  }

  /**
   * Get static fallback data
   */
  getStaticData(service, params) {
    const staticData = this.staticData.get(service);
    if (!staticData) return null;

    // Filter static data based on parameters
    if (Array.isArray(staticData)) {
      return this.filterStaticData(staticData, params);
    }
    
    return staticData;
  }

  /**
   * Filter static data based on parameters
   */
  filterStaticData(data, params) {
    let filtered = [...data];

    // Filter by location if provided
    if (params.location) {
      filtered = filtered.filter(item => {
        if (!item.location) return false;
        
        const distance = this.calculateDistance(
          params.location.latitude,
          params.location.longitude,
          item.location.latitude,
          item.location.longitude
        );
        
        return distance <= (params.radius || 100); // Default 100 miles
      });
    }

    // Filter by type if provided
    if (params.type) {
      filtered = filtered.filter(item => item.type === params.type);
    }

    // Filter by date if provided
    if (params.date) {
      filtered = filtered.filter(item => {
        if (!item.operatingHours) return true;
        
        const dayOfWeek = new Date(params.date).getDay();
        const hours = item.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
        
        return hours && !hours.isClosed;
      });
    }

    return filtered;
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData() {
    if (this.offlineQueue.length === 0) return;

    console.log(`🔄 Syncing ${this.offlineQueue.length} offline items...`);
    
    const syncPromises = this.offlineQueue.map(async (item) => {
      try {
        await this.syncOfflineItem(item);
        return { success: true, item };
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        return { success: false, item, error };
      }
    });

    const results = await Promise.allSettled(syncPromises);
    
    // Remove successfully synced items
    const successfulSyncs = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value.item.id);
    
    this.offlineQueue = this.offlineQueue.filter(
      item => !successfulSyncs.includes(item.id)
    );

    console.log(`✅ Synced ${successfulSyncs.length} items, ${this.offlineQueue.length} remaining`);
  }

  /**
   * Sync individual offline item
   */
  async syncOfflineItem(item) {
    switch (item.type) {
      case 'review':
        return this.syncReview(item);
      case 'photo':
        return this.syncPhoto(item);
      case 'itinerary':
        return this.syncItinerary(item);
      case 'user_data':
        return this.syncUserData(item);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode() {
    document.body.classList.add('offline-mode');
    
    // Show offline indicator
    this.showOfflineIndicator();
    
    // Switch to cached data sources
    this.switchToCachedDataSources();
  }

  /**
   * Utility methods
   */
  generateCacheKey(service, params) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${service}_${btoa(paramString)}`;
  }

  isCacheExpired(cacheEntry) {
    return Date.now() - cacheEntry.timestamp > this.config.cacheExpiration;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  buildAPIURL(endpoint, params) {
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  getEmptyFallback(service) {
    const emptyFallbacks = {
      experiences: [],
      weather: { temperature: 20, condition: 'unknown' },
      events: [],
      location: { latitude: 0, longitude: 0, city: 'Unknown' }
    };
    
    return emptyFallbacks[service] || null;
  }

  // Data transformation methods
  transformOpenWeatherData(data) {
    return {
      temperature: Math.round(data.main.temp - 273.15), // Kelvin to Celsius
      condition: data.weather[0].main.toLowerCase(),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      visibility: data.visibility > 5000 ? 'good' : 'poor',
      cloudCover: data.clouds.all
    };
  }

  transformWeatherAPIData(data) {
    return {
      temperature: data.current.temp_c,
      condition: data.current.condition.text.toLowerCase(),
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      visibility: data.current.vis_km > 5 ? 'good' : 'poor',
      cloudCover: data.current.cloud
    };
  }

  transformIPGeolocationData(data) {
    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      city: data.city,
      state: data.state_prov,
      country: data.country_name
    };
  }

  transformIPInfoData(data) {
    const [lat, lng] = data.loc.split(',');
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      city: data.city,
      state: data.region,
      country: data.country
    };
  }

  // Cache management methods
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('explorex-fallback-cache');
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.cachedData = new Map(cacheData);
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  saveCacheToStorage() {
    try {
      const cacheArray = Array.from(this.cachedData.entries());
      localStorage.setItem('explorex-fallback-cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  cleanupExpiredCache() {
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cachedData) {
      if (this.isCacheExpired(entry)) {
        this.cachedData.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
      this.saveCacheToStorage();
    }
  }

  monitorCacheSize() {
    const totalSize = Array.from(this.cachedData.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);
    
    if (totalSize > this.config.maxCacheSize) {
      console.log('🗑️ Cache size exceeded, cleaning up...');
      this.cleanupOldestCache();
    }
  }

  cleanupOldestCache() {
    const entries = Array.from(this.cachedData.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const removeCount = Math.floor(entries.length * 0.25);
    
    for (let i = 0; i < removeCount; i++) {
      this.cachedData.delete(entries[i][0]);
    }
    
    this.saveCacheToStorage();
    console.log(`🗑️ Removed ${removeCount} oldest cache entries`);
  }

  showOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = '📱 Offline Mode';
    document.body.appendChild(indicator);
  }

  switchToCachedDataSources() {
    // Implementation would switch all data sources to use cached data
    console.log('🔄 Switched to cached data sources');
  }

  // Sync methods (placeholder implementations)
  async syncReview(item) {
    console.log('Syncing review:', item.id);
    return true;
  }

  async syncPhoto(item) {
    console.log('Syncing photo:', item.id);
    return true;
  }

  async syncItinerary(item) {
    console.log('Syncing itinerary:', item.id);
    return true;
  }

  async syncUserData(item) {
    console.log('Syncing user data:', item.id);
    return true;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXFallback = {
  FallbackDataManager
};

console.log('🔄 ExploreX Fallback Systems loaded');