/**
 * ExploreX Core Data Models and Interfaces
 * Space Travel Experience Recommendation System
 * 
 * This file contains all the core data structures, validation schemas,
 * and utility functions for the ExploreX application.
 */

// =============================================================================
// CORE DATA MODELS
// =============================================================================

/**
 * Experience Types Enumeration
 */
const ExperienceType = {
  OBSERVATORY: 'observatory',
  PLANETARIUM: 'planetarium',
  SPACE_MUSEUM: 'space_museum',
  ASTRONOMY_LAB: 'astronomy_lab',
  STARGAZING_SITE: 'stargazing_site',
  SPACE_CENTER: 'space_center',
  SCIENCE_CENTER: 'science_center'
};

/**
 * Event Types Enumeration
 */
const EventType = {
  WORKSHOP: 'workshop',
  STARGAZING: 'stargazing',
  LECTURE: 'lecture',
  EXHIBITION: 'exhibition',
  CONFERENCE: 'conference',
  WEBINAR: 'webinar',
  ASTRONOMICAL_EVENT: 'astronomical_event'
};

/**
 * Astronomical Event Types
 */
const AstroEventType = {
  METEOR_SHOWER: 'meteor_shower',
  PLANET_CONJUNCTION: 'planet_conjunction',
  LUNAR_ECLIPSE: 'lunar_eclipse',
  SOLAR_ECLIPSE: 'solar_eclipse',
  COMET_VISIBILITY: 'comet_visibility',
  ISS_FLYOVER: 'iss_flyover'
};

/**
 * Difficulty Levels
 */
const DifficultyLevel = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
};

/**
 * Accessibility Requirements
 */
const AccessibilityRequirement = {
  WHEELCHAIR_ACCESSIBLE: 'wheelchair_accessible',
  HEARING_IMPAIRED_SUPPORT: 'hearing_impaired_support',
  VISUAL_IMPAIRED_SUPPORT: 'visual_impaired_support',
  MOBILITY_ASSISTANCE: 'mobility_assistance',
  SIGN_LANGUAGE: 'sign_language'
};

// =============================================================================
// DATA MODEL CLASSES
// =============================================================================

/**
 * Geographic Location Model
 */
class GeoLocation {
  constructor(data = {}) {
    this.latitude = data.latitude || 0;
    this.longitude = data.longitude || 0;
    this.accuracy = data.accuracy || null;
    this.altitude = data.altitude || null;
  }

