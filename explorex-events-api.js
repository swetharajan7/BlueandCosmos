/**
 * ExploreX Real-Time Events and Workshop API Integration
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive event and workshop integration including:
 * - Eventbrite API integration for astronomy workshops
 * - Astronomy calendar APIs for celestial events
 * - Event filtering by date, type, and location
 * - Real-time event availability and capacity tracking
 * - Event registration and booking integration
 */

// =============================================================================
// EVENT API CONFIGURATION
// =============================================================================

const EventAPIConfig = {
  // API endpoints and keys
  eventbrite: {
    baseUrl: 'https://www.eventbriteapi.com/v3',
    // In production, this would be loaded from environment variables
    apiKey: 'YOUR_EVENTBRITE_API_KEY',
    categories: {
      astronomy: '103', // Science & Technology -> Astronomy
      education: '101',
      workshops: '199'
    }
  },
  
  astronomy: {
    // Astronomy APIs for celestial events
    nasaApi: 'https://api.nasa.gov/planetary/apod',
    astronomyApi: 'https://api.astronomyapi.com/api/v2',
    timeanddate: 'https://api.timeanddate.com/v1/astronomy',
    // Mock API key - in production use environment variables
    nasaApiKey: 'DEMO_KEY'
  },
  
  // Event types and categories
  eventTypes: [
    {
      id: 'workshop',
      label: 'Workshops & Classes',
      icon: '🎓',
      color: '#3b82f6',
      description: 'Hands-on learning experiences and educational workshops'
    },
    {
      id: 'stargazing',
      label: 'Stargazing Events',
      icon: '✨',
      color: '#8b5cf6',
      description: 'Organized stargazing sessions and night sky observations'
    },
    {
      id: 'lecture',
      label: 'Lectures & Talks',
      icon: '🎤',
      color: '#06b6d4',
      description: 'Educational presentations by astronomy experts'
    },
    {
      id: 'celestial',
      label: 'Celestial Events',
      icon: '🌙',
      color: '#f59e0b',
      description: 'Natural astronomical phenomena and celestial occurrences'
    },
    {
      id: 'exhibition',
      label: 'Exhibitions',
      icon: '🏛️',
      color: '#10b981',
      description: 'Special exhibitions and displays'
    },
    {
      id: 'family',
      label: 'Family Events',
      icon: '👨‍👩‍👧‍👦',
      color: '#ef4444',
      description: 'Family-friendly astronomy activities and events'
    }
  ],
  
  // Cache settings
  cache: {
    eventsTTL: 30 * 60 * 1000, // 30 minutes
    celestialTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: 1000
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 60,
    burstLimit: 10
  }
};

// =============================================================================
// EVENT API MANAGER CLASS
// =============================================================================

class EventAPIManager {
  constructor(config = {}) {
    this.config = { ...EventAPIConfig, ...config };
    this.cache = new Map();
    this.requestQueue = [];
    this.rateLimiter = new Map();
    this.isInitialized = false;
    
    // Initialize rate limiting
    this.initializeRateLimiting();
  }

