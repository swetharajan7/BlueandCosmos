/**
 * ExploreX Experience Database and Data Management
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive database functionality including:
 * - Experience database with CRUD operations
 * - Data seeding with real space attractions
 * - Search and filtering capabilities
 * - Data validation and integrity checks
 * - Import/export functionality
 */

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const DatabaseConfig = {
  // Storage configuration
  storageKey: 'explorex_database',
  backupKey: 'explorex_database_backup',
  version: '1.0.0',
  
  // Performance settings
  maxCacheSize: 1000,
  indexRebuildThreshold: 100,
  
  // Data validation settings
  requireValidation: true,
  strictMode: false
};

// =============================================================================
// EXPERIENCE DATABASE CLASS
// =============================================================================

class ExperienceDatabase {
  constructor() {
    this.experiences = new Map();
    this.events = new Map();
    this.indexes = {
      byType: new Map(),
      byLocation: new Map(),
      byRating: new Map(),
      byState: new Map(),
      byTags: new Map()
    };
    this.cache = new Map();
    this.isInitialized = false;
    this.lastModified = new Date();
  }

  // ===========================================================================
  // INITIALIZATION AND DATA LOADING
  // ===========================================================================

  /**
   * Initialize database with seeded data
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Try to load from localStorage first
      const loaded = this.loadFromStorage();
      
      if (!loaded || this.experiences.size === 0) {
        // Seed with default data if no stored data
        await this.seedDatabase();
      }

      // Build indexes for performance
      this.rebuildIndexes();
      
      this.isInitialized = true;
      console.log(`✅ ExploreX Database initialized with ${this.experiences.size} experiences`);
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Fallback to seeded data
      await this.seedDatabase();
      this.rebuildIndexes();
      this.isInitialized = true;
    }
  }

  /**
   * Seed database with comprehensive space experience data
   */
  async seedDatabase() {
    console.log('🌱 Seeding ExploreX database with space experiences...');

    // Clear existing data
    this.experiences.clear();
    this.events.clear();

    // Seed experiences
    const experiences = this.getSeededExperiences();
    for (const expData of experiences) {
      const experience = new window.ExploreXModels.Experience(expData);
      this.experiences.set(experience.id, experience);
    }

    // Seed events
    const events = this.getSeededEvents();
    for (const eventData of events) {
      const event = new window.ExploreXModels.Event(eventData);
      this.events.set(event.id, event);
    }

    // Save to storage
    this.saveToStorage();
    
    console.log(`✅ Database seeded with ${this.experiences.size} experiences and ${this.events.size} events`);
  }

  // ===========================================================================
  // EXPERIENCE CRUD OPERATIONS
  // ===========================================================================

  /**
   * Add new experience to database
   */
  addExperience(experienceData) {
    // Validate data
    if (DatabaseConfig.requireValidation) {
      const validation = window.ExploreXModels.DataValidator.validateExperience(experienceData);
      if (!validation.isValid) {
        throw new Error(`Invalid experience data: ${validation.errors.join(', ')}`);
      }
    }

    const experience = new window.ExploreXModels.Experience(experienceData);
    this.experiences.set(experience.id, experience);
    
    // Update indexes
    this.updateIndexesForExperience(experience);
    
    // Clear cache
    this.cache.clear();
    
    // Save to storage
    this.saveToStorage();
    
    return experience;
  }

  /**
   * Get experience by ID
   */
  getExperience(id) {
    return this.experiences.get(id);
  }

  /**
   * Update existing experience
   */
  updateExperience(id, updates) {
    const experience = this.experiences.get(id);
    if (!experience) {
      throw new Error(`Experience with ID ${id} not found`);
    }

    // Apply updates
    Object.assign(experience, updates);
    experience.lastUpdated = new Date();

    // Update indexes
    this.updateIndexesForExperience(experience);
    
    // Clear cache
    this.cache.clear();
    
    // Save to storage
    this.saveToStorage();
    
    return experience;
  }