  /**
   * Calculate distance to another location in miles
   */
  distanceTo(otherLocation) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(otherLocation.latitude - this.latitude);
    const dLon = this.toRadians(otherLocation.longitude - this.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(this.latitude)) * 
              Math.cos(this.toRadians(otherLocation.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  isValid() {
    return this.latitude >= -90 && this.latitude <= 90 &&
           this.longitude >= -180 && this.longitude <= 180;
  }
}

/**
 * Address Model
 */
class Address {
  constructor(data = {}) {
    this.street = data.street || '';
    this.city = data.city || '';
    this.state = data.state || '';
    this.country = data.country || '';
    this.postalCode = data.postalCode || '';
    this.formattedAddress = data.formattedAddress || '';
  }

  toString() {
    return this.formattedAddress || 
           `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`.trim();
  }
}

/**
 * Operating Hours Model
 */
class OperatingHours {
  constructor(data = {}) {
    this.dayOfWeek = data.dayOfWeek || 0; // 0 = Sunday, 6 = Saturday
    this.openTime = data.openTime || '09:00';
    this.closeTime = data.closeTime || '17:00';
    this.isClosed = data.isClosed || false;
    this.notes = data.notes || '';
  }

  isOpenAt(time) {
    if (this.isClosed) return false;
    
    const timeStr = typeof time === 'string' ? time : 
                   `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    return timeStr >= this.openTime && timeStr <= this.closeTime;
  }
}

/**
 * Pricing Information Model
 */
class PricingInfo {
  constructor(data = {}) {
    this.isFree = data.isFree || false;
    this.adultPrice = data.adultPrice || 0;
    this.childPrice = data.childPrice || 0;
    this.seniorPrice = data.seniorPrice || 0;
    this.studentPrice = data.studentPrice || 0;
    this.currency = data.currency || 'USD';
    this.notes = data.notes || '';
  }

  getPrice(category = 'adult') {
    if (this.isFree) return 0;
    
    switch (category.toLowerCase()) {
      case 'child': return this.childPrice;
      case 'senior': return this.seniorPrice;
      case 'student': return this.studentPrice;
      default: return this.adultPrice;
    }
  }

  formatPrice(category = 'adult') {
    const price = this.getPrice(category);
    if (price === 0) return 'Free';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(price);
  }
}

/**
 * Photo Model
 */
class Photo {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.url = data.url || '';
    this.thumbnailUrl = data.thumbnailUrl || '';
    this.caption = data.caption || '';
    this.photographer = data.photographer || '';
    this.license = data.license || '';
    this.width = data.width || 0;
    this.height = data.height || 0;
  }

  generateId() {
    return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

/**
 * Contact Information Model
 */
class ContactInfo {
  constructor(data = {}) {
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.website = data.website || '';
    this.socialMedia = data.socialMedia || {};
  }
}

/**
 * Accessibility Information Model
 */
class AccessibilityInfo {
  constructor(data = {}) {
    this.wheelchairAccessible = data.wheelchairAccessible || false;
    this.hearingImpairedSupport = data.hearingImpairedSupport || false;
    this.visualImpairedSupport = data.visualImpairedSupport || false;
    this.signLanguageAvailable = data.signLanguageAvailable || false;
    this.assistiveListening = data.assistiveListening || false;
    this.notes = data.notes || '';
  }

  hasSupport(requirement) {
    switch (requirement) {
      case AccessibilityRequirement.WHEELCHAIR_ACCESSIBLE:
        return this.wheelchairAccessible;
      case AccessibilityRequirement.HEARING_IMPAIRED_SUPPORT:
        return this.hearingImpairedSupport;
      case AccessibilityRequirement.VISUAL_IMPAIRED_SUPPORT:
        return this.visualImpairedSupport;
      case AccessibilityRequirement.SIGN_LANGUAGE:
        return this.signLanguageAvailable;
      default:
        return false;
    }
  }
}

/**
 * Experience Model - Core model for space-related attractions
 */
class Experience {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.type = data.type || ExperienceType.OBSERVATORY;
    this.description = data.description || '';
    this.shortDescription = data.shortDescription || '';
    this.location = new GeoLocation(data.location);
    this.address = new Address(data.address);
    this.operatingHours = (data.operatingHours || []).map(hours => new OperatingHours(hours));
    this.admissionFee = new PricingInfo(data.admissionFee);
    this.rating = data.rating || 0;
    this.reviewCount = data.reviewCount || 0;
    this.photos = (data.photos || []).map(photo => new Photo(photo));
    this.amenities = data.amenities || [];
    this.accessibility = new AccessibilityInfo(data.accessibility);
    this.contactInfo = new ContactInfo(data.contactInfo);
    this.website = data.website || '';
    this.tags = data.tags || [];
    this.featured = data.featured || false;
    this.verified = data.verified || false;
    this.lastUpdated = new Date(data.lastUpdated || Date.now());
    this.createdAt = new Date(data.createdAt || Date.now());
  }

  generateId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if experience is open at a specific date/time
   */
  isOpenAt(dateTime) {
    const dayOfWeek = dateTime.getDay();
    const hoursForDay = this.operatingHours.find(hours => hours.dayOfWeek === dayOfWeek);
    
    if (!hoursForDay) return false;
    return hoursForDay.isOpenAt(dateTime);
  }

  /**
   * Get distance from a location
   */
  distanceFrom(location) {
    return this.location.distanceTo(location);
  }

  /**
   * Check if experience matches search criteria
   */
  matchesCriteria(criteria) {
    // Type filter
    if (criteria.types && criteria.types.length > 0) {
      if (!criteria.types.includes(this.type)) return false;
    }

    // Location filter (within radius)
    if (criteria.location && criteria.maxDistance) {
      const distance = this.distanceFrom(criteria.location);
      if (distance > criteria.maxDistance) return false;
    }

    // Price filter
    if (criteria.maxPrice !== undefined) {
      const price = this.admissionFee.getPrice('adult');
      if (price > criteria.maxPrice) return false;
    }

    // Rating filter
    if (criteria.minRating) {
      if (this.rating < criteria.minRating) return false;
    }

    // Accessibility filter
    if (criteria.accessibilityRequirements) {
      for (const requirement of criteria.accessibilityRequirements) {
        if (!this.accessibility.hasSupport(requirement)) return false;
      }
    }

    // Text search
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      const searchableText = [
        this.name,
        this.description,
        this.shortDescription,
        ...this.tags
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  }

  /**
   * Get primary photo
   */
  getPrimaryPhoto() {
    return this.photos.length > 0 ? this.photos[0] : null;
  }

  /**
   * Calculate relevance score for ranking
   */
  calculateRelevanceScore(criteria) {
    let score = 0;

    // Base score from rating
    score += this.rating * 10;

    // Boost for verified experiences
    if (this.verified) score += 20;

    // Boost for featured experiences
    if (this.featured) score += 15;

    // Distance penalty (closer is better)
    if (criteria.location) {
      const distance = this.distanceFrom(criteria.location);
      score -= distance * 0.5; // Penalty increases with distance
    }

    // Review count boost
    score += Math.min(this.reviewCount * 0.1, 10);

    // Type preference boost
    if (criteria.preferredTypes && criteria.preferredTypes.includes(this.type)) {
      score += 25;
    }

    return Math.max(0, score);
  }
}

/**
 * Event Model - For time-based space events
 */
class Event {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.title = data.title || '';
    this.type = data.type || EventType.WORKSHOP;
    this.description = data.description || '';
    this.startDate = new Date(data.startDate || Date.now());
    this.endDate = new Date(data.endDate || Date.now());
    this.location = new GeoLocation(data.location);
    this.venue = data.venue || '';
    this.address = new Address(data.address);
    this.organizer = data.organizer || '';
    this.registrationRequired = data.registrationRequired || false;
    this.registrationUrl = data.registrationUrl || '';
    this.capacity = data.capacity || null;
    this.availableSpots = data.availableSpots || null;
    this.price = new PricingInfo(data.price);
    this.tags = data.tags || [];
    this.difficulty = data.difficulty || DifficultyLevel.BEGINNER;
    this.equipment = data.equipment || [];
    this.weatherDependent = data.weatherDependent || false;
    this.photos = (data.photos || []).map(photo => new Photo(photo));
    this.contactInfo = new ContactInfo(data.contactInfo);
    this.createdAt = new Date(data.createdAt || Date.now());
  }

  generateId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if event is happening during a date range
   */
  isDuringDateRange(startDate, endDate) {
    return this.startDate <= endDate && this.endDate >= startDate;
  }

  /**
   * Check if event is currently active
   */
  isActive() {
    const now = new Date();
    return this.startDate <= now && this.endDate >= now;
  }

  /**
   * Check if registration is available
   */
  canRegister() {
    if (!this.registrationRequired) return true;
    if (!this.capacity) return true;
    return this.availableSpots > 0;
  }

  /**
   * Get event duration in hours
   */
  getDurationHours() {
    return (this.endDate - this.startDate) / (1000 * 60 * 60);
  }
}

/**
 * Astronomical Event Model - For celestial events
 */
class AstronomicalEvent {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.type = data.type || AstroEventType.METEOR_SHOWER;
    this.description = data.description || '';
    this.startTime = new Date(data.startTime || Date.now());
    this.endTime = new Date(data.endTime || Date.now());
    this.peakTime = data.peakTime ? new Date(data.peakTime) : null;
    this.visibility = data.visibility || {};
    this.bestViewingLocations = (data.bestViewingLocations || []).map(loc => new GeoLocation(loc));
    this.difficulty = data.difficulty || DifficultyLevel.BEGINNER;
    this.equipment = data.equipment || [];
    this.magnitude = data.magnitude || null;
    this.constellation = data.constellation || '';
    this.direction = data.direction || '';
    this.altitude = data.altitude || null;
  }

  generateId() {
    return 'astro_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if event is visible from a location
   */
  isVisibleFrom(location) {
    if (!this.visibility.regions) return true;
    
    // Simple visibility check - in a real implementation,
    // this would use more sophisticated astronomical calculations
    return this.bestViewingLocations.some(viewingLoc => 
      location.distanceTo(viewingLoc) < 500 // Within 500 miles
    );
  }

  /**
   * Get optimal viewing time
   */
  getOptimalViewingTime() {
    return this.peakTime || new Date((this.startTime.getTime() + this.endTime.getTime()) / 2);
  }
}

/**
 * User Profile Model
 */
class UserProfile {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.email = data.email || '';
    this.name = data.name || '';
    this.preferences = new UserPreferences(data.preferences);
    this.savedExperiences = data.savedExperiences || [];
    this.visitHistory = (data.visitHistory || []).map(visit => new VisitRecord(visit));
    this.itineraries = (data.itineraries || []).map(itinerary => new Itinerary(itinerary));
    this.reviews = data.reviews || [];
    this.createdAt = new Date(data.createdAt || Date.now());
    this.lastActive = new Date(data.lastActive || Date.now());
  }

  generateId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

/**
 * User Preferences Model
 */
class UserPreferences {
  constructor(data = {}) {
    this.experienceTypes = data.experienceTypes || [];
    this.budgetRange = data.budgetRange || { min: 0, max: 100 };
    this.travelRadius = data.travelRadius || 50; // miles
    this.accessibilityNeeds = data.accessibilityNeeds || [];
    this.interests = data.interests || [];
    this.notificationSettings = data.notificationSettings || {};
    this.language = data.language || 'en';
    this.units = data.units || 'imperial'; // imperial or metric
  }
}

/**
 * Visit Record Model
 */
class VisitRecord {
  constructor(data = {}) {
    this.experienceId = data.experienceId || '';
    this.visitDate = new Date(data.visitDate || Date.now());
    this.rating = data.rating || null;
    this.review = data.review || '';
    this.photos = (data.photos || []).map(photo => new Photo(photo));
    this.duration = data.duration || null; // minutes
    this.companions = data.companions || 1;
  }
}

/**
 * Itinerary Model
 */
class Itinerary {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.description = data.description || '';
    this.startDate = new Date(data.startDate || Date.now());
    this.endDate = new Date(data.endDate || Date.now());
    this.location = new GeoLocation(data.location);
    this.experiences = data.experiences || [];
    this.events = data.events || [];
    this.isPublic = data.isPublic || false;
    this.createdAt = new Date(data.createdAt || Date.now());
    this.updatedAt = new Date(data.updatedAt || Date.now());
  }

  generateId() {
    return 'itin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get total duration in days
   */
  getDurationDays() {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }

  /**
   * Add experience to itinerary
   */
  addExperience(experienceId, scheduledDate = null) {
    this.experiences.push({
      experienceId,
      scheduledDate: scheduledDate || this.startDate,
      notes: ''
    });
    this.updatedAt = new Date();
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Data Validation Utilities
 */
class DataValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
  }

  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validateGeoLocation(location) {
    return location instanceof GeoLocation && location.isValid();
  }

  static validateDateRange(startDate, endDate) {
    return startDate instanceof Date && 
           endDate instanceof Date && 
           startDate <= endDate;
  }

  static validateExperience(experience) {
    const errors = [];

    if (!experience.name || experience.name.trim().length === 0) {
      errors.push('Experience name is required');
    }

    if (!Object.values(ExperienceType).includes(experience.type)) {
      errors.push('Invalid experience type');
    }

    if (!this.validateGeoLocation(experience.location)) {
      errors.push('Valid location is required');
    }

    if (experience.rating < 0 || experience.rating > 5) {
      errors.push('Rating must be between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateEvent(event) {
    const errors = [];

    if (!event.title || event.title.trim().length === 0) {
      errors.push('Event title is required');
    }

    if (!Object.values(EventType).includes(event.type)) {
      errors.push('Invalid event type');
    }

    if (!this.validateDateRange(event.startDate, event.endDate)) {
      errors.push('Valid date range is required');
    }

    if (event.registrationRequired && !event.registrationUrl) {
      errors.push('Registration URL is required when registration is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// =============================================================================
// SEARCH AND FILTER UTILITIES
// =============================================================================

/**
 * Search Criteria Model
 */
class SearchCriteria {
  constructor(data = {}) {
    this.location = data.location ? new GeoLocation(data.location) : null;
    this.maxDistance = data.maxDistance || 50; // miles
    this.dateRange = data.dateRange || null;
    this.types = data.types || [];
    this.maxPrice = data.maxPrice || null;
    this.minRating = data.minRating || 0;
    this.accessibilityRequirements = data.accessibilityRequirements || [];
    this.searchText = data.searchText || '';
    this.preferredTypes = data.preferredTypes || [];
    this.sortBy = data.sortBy || 'relevance'; // relevance, distance, rating, price
    this.sortOrder = data.sortOrder || 'desc'; // asc, desc
    this.limit = data.limit || 20;
    this.offset = data.offset || 0;
  }
}

/**
 * Search Result Model
 */
class SearchResult {
  constructor(data = {}) {
    this.experiences = data.experiences || [];
    this.events = data.events || [];
    this.total = data.total || 0;
    this.hasMore = data.hasMore || false;
    this.searchCriteria = data.searchCriteria || null;
    this.executionTime = data.executionTime || 0;
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

// Make all models and utilities available globally
if (typeof window !== 'undefined') {
  // Browser environment
  window.ExploreXModels = {
    // Enums
    ExperienceType,
    EventType,
    AstroEventType,
    DifficultyLevel,
    AccessibilityRequirement,
    
    // Core Models
    GeoLocation,
    Address,
    OperatingHours,
    PricingInfo,
    Photo,
    ContactInfo,
    AccessibilityInfo,
    Experience,
    Event,
    AstronomicalEvent,
    UserProfile,
    UserPreferences,
    VisitRecord,
    Itinerary,
    
    // Utilities
    DataValidator,
    SearchCriteria,
    SearchResult
  };
} else {
  // Node.js environment
  module.exports = {
    // Enums
    ExperienceType,
    EventType,
    AstroEventType,
    DifficultyLevel,
    AccessibilityRequirement,
    
    // Core Models
    GeoLocation,
    Address,
    OperatingHours,
    PricingInfo,
    Photo,
    ContactInfo,
    AccessibilityInfo,
    Experience,
    Event,
    AstronomicalEvent,
    UserProfile,
    UserPreferences,
    VisitRecord,
    Itinerary,
    
    // Utilities
    DataValidator,
    SearchCriteria,
    SearchResult
  };
}

console.log('✅ ExploreX Data Models loaded successfully');