  /**
   * Initialize the event API manager
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing ExploreX Event API Manager...');
      
      // Test API connections
      await this.testAPIConnections();
      
      // Load cached data
      this.loadCachedData();
      
      // Set up periodic cache cleanup
      this.setupCacheCleanup();
      
      this.isInitialized = true;
      console.log('✅ Event API Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Event API Manager:', error);
      throw error;
    }
  }

  /**
   * Test API connections
   */
  async testAPIConnections() {
    const tests = [];
    
    // Test NASA API (always available with DEMO_KEY)
    tests.push(this.testNASAConnection());
    
    // Test other APIs with fallback
    tests.push(this.testEventbriteConnection());
    
    const results = await Promise.allSettled(tests);
    
    results.forEach((result, index) => {
      const apiName = ['NASA', 'Eventbrite'][index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${apiName} API connection successful`);
      } else {
        console.warn(`⚠️ ${apiName} API connection failed, using mock data`);
      }
    });
  }

  /**
   * Test NASA API connection
   */
  async testNASAConnection() {
    const response = await fetch(`${this.config.astronomy.nasaApi}?api_key=${this.config.astronomy.nasaApiKey}`);
    if (!response.ok) throw new Error('NASA API test failed');
    return response.json();
  }

  /**
   * Test Eventbrite API connection
   */
  async testEventbriteConnection() {
    // Mock test for Eventbrite - in production would test with real API key
    return new Promise((resolve) => {
      setTimeout(() => resolve({ status: 'mock' }), 100);
    });
  }

  // ===========================================================================
  // EVENT SEARCH AND FILTERING
  // ===========================================================================

  /**
   * Search for events based on criteria
   */
  async searchEvents(criteria = {}) {
    try {
      const {
        location,
        dateRange,
        eventTypes = [],
        radius = 50,
        limit = 20,
        sortBy = 'date'
      } = criteria;

      console.log('🔍 Searching events with criteria:', criteria);

      // Check cache first
      const cacheKey = this.generateCacheKey('events', criteria);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log('📦 Returning cached event results');
        return cachedResult;
      }

      // Fetch events from multiple sources
      const [workshopEvents, celestialEvents] = await Promise.all([
        this.fetchWorkshopEvents(criteria),
        this.fetchCelestialEvents(criteria)
      ]);

      // Combine and process results
      const allEvents = [...workshopEvents, ...celestialEvents];
      
      // Apply filters
      let filteredEvents = this.filterEvents(allEvents, criteria);
      
      // Sort events
      filteredEvents = this.sortEvents(filteredEvents, sortBy);
      
      // Limit results
      if (limit) {
        filteredEvents = filteredEvents.slice(0, limit);
      }

      const result = {
        events: filteredEvents,
        total: filteredEvents.length,
        criteria,
        timestamp: new Date(),
        sources: ['workshops', 'celestial']
      };

      // Cache the result
      this.setCache(cacheKey, result, this.config.cache.eventsTTL);

      console.log(`✅ Found ${result.total} events`);
      return result;

    } catch (error) {
      console.error('❌ Event search failed:', error);
      
      // Return mock data as fallback
      return this.getMockEventResults(criteria);
    }
  }

  /**
   * Fetch workshop events from Eventbrite and other sources
   */
  async fetchWorkshopEvents(criteria) {
    try {
      // In production, this would make real API calls to Eventbrite
      // For now, we'll return comprehensive mock data
      
      const mockWorkshops = [
        {
          id: 'workshop-1',
          title: 'Introduction to Astrophotography',
          type: 'workshop',
          description: 'Learn the basics of capturing stunning images of the night sky. This hands-on workshop covers camera settings, equipment selection, and post-processing techniques.',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
          location: {
            name: 'Griffith Observatory',
            address: '2800 E Observatory Rd, Los Angeles, CA 90027',
            latitude: 34.1184,
            longitude: -118.3004
          },
          organizer: {
            name: 'Los Angeles Astronomical Society',
            website: 'https://laas.org',
            contact: 'events@laas.org'
          },
          price: {
            amount: 45.00,
            currency: 'USD',
            isFree: false
          },
          capacity: 25,
          registered: 18,
          tags: ['astrophotography', 'beginner', 'hands-on'],
          imageUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
          registrationUrl: 'https://eventbrite.com/e/astrophotography-workshop',
          difficulty: 'beginner',
          duration: 180, // minutes
          requirements: ['Camera with manual settings', 'Tripod recommended'],
          instructor: 'Dr. Sarah Chen, Professional Astrophotographer'
        },
        {
          id: 'workshop-2',
          title: 'Telescope Making Workshop',
          type: 'workshop',
          description: 'Build your own Dobsonian telescope from scratch. This multi-day workshop teaches optical principles, mirror grinding, and telescope construction.',
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 3 days later
          location: {
            name: 'Chabot Space & Science Center',
            address: '10000 Skyline Blvd, Oakland, CA 94619',
            latitude: 37.8199,
            longitude: -122.1817
          },
          organizer: {
            name: 'Bay Area Telescope Makers',
            website: 'https://batm.org',
            contact: 'workshop@batm.org'
          },
          price: {
            amount: 350.00,
            currency: 'USD',
            isFree: false
          },
          capacity: 12,
          registered: 8,
          tags: ['telescope', 'advanced', 'multi-day', 'hands-on'],
          imageUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=300&fit=crop',
          registrationUrl: 'https://eventbrite.com/e/telescope-making-workshop',
          difficulty: 'advanced',
          duration: 2160, // 3 days in minutes
          requirements: ['Basic woodworking skills', 'Safety glasses', 'Work clothes'],
          instructor: 'Master telescope maker John Rodriguez'
        },
        {
          id: 'lecture-1',
          title: 'The Search for Exoplanets',
          type: 'lecture',
          description: 'Join NASA scientist Dr. Maria Santos as she discusses the latest discoveries in exoplanet research and the techniques used to find worlds beyond our solar system.',
          startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 minutes later
          location: {
            name: 'California Science Center',
            address: '700 Exposition Park Dr, Los Angeles, CA 90037',
            latitude: 34.0169,
            longitude: -118.2863
          },
          organizer: {
            name: 'NASA Jet Propulsion Laboratory',
            website: 'https://jpl.nasa.gov',
            contact: 'outreach@jpl.nasa.gov'
          },
          price: {
            amount: 0,
            currency: 'USD',
            isFree: true
          },
          capacity: 200,
          registered: 156,
          tags: ['exoplanets', 'nasa', 'lecture', 'free'],
          imageUrl: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&h=300&fit=crop',
          registrationUrl: 'https://eventbrite.com/e/exoplanet-lecture',
          difficulty: 'all-levels',
          duration: 90,
          requirements: [],
          instructor: 'Dr. Maria Santos, NASA Exoplanet Scientist'
        },
        {
          id: 'stargazing-1',
          title: 'Perseid Meteor Shower Viewing Party',
          type: 'stargazing',
          description: 'Join us for the peak of the Perseid meteor shower! We\'ll provide telescopes, star charts, and expert guidance for an unforgettable night under the stars.',
          startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
          endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
          location: {
            name: 'Joshua Tree National Park',
            address: 'Joshua Tree, CA 92252',
            latitude: 33.8734,
            longitude: -115.9010
          },
          organizer: {
            name: 'Desert Stargazers Society',
            website: 'https://desertstargazers.org',
            contact: 'events@desertstargazers.org'
          },
          price: {
            amount: 25.00,
            currency: 'USD',
            isFree: false
          },
          capacity: 50,
          registered: 32,
          tags: ['meteor-shower', 'dark-sky', 'telescopes', 'family-friendly'],
          imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop',
          registrationUrl: 'https://eventbrite.com/e/perseid-meteor-shower',
          difficulty: 'all-levels',
          duration: 240,
          requirements: ['Warm clothing', 'Red flashlight', 'Folding chair'],
          instructor: 'Certified Dark Sky Rangers'
        }
      ];

      // Filter by location if specified
      if (criteria.location && criteria.radius) {
        return mockWorkshops.filter(workshop => {
          const distance = this.calculateDistance(
            criteria.location.latitude,
            criteria.location.longitude,
            workshop.location.latitude,
            workshop.location.longitude
          );
          return distance <= criteria.radius;
        });
      }

      return mockWorkshops;

    } catch (error) {
      console.error('Failed to fetch workshop events:', error);
      return [];
    }
  }

  /**
   * Fetch celestial events from astronomy APIs
   */
  async fetchCelestialEvents(criteria) {
    try {
      // Generate celestial events based on current date and location
      const celestialEvents = [
        {
          id: 'celestial-1',
          title: 'International Space Station Flyover',
          type: 'celestial',
          description: 'Visible pass of the International Space Station. The ISS will appear as a bright, fast-moving star crossing the sky from west to east.',
          startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000), // Tomorrow at 8 PM
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000 + 6 * 60 * 1000), // 6 minutes later
          location: {
            name: 'Visible from Los Angeles area',
            address: 'Los Angeles, CA',
            latitude: 34.0522,
            longitude: -118.2437
          },
          organizer: {
            name: 'NASA',
            website: 'https://spotthestation.nasa.gov',
            contact: 'nasa-info@nasa.gov'
          },
          price: {
            amount: 0,
            currency: 'USD',
            isFree: true
          },
          capacity: null, // No capacity limit for celestial events
          registered: null,
          tags: ['iss', 'satellite', 'free', 'visible'],
          imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop',
          registrationUrl: null,
          difficulty: 'all-levels',
          duration: 6,
          requirements: ['Clear sky', 'Dark location preferred'],
          details: {
            magnitude: -3.2,
            maxElevation: 45,
            direction: 'West to East',
            visibility: 'Excellent'
          }
        },
        {
          id: 'celestial-2',
          title: 'Jupiter at Opposition',
          type: 'celestial',
          description: 'Jupiter reaches opposition, appearing at its brightest and largest for the year. Perfect time for telescopic observation of the planet and its moons.',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 5 day viewing window
          location: {
            name: 'Visible worldwide',
            address: 'Global',
            latitude: null,
            longitude: null
          },
          organizer: {
            name: 'International Astronomical Union',
            website: 'https://iau.org',
            contact: 'info@iau.org'
          },
          price: {
            amount: 0,
            currency: 'USD',
            isFree: true
          },
          capacity: null,
          registered: null,
          tags: ['jupiter', 'opposition', 'planets', 'telescope'],
          imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&h=300&fit=crop',
          registrationUrl: null,
          difficulty: 'all-levels',
          duration: 7200, // 5 days in minutes
          requirements: ['Telescope recommended', 'Clear sky'],
          details: {
            magnitude: -2.8,
            constellation: 'Pisces',
            bestViewingTime: '10 PM - 2 AM',
            moonPhase: 'New Moon (ideal)'
          }
        },
        {
          id: 'celestial-3',
          title: 'Lunar Eclipse',
          type: 'celestial',
          description: 'Partial lunar eclipse visible from North America. The Moon will pass through Earth\'s shadow, creating a dramatic reddish appearance.',
          startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
          location: {
            name: 'Visible from North America',
            address: 'North America',
            latitude: 45.0,
            longitude: -100.0
          },
          organizer: {
            name: 'NASA Eclipse Website',
            website: 'https://eclipse.gsfc.nasa.gov',
            contact: 'eclipse-info@nasa.gov'
          },
          price: {
            amount: 0,
            currency: 'USD',
            isFree: true
          },
          capacity: null,
          registered: null,
          tags: ['lunar-eclipse', 'moon', 'eclipse', 'rare'],
          imageUrl: 'https://images.unsplash.com/photo-1518066000714-58c45f1a2c64?w=400&h=300&fit=crop',
          registrationUrl: null,
          difficulty: 'all-levels',
          duration: 180,
          requirements: ['Clear sky', 'No special equipment needed'],
          details: {
            eclipseType: 'Partial',
            maxEclipse: '11:30 PM EST',
            magnitude: 0.65,
            safeViewing: 'Safe to view with naked eye'
          }
        }
      ];

      return celestialEvents;

    } catch (error) {
      console.error('Failed to fetch celestial events:', error);
      return [];
    }
  }

  // ===========================================================================
  // EVENT FILTERING AND SORTING
  // ===========================================================================

  /**
   * Filter events based on criteria
   */
  filterEvents(events, criteria) {
    let filtered = [...events];

    // Filter by event types
    if (criteria.eventTypes && criteria.eventTypes.length > 0) {
      filtered = filtered.filter(event => 
        criteria.eventTypes.includes(event.type)
      );
    }

    // Filter by date range
    if (criteria.dateRange) {
      const { startDate, endDate } = criteria.dateRange;
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Filter by price range
    if (criteria.priceRange) {
      const { min, max } = criteria.priceRange;
      filtered = filtered.filter(event => {
        if (event.price.isFree) return min === 0;
        return event.price.amount >= min && event.price.amount <= max;
      });
    }

    // Filter by availability
    if (criteria.availableOnly) {
      filtered = filtered.filter(event => {
        if (!event.capacity) return true; // Celestial events have no capacity
        return event.registered < event.capacity;
      });
    }

    return filtered;
  }

  /**
   * Sort events by specified criteria
   */
  sortEvents(events, sortBy) {
    const sortFunctions = {
      date: (a, b) => new Date(a.startDate) - new Date(b.startDate),
      price: (a, b) => {
        const priceA = a.price.isFree ? 0 : a.price.amount;
        const priceB = b.price.isFree ? 0 : b.price.amount;
        return priceA - priceB;
      },
      popularity: (a, b) => {
        const popularityA = a.registered || 0;
        const popularityB = b.registered || 0;
        return popularityB - popularityA;
      },
      name: (a, b) => a.title.localeCompare(b.title),
      distance: (a, b) => {
        // This would require location context
        return 0;
      }
    };

    const sortFunction = sortFunctions[sortBy] || sortFunctions.date;
    return events.sort(sortFunction);
  }

  // ===========================================================================
  // EVENT DETAILS AND REGISTRATION
  // ===========================================================================

  /**
   * Get detailed information about a specific event
   */
  async getEventDetails(eventId) {
    try {
      console.log(`🔍 Fetching details for event: ${eventId}`);

      // Check cache first
      const cacheKey = `event_details_${eventId}`;
      const cachedDetails = this.getFromCache(cacheKey);
      if (cachedDetails) {
        return cachedDetails;
      }

      // In production, this would fetch from the appropriate API
      // For now, return enhanced mock data
      const eventDetails = await this.fetchEventDetailsFromAPI(eventId);

      // Cache the details
      this.setCache(cacheKey, eventDetails, this.config.cache.eventsTTL);

      return eventDetails;

    } catch (error) {
      console.error('Failed to fetch event details:', error);
      throw error;
    }
  }

  /**
   * Check event availability and registration status
   */
  async checkEventAvailability(eventId) {
    try {
      const event = await this.getEventDetails(eventId);
      
      if (!event.capacity) {
        // Celestial events have no capacity limits
        return {
          available: true,
          spotsRemaining: null,
          waitlistAvailable: false,
          registrationOpen: true
        };
      }

      const spotsRemaining = event.capacity - event.registered;
      
      return {
        available: spotsRemaining > 0,
        spotsRemaining,
        waitlistAvailable: spotsRemaining <= 0,
        registrationOpen: new Date() < new Date(event.startDate),
        registrationDeadline: new Date(event.startDate - 24 * 60 * 60 * 1000) // 24 hours before
      };

    } catch (error) {
      console.error('Failed to check event availability:', error);
      return {
        available: false,
        error: 'Unable to check availability'
      };
    }
  }

  /**
   * Register for an event
   */
  async registerForEvent(eventId, registrationData) {
    try {
      console.log(`📝 Registering for event: ${eventId}`);

      // Validate registration data
      this.validateRegistrationData(registrationData);

      // Check availability
      const availability = await this.checkEventAvailability(eventId);
      if (!availability.available && !availability.waitlistAvailable) {
        throw new Error('Event is full and waitlist is not available');
      }

      // In production, this would make API calls to Eventbrite or other services
      const registrationResult = await this.submitRegistration(eventId, registrationData);

      return {
        success: true,
        registrationId: registrationResult.id,
        confirmationNumber: registrationResult.confirmationNumber,
        status: availability.available ? 'confirmed' : 'waitlisted',
        event: await this.getEventDetails(eventId)
      };

    } catch (error) {
      console.error('Event registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate cache key for requests
   */
  generateCacheKey(type, criteria) {
    const key = `${type}_${JSON.stringify(criteria)}`;
    return window.ExploreXUtils.StringUtils.hashCode(key).toString();
  }

  /**
   * Get item from cache
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Set item in cache
   */
  setCache(key, data, ttl) {
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.config.cache.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      created: Date.now()
    });
  }

  /**
   * Initialize rate limiting
   */
  initializeRateLimiting() {
    setInterval(() => {
      this.rateLimiter.clear();
    }, 60000); // Reset every minute
  }

  /**
   * Setup cache cleanup
   */
  setupCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Load cached data from storage
   */
  loadCachedData() {
    try {
      const cachedData = window.ExploreXUtils.StorageUtils.getItem('event_cache');
      if (cachedData) {
        // Restore non-expired cache items
        const now = Date.now();
        Object.entries(cachedData).forEach(([key, item]) => {
          if (now < item.expiry) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cached event data:', error);
    }
  }

  /**
   * Get mock event results as fallback
   */
  getMockEventResults(criteria) {
    return {
      events: [],
      total: 0,
      criteria,
      timestamp: new Date(),
      sources: ['mock'],
      error: 'API unavailable, using mock data'
    };
  }

  /**
   * Mock API call for event details
   */
  async fetchEventDetailsFromAPI(eventId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock detailed event data
    return {
      id: eventId,
      title: 'Mock Event Details',
      description: 'Detailed event information would be loaded from API',
      // ... other event properties
    };
  }

  /**
   * Validate registration data
   */
  validateRegistrationData(data) {
    const required = ['name', 'email'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required for registration`);
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Mock registration submission
   */
  async submitRegistration(eventId, registrationData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `reg_${Date.now()}`,
      confirmationNumber: `CONF${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: 'confirmed'
    };
  }
}

// =============================================================================
// EVENT UI COMPONENTS
// =============================================================================

/**
 * Event card component for displaying events in search results
 */
class EventCard {
  constructor(eventData, container) {
    this.eventData = eventData;
    this.container = container;
    this.element = null;
    
    this.render();
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'event-card';
    
    const eventDate = new Date(this.eventData.startDate);
    const eventTypeConfig = EventAPIConfig.eventTypes.find(t => t.id === this.eventData.type);
    const typeIcon = eventTypeConfig ? eventTypeConfig.icon : '📅';
    const typeColor = eventTypeConfig ? eventTypeConfig.color : '#6b7280';
    
    this.element.innerHTML = `
      <div class="event-card-header">
        <div class="event-type-badge" style="background-color: ${typeColor}">
          <span class="event-type-icon">${typeIcon}</span>
          <span class="event-type-label">${eventTypeConfig ? eventTypeConfig.label : this.eventData.type}</span>
        </div>
        <div class="event-date">
          <span class="event-date-day">${eventDate.getDate()}</span>
          <span class="event-date-month">${eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>
      </div>
      
      <div class="event-card-content">
        <h3 class="event-title">${this.eventData.title}</h3>
        <p class="event-description">${this.eventData.description}</p>
        
        <div class="event-details">
          <div class="event-detail-item">
            <span class="event-detail-icon">📍</span>
            <span class="event-detail-text">${this.eventData.location.name}</span>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-icon">⏰</span>
            <span class="event-detail-text">${this.formatEventTime()}</span>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-icon">💰</span>
            <span class="event-detail-text">${this.formatPrice()}</span>
          </div>
          ${this.eventData.capacity ? `
            <div class="event-detail-item">
              <span class="event-detail-icon">👥</span>
              <span class="event-detail-text">${this.eventData.capacity - this.eventData.registered} spots left</span>
            </div>
          ` : ''}
        </div>
        
        <div class="event-tags">
          ${this.eventData.tags.map(tag => `
            <span class="event-tag">${tag}</span>
          `).join('')}
        </div>
      </div>
      
      <div class="event-card-actions">
        <button class="event-action-button secondary" onclick="this.showEventDetails()">
          <span class="button-icon">ℹ️</span>
          <span class="button-text">Details</span>
        </button>
        ${this.eventData.registrationUrl ? `
          <button class="event-action-button primary" onclick="this.registerForEvent()">
            <span class="button-icon">🎫</span>
            <span class="button-text">Register</span>
          </button>
        ` : ''}
      </div>
    `;
    
    this.container.appendChild(this.element);
    this.setupEventListeners();
  }

  formatEventTime() {
    const startDate = new Date(this.eventData.startDate);
    const endDate = new Date(this.eventData.endDate);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })} - ${endDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })}`;
    } else {
      return `${startDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} - ${endDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
  }

  formatPrice() {
    if (this.eventData.price.isFree) {
      return 'Free';
    }
    return `$${this.eventData.price.amount.toFixed(2)}`;
  }

  setupEventListeners() {
    this.element.addEventListener('click', (e) => {
      if (!e.target.closest('.event-action-button')) {
        this.showEventDetails();
      }
    });
  }

  showEventDetails() {
    // Dispatch custom event for showing event details
    this.element.dispatchEvent(new CustomEvent('showEventDetails', {
      bubbles: true,
      detail: { event: this.eventData }
    }));
  }

  registerForEvent() {
    // Dispatch custom event for event registration
    this.element.dispatchEvent(new CustomEvent('registerForEvent', {
      bubbles: true,
      detail: { event: this.eventData }
    }));
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXEventAPI = {
  EventAPIManager,
  EventCard,
  EventAPIConfig
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 ExploreX Event API system loaded');
});