  /**
   * Delete experience
   */
  deleteExperience(id) {
    const experience = this.experiences.get(id);
    if (!experience) {
      throw new Error(`Experience with ID ${id} not found`);
    }

    this.experiences.delete(id);
    
    // Remove from indexes
    this.removeFromIndexes(experience);
    
    // Clear cache
    this.cache.clear();
    
    // Save to storage
    this.saveToStorage();
    
    return true;
  }

  /**
   * Get all experiences
   */
  getAllExperiences() {
    return Array.from(this.experiences.values());
  }

  // ===========================================================================
  // SEARCH AND FILTERING
  // ===========================================================================

  /**
   * Search experiences with comprehensive criteria
   */
  searchExperiences(criteria) {
    const cacheKey = JSON.stringify(criteria);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let results = Array.from(this.experiences.values());

    // Apply filters
    if (criteria.types && criteria.types.length > 0) {
      results = results.filter(exp => criteria.types.includes(exp.type));
    }

    if (criteria.location && criteria.maxDistance) {
      results = results.filter(exp => {
        const distance = criteria.location.distanceTo(exp.location);
        return distance <= criteria.maxDistance;
      });
    }

    if (criteria.minRating) {
      results = results.filter(exp => exp.rating >= criteria.minRating);
    }

    if (criteria.maxPrice !== undefined) {
      results = results.filter(exp => {
        const price = exp.admissionFee.getPrice('adult');
        return price <= criteria.maxPrice;
      });
    }

    if (criteria.accessibilityRequirements && criteria.accessibilityRequirements.length > 0) {
      results = results.filter(exp => {
        return criteria.accessibilityRequirements.every(req => 
          exp.accessibility.hasSupport(req)
        );
      });
    }

    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      results = results.filter(exp => {
        const searchableText = [
          exp.name,
          exp.description,
          exp.shortDescription,
          exp.address.city,
          exp.address.state,
          ...exp.tags
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchLower);
      });
    }

    if (criteria.states && criteria.states.length > 0) {
      results = results.filter(exp => 
        criteria.states.includes(exp.address.state)
      );
    }

    if (criteria.featured !== undefined) {
      results = results.filter(exp => exp.featured === criteria.featured);
    }

    if (criteria.verified !== undefined) {
      results = results.filter(exp => exp.verified === criteria.verified);
    }

    // Calculate relevance scores if location provided
    if (criteria.location) {
      results = results.map(exp => ({
        ...exp,
        distance: criteria.location.distanceTo(exp.location),
        relevanceScore: exp.calculateRelevanceScore(criteria)
      }));
    }

    // Apply sorting
    results = this.sortResults(results, criteria.sortBy, criteria.sortOrder);

    // Apply pagination
    const startIndex = criteria.offset || 0;
    const endIndex = startIndex + (criteria.limit || results.length);
    const paginatedResults = results.slice(startIndex, endIndex);

    const searchResult = new window.ExploreXModels.SearchResult({
      experiences: paginatedResults,
      total: results.length,
      hasMore: endIndex < results.length,
      searchCriteria: criteria
    });

    // Cache result
    if (this.cache.size < DatabaseConfig.maxCacheSize) {
      this.cache.set(cacheKey, searchResult);
    }

    return searchResult;
  }

  /**
   * Get experiences by type
   */
  getExperiencesByType(type) {
    if (this.indexes.byType.has(type)) {
      return this.indexes.byType.get(type);
    }
    return [];
  }

  /**
   * Get experiences by state
   */
  getExperiencesByState(state) {
    if (this.indexes.byState.has(state)) {
      return this.indexes.byState.get(state);
    }
    return [];
  }

  /**
   * Get featured experiences
   */
  getFeaturedExperiences(limit = 10) {
    return Array.from(this.experiences.values())
      .filter(exp => exp.featured)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get top-rated experiences
   */
  getTopRatedExperiences(limit = 10) {
    return Array.from(this.experiences.values())
      .filter(exp => exp.reviewCount >= 5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get experiences near location
   */
  getNearbyExperiences(location, radiusMiles = 50, limit = 20) {
    return Array.from(this.experiences.values())
      .map(exp => ({
        ...exp,
        distance: location.distanceTo(exp.location)
      }))
      .filter(exp => exp.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // ===========================================================================
  // INDEXING AND PERFORMANCE
  // ===========================================================================

  /**
   * Rebuild all indexes for performance
   */
  rebuildIndexes() {
    // Clear existing indexes
    Object.values(this.indexes).forEach(index => index.clear());

    // Rebuild indexes
    for (const experience of this.experiences.values()) {
      this.updateIndexesForExperience(experience);
    }

    console.log('📊 Database indexes rebuilt');
  }

  /**
   * Update indexes for a single experience
   */
  updateIndexesForExperience(experience) {
    // Type index
    if (!this.indexes.byType.has(experience.type)) {
      this.indexes.byType.set(experience.type, []);
    }
    this.indexes.byType.get(experience.type).push(experience);

    // State index
    const state = experience.address.state;
    if (state) {
      if (!this.indexes.byState.has(state)) {
        this.indexes.byState.set(state, []);
      }
      this.indexes.byState.get(state).push(experience);
    }

    // Rating index
    const ratingBucket = Math.floor(experience.rating);
    if (!this.indexes.byRating.has(ratingBucket)) {
      this.indexes.byRating.set(ratingBucket, []);
    }
    this.indexes.byRating.get(ratingBucket).push(experience);

    // Tags index
    for (const tag of experience.tags) {
      if (!this.indexes.byTags.has(tag)) {
        this.indexes.byTags.set(tag, []);
      }
      this.indexes.byTags.get(tag).push(experience);
    }
  }

  /**
   * Remove experience from indexes
   */
  removeFromIndexes(experience) {
    // Remove from type index
    const typeExperiences = this.indexes.byType.get(experience.type);
    if (typeExperiences) {
      const index = typeExperiences.findIndex(exp => exp.id === experience.id);
      if (index !== -1) {
        typeExperiences.splice(index, 1);
      }
    }

    // Remove from other indexes similarly...
    // (Implementation would continue for all indexes)
  }

  /**
   * Sort search results
   */
  sortResults(results, sortBy = 'relevance', sortOrder = 'desc') {
    const sortFunctions = {
      relevance: (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0),
      distance: (a, b) => (a.distance || 0) - (b.distance || 0),
      rating: (a, b) => b.rating - a.rating,
      price: (a, b) => a.admissionFee.getPrice('adult') - b.admissionFee.getPrice('adult'),
      name: (a, b) => a.name.localeCompare(b.name),
      reviewCount: (a, b) => b.reviewCount - a.reviewCount,
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    };

    const sortFn = sortFunctions[sortBy] || sortFunctions.relevance;
    results.sort(sortFn);

    if (sortOrder === 'asc') {
      results.reverse();
    }

    return results;
  }

  // ===========================================================================
  // DATA PERSISTENCE
  // ===========================================================================

  /**
   * Save database to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        version: DatabaseConfig.version,
        timestamp: new Date().toISOString(),
        experiences: Array.from(this.experiences.entries()),
        events: Array.from(this.events.entries()),
        lastModified: this.lastModified.toISOString()
      };

      const serialized = JSON.stringify(data);
      localStorage.setItem(DatabaseConfig.storageKey, serialized);
      
      // Create backup
      localStorage.setItem(DatabaseConfig.backupKey, serialized);
      
    } catch (error) {
      console.error('Failed to save database to storage:', error);
    }
  }

  /**
   * Load database from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(DatabaseConfig.storageKey);
      if (!stored) return false;

      const data = JSON.parse(stored);
      
      // Version check
      if (data.version !== DatabaseConfig.version) {
        console.warn('Database version mismatch, will reseed');
        return false;
      }

      // Restore experiences
      this.experiences.clear();
      for (const [id, expData] of data.experiences) {
        const experience = new window.ExploreXModels.Experience(expData);
        this.experiences.set(id, experience);
      }

      // Restore events
      this.events.clear();
      for (const [id, eventData] of data.events) {
        const event = new window.ExploreXModels.Event(eventData);
        this.events.set(id, event);
      }

      this.lastModified = new Date(data.lastModified);
      
      console.log(`📂 Database loaded from storage: ${this.experiences.size} experiences`);
      return true;
      
    } catch (error) {
      console.error('Failed to load database from storage:', error);
      return false;
    }
  }

  /**
   * Export database as JSON
   */
  exportData() {
    return {
      version: DatabaseConfig.version,
      exportDate: new Date().toISOString(),
      experiences: Array.from(this.experiences.values()),
      events: Array.from(this.events.values()),
      statistics: this.getStatistics()
    };
  }

  /**
   * Import database from JSON
   */
  importData(data) {
    try {
      this.experiences.clear();
      this.events.clear();

      // Import experiences
      for (const expData of data.experiences) {
        const experience = new window.ExploreXModels.Experience(expData);
        this.experiences.set(experience.id, experience);
      }

      // Import events
      for (const eventData of data.events) {
        const event = new window.ExploreXModels.Event(eventData);
        this.events.set(event.id, event);
      }

      this.rebuildIndexes();
      this.saveToStorage();
      
      console.log(`📥 Database imported: ${this.experiences.size} experiences`);
      return true;
      
    } catch (error) {
      console.error('Failed to import database:', error);
      return false;
    }
  }

  // ===========================================================================
  // STATISTICS AND ANALYTICS
  // ===========================================================================

  /**
   * Get database statistics
   */
  getStatistics() {
    const experiences = Array.from(this.experiences.values());
    
    return {
      totalExperiences: experiences.length,
      totalEvents: this.events.size,
      byType: this.getCountByType(experiences),
      byState: this.getCountByState(experiences),
      averageRating: this.getAverageRating(experiences),
      featuredCount: experiences.filter(exp => exp.featured).length,
      verifiedCount: experiences.filter(exp => exp.verified).length,
      freeExperiences: experiences.filter(exp => exp.admissionFee.isFree).length,
      lastUpdated: this.lastModified.toISOString()
    };
  }

  getCountByType(experiences) {
    const counts = {};
    for (const exp of experiences) {
      counts[exp.type] = (counts[exp.type] || 0) + 1;
    }
    return counts;
  }

  getCountByState(experiences) {
    const counts = {};
    for (const exp of experiences) {
      const state = exp.address.state;
      if (state) {
        counts[state] = (counts[state] || 0) + 1;
      }
    }
    return counts;
  }

  getAverageRating(experiences) {
    if (experiences.length === 0) return 0;
    const sum = experiences.reduce((acc, exp) => acc + exp.rating, 0);
    return sum / experiences.length;
  }

  // ===========================================================================
  // SEEDED DATA
  // ===========================================================================

  /**
   * Get comprehensive seeded experience data
   */
  getSeededExperiences() {
    return [
      // Major Space Centers
      {
        name: "Kennedy Space Center Visitor Complex",
        type: window.ExploreXModels.ExperienceType.SPACE_CENTER,
        description: "NASA's primary launch center featuring space shuttle exhibits, astronaut experiences, and rocket displays. Witness the history of space exploration with interactive exhibits, IMAX theaters, and the chance to meet real astronauts.",
        shortDescription: "NASA's historic launch site with interactive space exhibits and astronaut experiences",
        location: { latitude: 28.5721, longitude: -80.6480 },
        address: {
          street: "Space Commerce Way",
          city: "Merritt Island",
          state: "FL",
          country: "USA",
          postalCode: "32953",
          formattedAddress: "Kennedy Space Center, Merritt Island, FL 32953"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00" }, // Sunday
          { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" }, // Monday
          { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00" }, // Tuesday
          { dayOfWeek: 3, openTime: "09:00", closeTime: "18:00" }, // Wednesday
          { dayOfWeek: 4, openTime: "09:00", closeTime: "18:00" }, // Thursday
          { dayOfWeek: 5, openTime: "09:00", closeTime: "18:00" }, // Friday
          { dayOfWeek: 6, openTime: "09:00", closeTime: "18:00" }  // Saturday
        ],
        admissionFee: { adultPrice: 75, childPrice: 65, seniorPrice: 70, currency: "USD" },
        rating: 4.8,
        reviewCount: 3420,
        amenities: ["parking", "restaurant", "gift_shop", "restrooms", "wheelchair_accessible", "guided_tours"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true, visualImpairedSupport: true },
        contactInfo: { phone: "(855) 433-4210", website: "https://www.kennedyspacecenter.com" },
        tags: ["nasa", "space_center", "rockets", "astronauts", "florida", "launches", "space_shuttle"],
        featured: true,
        verified: true
      },

      {
        name: "Space Center Houston",
        type: window.ExploreXModels.ExperienceType.SPACE_CENTER,
        description: "Official visitor center of NASA Johnson Space Center, featuring astronaut training exhibits, mission control tours, and the largest collection of moon rocks and space artifacts.",
        shortDescription: "NASA Johnson Space Center's official visitor center with astronaut training exhibits",
        location: { latitude: 29.5518, longitude: -95.0979 },
        address: {
          street: "1601 E NASA Pkwy",
          city: "Houston",
          state: "TX",
          country: "USA",
          postalCode: "77058",
          formattedAddress: "1601 E NASA Pkwy, Houston, TX 77058"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "17:00" }
        ],
        admissionFee: { adultPrice: 30, childPrice: 25, seniorPrice: 27, currency: "USD" },
        rating: 4.6,
        reviewCount: 2890,
        amenities: ["parking", "restaurant", "gift_shop", "restrooms", "wheelchair_accessible", "tram_tours"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true },
        contactInfo: { phone: "(281) 244-2100", website: "https://spacecenter.org" },
        tags: ["nasa", "houston", "mission_control", "astronauts", "moon_rocks", "space_center"],
        featured: true,
        verified: true
      },

      // Major Observatories
      {
        name: "Griffith Observatory",
        type: window.ExploreXModels.ExperienceType.OBSERVATORY,
        description: "Iconic Los Angeles observatory offering free admission, planetarium shows, telescope viewing, and stunning views of the Hollywood sign and downtown LA skyline.",
        shortDescription: "Famous LA observatory with planetarium shows and city views",
        location: { latitude: 34.1184, longitude: -118.3004 },
        address: {
          street: "2800 E Observatory Rd",
          city: "Los Angeles",
          state: "CA",
          country: "USA",
          postalCode: "90027",
          formattedAddress: "2800 E Observatory Rd, Los Angeles, CA 90027"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "12:00", closeTime: "22:00" },
          { dayOfWeek: 1, isClosed: true },
          { dayOfWeek: 2, openTime: "12:00", closeTime: "22:00" },
          { dayOfWeek: 3, openTime: "12:00", closeTime: "22:00" },
          { dayOfWeek: 4, openTime: "12:00", closeTime: "22:00" },
          { dayOfWeek: 5, openTime: "12:00", closeTime: "22:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "22:00" }
        ],
        admissionFee: { isFree: true, currency: "USD", notes: "Planetarium shows have separate fees" },
        rating: 4.5,
        reviewCount: 1250,
        amenities: ["parking", "gift_shop", "restrooms", "telescope_viewing", "planetarium"],
        accessibility: { wheelchairAccessible: true, visualImpairedSupport: true },
        contactInfo: { phone: "(213) 473-0800", website: "https://griffithobservatory.org" },
        tags: ["observatory", "planetarium", "los_angeles", "hollywood", "free", "telescope"],
        featured: true,
        verified: true
      },

      {
        name: "Palomar Observatory",
        type: window.ExploreXModels.ExperienceType.OBSERVATORY,
        description: "Historic observatory home to the famous 200-inch Hale Telescope. Offers guided tours and stargazing programs in the mountains of Southern California.",
        shortDescription: "Historic observatory with the famous 200-inch Hale Telescope",
        location: { latitude: 33.3563, longitude: -116.8650 },
        address: {
          street: "35899 Canfield Rd",
          city: "Palomar Mountain",
          state: "CA",
          country: "USA",
          postalCode: "92060",
          formattedAddress: "35899 Canfield Rd, Palomar Mountain, CA 92060"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 1, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 2, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 3, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 4, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 5, openTime: "09:00", closeTime: "16:00" },
          { dayOfWeek: 6, openTime: "09:00", closeTime: "16:00" }
        ],
        admissionFee: { isFree: true, currency: "USD", notes: "Donations appreciated" },
        rating: 4.4,
        reviewCount: 680,
        amenities: ["parking", "restrooms", "guided_tours", "visitor_center"],
        accessibility: { wheelchairAccessible: false, notes: "Limited accessibility due to mountain location" },
        contactInfo: { phone: "(760) 742-2119", website: "https://www.astro.caltech.edu/palomar" },
        tags: ["observatory", "telescope", "california", "mountains", "astronomy", "research"],
        featured: true,
        verified: true
      },

      // Planetariums
      {
        name: "Hayden Planetarium",
        type: window.ExploreXModels.ExperienceType.PLANETARIUM,
        description: "World-renowned planetarium at the American Museum of Natural History, featuring immersive space shows and the famous Scales of the Universe exhibit.",
        shortDescription: "NYC's premier planetarium with immersive space shows",
        location: { latitude: 40.7813, longitude: -73.9737 },
        address: {
          street: "200 Central Park West",
          city: "New York",
          state: "NY",
          country: "USA",
          postalCode: "10024",
          formattedAddress: "200 Central Park West, New York, NY 10024"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:45" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:45" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:45" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:45" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:45" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "20:45" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "17:45" }
        ],
        admissionFee: { adultPrice: 28, childPrice: 22, studentPrice: 25, seniorPrice: 25, currency: "USD" },
        rating: 4.6,
        reviewCount: 890,
        amenities: ["parking", "restaurant", "gift_shop", "restrooms", "wheelchair_accessible"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true, assistiveListening: true },
        contactInfo: { phone: "(212) 769-5100", website: "https://www.amnh.org/planetarium" },
        tags: ["planetarium", "museum", "new_york", "education", "space_shows"],
        featured: true,
        verified: true
      },

      {
        name: "Adler Planetarium",
        type: window.ExploreXModels.ExperienceType.PLANETARIUM,
        description: "America's first planetarium, located on Chicago's lakefront with stunning city views. Features multiple theaters and extensive astronomy exhibits.",
        shortDescription: "America's first planetarium with multiple theaters and exhibits",
        location: { latitude: 41.8663, longitude: -87.6069 },
        address: {
          street: "1300 S DuSable Lake Shore Dr",
          city: "Chicago",
          state: "IL",
          country: "USA",
          postalCode: "60605",
          formattedAddress: "1300 S DuSable Lake Shore Dr, Chicago, IL 60605"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "09:30", closeTime: "16:00" },
          { dayOfWeek: 1, openTime: "09:30", closeTime: "16:00" },
          { dayOfWeek: 2, openTime: "09:30", closeTime: "16:00" },
          { dayOfWeek: 3, openTime: "09:30", closeTime: "16:00" },
          { dayOfWeek: 4, openTime: "09:30", closeTime: "16:00" },
          { dayOfWeek: 5, openTime: "09:30", closeTime: "22:00" },
          { dayOfWeek: 6, openTime: "09:30", closeTime: "16:00" }
        ],
        admissionFee: { adultPrice: 25, childPrice: 20, seniorPrice: 22, currency: "USD" },
        rating: 4.3,
        reviewCount: 1120,
        amenities: ["parking", "restaurant", "gift_shop", "restrooms", "wheelchair_accessible"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true },
        contactInfo: { phone: "(312) 922-7827", website: "https://www.adlerplanetarium.org" },
        tags: ["planetarium", "chicago", "lakefront", "historic", "astronomy"],
        featured: true,
        verified: true
      },

      // Space Museums
      {
        name: "National Air and Space Museum",
        type: window.ExploreXModels.ExperienceType.SPACE_MUSEUM,
        description: "Smithsonian's flagship museum featuring the largest collection of historic aircraft and spacecraft, including the Wright Flyer and Apollo 11 command module.",
        shortDescription: "Smithsonian's premier aviation and space museum",
        location: { latitude: 38.8882, longitude: -77.0199 },
        address: {
          street: "600 Independence Ave SW",
          city: "Washington",
          state: "DC",
          country: "USA",
          postalCode: "20560",
          formattedAddress: "600 Independence Ave SW, Washington, DC 20560"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "17:30" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "17:30" }
        ],
        admissionFee: { isFree: true, currency: "USD", notes: "Timed entry passes required" },
        rating: 4.7,
        reviewCount: 4560,
        amenities: ["restrooms", "gift_shop", "restaurant", "wheelchair_accessible", "guided_tours"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true, visualImpairedSupport: true },
        contactInfo: { phone: "(202) 633-2214", website: "https://airandspace.si.edu" },
        tags: ["museum", "smithsonian", "washington_dc", "aircraft", "spacecraft", "free"],
        featured: true,
        verified: true
      },

      // Additional Observatories
      {
        name: "Lowell Observatory",
        type: window.ExploreXModels.ExperienceType.OBSERVATORY,
        description: "Historic observatory where Pluto was discovered in 1930. Offers daytime tours and nighttime stargazing programs in Flagstaff's dark skies.",
        shortDescription: "Historic observatory where Pluto was discovered",
        location: { latitude: 35.2033, longitude: -111.6646 },
        address: {
          street: "1400 W Mars Hill Rd",
          city: "Flagstaff",
          state: "AZ",
          country: "USA",
          postalCode: "86001",
          formattedAddress: "1400 W Mars Hill Rd, Flagstaff, AZ 86001"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "22:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "22:00" }
        ],
        admissionFee: { adultPrice: 17, childPrice: 11, seniorPrice: 15, currency: "USD" },
        rating: 4.5,
        reviewCount: 920,
        amenities: ["parking", "gift_shop", "restrooms", "telescope_viewing", "guided_tours"],
        accessibility: { wheelchairAccessible: true },
        contactInfo: { phone: "(928) 774-3358", website: "https://lowell.edu" },
        tags: ["observatory", "pluto", "flagstaff", "arizona", "dark_skies", "historic"],
        featured: true,
        verified: true
      },

      {
        name: "McDonald Observatory",
        type: window.ExploreXModels.ExperienceType.OBSERVATORY,
        description: "University of Texas observatory featuring large research telescopes and public stargazing programs in the Davis Mountains of West Texas.",
        shortDescription: "UT observatory with large telescopes in dark West Texas skies",
        location: { latitude: 30.6719, longitude: -104.0247 },
        address: {
          street: "3640 Dark Sky Dr",
          city: "Fort Davis",
          state: "TX",
          country: "USA",
          postalCode: "79734",
          formattedAddress: "3640 Dark Sky Dr, Fort Davis, TX 79734"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "17:00" }
        ],
        admissionFee: { adultPrice: 12, childPrice: 8, studentPrice: 10, currency: "USD" },
        rating: 4.6,
        reviewCount: 540,
        amenities: ["parking", "restrooms", "visitor_center", "telescope_viewing"],
        accessibility: { wheelchairAccessible: true },
        contactInfo: { phone: "(432) 426-3640", website: "https://mcdonaldobservatory.org" },
        tags: ["observatory", "university", "texas", "research", "dark_skies"],
        featured: false,
        verified: true
      },

      // Science Centers
      {
        name: "California Science Center",
        type: window.ExploreXModels.ExperienceType.SCIENCE_CENTER,
        description: "Home to Space Shuttle Endeavour and featuring interactive science exhibits, IMAX theater, and hands-on learning experiences for all ages.",
        shortDescription: "Home to Space Shuttle Endeavour with interactive exhibits",
        location: { latitude: 34.0169, longitude: -118.2876 },
        address: {
          street: "700 Exposition Park Dr",
          city: "Los Angeles",
          state: "CA",
          country: "USA",
          postalCode: "90037",
          formattedAddress: "700 Exposition Park Dr, Los Angeles, CA 90037"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 1, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 2, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 3, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 4, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 5, openTime: "10:00", closeTime: "17:00" },
          { dayOfWeek: 6, openTime: "10:00", closeTime: "17:00" }
        ],
        admissionFee: { isFree: true, currency: "USD", notes: "Special exhibits may have fees" },
        rating: 4.4,
        reviewCount: 2340,
        amenities: ["parking", "restaurant", "gift_shop", "restrooms", "wheelchair_accessible", "imax_theater"],
        accessibility: { wheelchairAccessible: true, hearingImpairedSupport: true },
        contactInfo: { phone: "(323) 724-3623", website: "https://californiasciencecenter.org" },
        tags: ["science_center", "space_shuttle", "endeavour", "los_angeles", "free", "imax"],
        featured: true,
        verified: true
      },

      // Additional Unique Experiences
      {
        name: "Very Large Array Radio Observatory",
        type: window.ExploreXModels.ExperienceType.OBSERVATORY,
        description: "Iconic radio telescope array featured in movies like Contact. Offers self-guided tours and visitor center with exhibits about radio astronomy.",
        shortDescription: "Famous radio telescope array from the movie Contact",
        location: { latitude: 34.0784, longitude: -107.6184 },
        address: {
          street: "1003 Lopezville Rd",
          city: "Socorro",
          state: "NM",
          country: "USA",
          postalCode: "87801",
          formattedAddress: "1003 Lopezville Rd, Socorro, NM 87801"
        },
        operatingHours: [
          { dayOfWeek: 0, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 1, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 2, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 3, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 4, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 5, openTime: "08:30", closeTime: "16:30" },
          { dayOfWeek: 6, openTime: "08:30", closeTime: "16:30" }
        ],
        admissionFee: { isFree: true, currency: "USD" },
        rating: 4.7,
        reviewCount: 780,
        amenities: ["parking", "restrooms", "visitor_center", "self_guided_tours"],
        accessibility: { wheelchairAccessible: true },
        contactInfo: { phone: "(575) 835-7000", website: "https://public.nrao.edu/visit/very-large-array" },
        tags: ["radio_telescope", "observatory", "new_mexico", "contact_movie", "free", "unique"],
        featured: true,
        verified: true
      }
    ];
  }

  /**
   * Get seeded event data
   */
  getSeededEvents() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return [
      {
        title: "Stargazing Night: Winter Constellations",
        type: window.ExploreXModels.EventType.STARGAZING,
        description: "Join us for an evening of stargazing and learn about winter constellations visible from Los Angeles. Telescopes provided.",
        startDate: nextWeek,
        endDate: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000),
        location: { latitude: 34.1184, longitude: -118.3004 },
        venue: "Griffith Observatory",
        organizer: "Los Angeles Astronomical Society",
        registrationRequired: true,
        capacity: 50,
        availableSpots: 23,
        price: { adultPrice: 15, childPrice: 10, currency: "USD" },
        difficulty: window.ExploreXModels.DifficultyLevel.BEGINNER,
        tags: ["stargazing", "constellations", "beginner-friendly", "telescopes"]
      },
      {
        title: "Astrophotography Workshop",
        type: window.ExploreXModels.EventType.WORKSHOP,
        description: "Learn the basics of capturing stunning images of the night sky with your DSLR camera.",
        startDate: new Date(nextMonth.getTime() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(nextMonth.getTime() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        location: { latitude: 40.7813, longitude: -73.9737 },
        venue: "Hayden Planetarium",
        organizer: "NYC Astrophotography Club",
        registrationRequired: true,
        capacity: 20,
        availableSpots: 8,
        price: { adultPrice: 85, currency: "USD" },
        difficulty: window.ExploreXModels.DifficultyLevel.INTERMEDIATE,
        equipment: ["DSLR Camera", "Tripod", "Laptop"],
        tags: ["astrophotography", "workshop", "photography", "intermediate"]
      }
    ];
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

// Make database available globally
if (typeof window !== 'undefined') {
  window.ExploreXDatabase = {
    ExperienceDatabase,
    DatabaseConfig
  };
} else {
  module.exports = {
    ExperienceDatabase,
    DatabaseConfig
  };
}

console.log('✅ ExploreX Database module loaded successfully');