/**
 * ExploreX Itinerary Planning and Optimization System
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive itinerary planning including:
 * - Drag-and-drop itinerary builder interface
 * - Schedule optimization based on location and hours
 * - Travel time calculations between experiences
 * - Conflict detection and resolution suggestions
 * - Itinerary sharing and export functionality
 */

// =============================================================================
// ITINERARY SYSTEM CONFIGURATION
// =============================================================================

const ItineraryConfig = {
  // Planning constraints
  constraints: {
    maxDaysPerItinerary: 14,
    maxExperiencesPerDay: 8,
    minTimeBetweenExperiences: 30, // minutes
    defaultExperienceDuration: 120, // minutes
    travelTimeBuffer: 15 // minutes
  },
  
  // Optimization settings
  optimization: {
    prioritizeDistance: 0.4,
    prioritizeTime: 0.3,
    prioritizeRating: 0.2,
    prioritizePreferences: 0.1
  },
  
  // Travel modes and speeds
  travelModes: {
    driving: { speed: 35, icon: '🚗', label: 'Driving' }, // mph average
    walking: { speed: 3, icon: '🚶', label: 'Walking' },
    transit: { speed: 20, icon: '🚌', label: 'Public Transit' },
    cycling: { speed: 12, icon: '🚴', label: 'Cycling' }
  },
  
  // Export formats
  exportFormats: [
    { id: 'pdf', label: 'PDF Document', icon: '📄' },
    { id: 'calendar', label: 'Calendar (ICS)', icon: '📅' },
    { id: 'json', label: 'JSON Data', icon: '📊' },
    { id: 'share', label: 'Share Link', icon: '🔗' }
  ]
};

// =============================================================================
// ITINERARY MANAGER CLASS
// =============================================================================

class ItineraryManager {
  constructor(config = {}) {
    this.config = { ...ItineraryConfig, ...config };
    this.itineraries = new Map();
    this.currentItinerary = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the itinerary system
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('📅 Initializing ExploreX Itinerary System...');
      
      // Load existing itineraries
      this.loadItineraries();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Itinerary System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Itinerary System:', error);
      throw error;
    }
  }

  /**
   * Create a new itinerary
   */
  createItinerary(name, description = '', startDate = null, endDate = null) {
    const itinerary = new Itinerary({
      id: this.generateItineraryId(),
      name: name || `Trip ${this.itineraries.size + 1}`,
      description,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week default
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    this.itineraries.set(itinerary.id, itinerary);
    this.saveItineraries();
    
    console.log('📅 Created new itinerary:', itinerary.name);
    
    // Dispatch event
    this.dispatchEvent('itineraryCreated', { itinerary });
    
    return itinerary;
  }  /
**
   * Get itinerary by ID
   */
  getItinerary(id) {
    return this.itineraries.get(id);
  }

  /**
   * Get all itineraries
   */
  getAllItineraries() {
    return Array.from(this.itineraries.values());
  }

  /**
   * Delete itinerary
   */
  deleteItinerary(id) {
    const itinerary = this.itineraries.get(id);
    if (!itinerary) return false;
    
    this.itineraries.delete(id);
    this.saveItineraries();
    
    // Clear current if deleted
    if (this.currentItinerary && this.currentItinerary.id === id) {
      this.currentItinerary = null;
    }
    
    console.log('🗑️ Deleted itinerary:', itinerary.name);
    
    // Dispatch event
    this.dispatchEvent('itineraryDeleted', { itineraryId: id });
    
    return true;
  }

  /**
   * Set current itinerary
   */
  setCurrentItinerary(id) {
    const itinerary = this.itineraries.get(id);
    if (!itinerary) return false;
    
    this.currentItinerary = itinerary;
    
    // Dispatch event
    this.dispatchEvent('currentItineraryChanged', { itinerary });
    
    return true;
  }

  /**
   * Add experience to itinerary
   */
  addExperienceToItinerary(itineraryId, experience, dayIndex = 0, timeSlot = null) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return false;
    
    const result = itinerary.addExperience(experience, dayIndex, timeSlot);
    
    if (result.success) {
      this.saveItineraries();
      
      // Dispatch event
      this.dispatchEvent('experienceAddedToItinerary', {
        itinerary,
        experience,
        dayIndex,
        timeSlot: result.timeSlot
      });
    }
    
    return result;
  }

  /**
   * Remove experience from itinerary
   */
  removeExperienceFromItinerary(itineraryId, experienceId, dayIndex) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return false;
    
    const result = itinerary.removeExperience(experienceId, dayIndex);
    
    if (result) {
      this.saveItineraries();
      
      // Dispatch event
      this.dispatchEvent('experienceRemovedFromItinerary', {
        itinerary,
        experienceId,
        dayIndex
      });
    }
    
    return result;
  }

  /**
   * Optimize itinerary schedule
   */
  optimizeItinerary(itineraryId, options = {}) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return null;
    
    console.log('🔧 Optimizing itinerary:', itinerary.name);
    
    const optimizer = new ItineraryOptimizer(this.config);
    const optimizedItinerary = optimizer.optimize(itinerary, options);
    
    // Update the itinerary
    this.itineraries.set(itineraryId, optimizedItinerary);
    this.saveItineraries();
    
    // Dispatch event
    this.dispatchEvent('itineraryOptimized', { 
      itinerary: optimizedItinerary,
      originalItinerary: itinerary
    });
    
    return optimizedItinerary;
  }

  /**
   * Calculate travel time between experiences
   */
  async calculateTravelTime(fromExperience, toExperience, travelMode = 'driving') {
    const calculator = new TravelTimeCalculator();
    return await calculator.calculateTravelTime(fromExperience, toExperience, travelMode);
  }

  /**
   * Detect conflicts in itinerary
   */
  detectConflicts(itineraryId) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return [];
    
    const detector = new ConflictDetector();
    return detector.detectConflicts(itinerary);
  }

  /**
   * Export itinerary
   */
  async exportItinerary(itineraryId, format = 'pdf', options = {}) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return null;
    
    const exporter = new ItineraryExporter();
    return await exporter.export(itinerary, format, options);
  }

  /**
   * Share itinerary
   */
  async shareItinerary(itineraryId, shareOptions = {}) {
    const itinerary = this.itineraries.get(itineraryId);
    if (!itinerary) return null;
    
    const shareLink = this.generateShareLink(itinerary, shareOptions);
    
    // Dispatch event
    this.dispatchEvent('itineraryShared', { itinerary, shareLink });
    
    return shareLink;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Generate unique itinerary ID
   */
  generateItineraryId() {
    return 'itinerary_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate share link
   */
  generateShareLink(itinerary, options = {}) {
    const shareId = btoa(JSON.stringify({
      id: itinerary.id,
      name: itinerary.name,
      timestamp: Date.now(),
      ...options
    }));
    
    return `${window.location.origin}${window.location.pathname}?share=${shareId}`;
  }

  /**
   * Load itineraries from storage
   */
  loadItineraries() {
    try {
      const stored = window.ExploreXUtils.StorageUtils.getItem('explorex_itineraries');
      if (stored && Array.isArray(stored)) {
        stored.forEach(data => {
          const itinerary = Itinerary.fromJSON(data);
          this.itineraries.set(itinerary.id, itinerary);
        });
      }
    } catch (error) {
      console.warn('Failed to load itineraries:', error);
    }
  }

  /**
   * Save itineraries to storage
   */
  saveItineraries() {
    try {
      const itinerariesArray = Array.from(this.itineraries.values()).map(itinerary => itinerary.toJSON());
      window.ExploreXUtils.StorageUtils.setItem('explorex_itineraries', itinerariesArray);
    } catch (error) {
      console.warn('Failed to save itineraries:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for experience saves to suggest adding to itinerary
    document.addEventListener('experienceSaved', this.handleExperienceSaved.bind(this));
  }

  /**
   * Handle experience saved event
   */
  handleExperienceSaved(event) {
    const { experienceId, savedExperience } = event.detail;
    
    // Suggest adding to current itinerary if one exists
    if (this.currentItinerary) {
      this.dispatchEvent('suggestAddToItinerary', {
        experience: savedExperience.data,
        itinerary: this.currentItinerary
      });
    }
  }

  /**
   * Dispatch custom event
   */
  dispatchEvent(eventType, detail) {
    document.dispatchEvent(new CustomEvent(eventType, {
      bubbles: true,
      detail
    }));
  }
}

// =============================================================================
// ITINERARY CLASS
// =============================================================================

class Itinerary {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || '';
    this.startDate = new Date(data.startDate);
    this.endDate = new Date(data.endDate);
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
    this.days = data.days || this.initializeDays();
    this.metadata = data.metadata || {};
  }

  /**
   * Initialize days array based on date range
   */
  initializeDays() {
    const days = [];
    const currentDate = new Date(this.startDate);
    
    while (currentDate <= this.endDate) {
      days.push(new ItineraryDay({
        date: new Date(currentDate),
        experiences: []
      }));
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Add experience to specific day
   */
  addExperience(experience, dayIndex = 0, timeSlot = null) {
    if (dayIndex >= this.days.length) {
      return { success: false, error: 'Invalid day index' };
    }
    
    const day = this.days[dayIndex];
    const result = day.addExperience(experience, timeSlot);
    
    if (result.success) {
      this.updatedAt = new Date();
    }
    
    return result;
  }

  /**
   * Remove experience from specific day
   */
  removeExperience(experienceId, dayIndex) {
    if (dayIndex >= this.days.length) return false;
    
    const day = this.days[dayIndex];
    const result = day.removeExperience(experienceId);
    
    if (result) {
      this.updatedAt = new Date();
    }
    
    return result;
  }

  /**
   * Get total duration in days
   */
  getDurationInDays() {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Get total number of experiences
   */
  getTotalExperiences() {
    return this.days.reduce((total, day) => total + day.experiences.length, 0);
  }

  /**
   * Get estimated total cost
   */
  getEstimatedCost() {
    return this.days.reduce((total, day) => {
      return total + day.experiences.reduce((dayTotal, exp) => {
        return dayTotal + (exp.experience.admissionFee?.adultPrice || 0);
      }, 0);
    }, 0);
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      days: this.days.map(day => day.toJSON()),
      metadata: this.metadata
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    const itinerary = new Itinerary(data);
    itinerary.days = data.days.map(dayData => ItineraryDay.fromJSON(dayData));
    return itinerary;
  }
}

// =============================================================================
// ITINERARY DAY CLASS
// =============================================================================

class ItineraryDay {
  constructor(data) {
    this.date = new Date(data.date);
    this.experiences = data.experiences || [];
    this.notes = data.notes || '';
  }

  /**
   * Add experience to day
   */
  addExperience(experience, timeSlot = null) {
    // Check if experience already exists
    if (this.experiences.some(exp => exp.experience.id === experience.id)) {
      return { success: false, error: 'Experience already added to this day' };
    }
    
    // Check day capacity
    if (this.experiences.length >= ItineraryConfig.constraints.maxExperiencesPerDay) {
      return { success: false, error: 'Maximum experiences per day reached' };
    }
    
    // Determine time slot
    const finalTimeSlot = timeSlot || this.findNextAvailableTimeSlot();
    
    // Check for conflicts
    const conflict = this.checkTimeConflict(finalTimeSlot, ItineraryConfig.constraints.defaultExperienceDuration);
    if (conflict) {
      return { success: false, error: 'Time slot conflicts with existing experience' };
    }
    
    const itineraryExperience = new ItineraryExperience({
      experience,
      timeSlot: finalTimeSlot,
      duration: ItineraryConfig.constraints.defaultExperienceDuration,
      addedAt: new Date()
    });
    
    this.experiences.push(itineraryExperience);
    this.sortExperiencesByTime();
    
    return { success: true, timeSlot: finalTimeSlot };
  }

  /**
   * Remove experience from day
   */
  removeExperience(experienceId) {
    const initialLength = this.experiences.length;
    this.experiences = this.experiences.filter(exp => exp.experience.id !== experienceId);
    return this.experiences.length < initialLength;
  }

  /**
   * Find next available time slot
   */
  findNextAvailableTimeSlot() {
    if (this.experiences.length === 0) {
      // Start at 9 AM if no experiences
      const startTime = new Date(this.date);
      startTime.setHours(9, 0, 0, 0);
      return startTime;
    }
    
    // Sort experiences by time
    this.sortExperiencesByTime();
    
    // Find gap after last experience
    const lastExperience = this.experiences[this.experiences.length - 1];
    const nextSlot = new Date(lastExperience.timeSlot);
    nextSlot.setMinutes(nextSlot.getMinutes() + lastExperience.duration + ItineraryConfig.constraints.minTimeBetweenExperiences);
    
    return nextSlot;
  }

  /**
   * Check for time conflicts
   */
  checkTimeConflict(timeSlot, duration) {
    const endTime = new Date(timeSlot);
    endTime.setMinutes(endTime.getMinutes() + duration);
    
    return this.experiences.some(exp => {
      const expEndTime = new Date(exp.timeSlot);
      expEndTime.setMinutes(expEndTime.getMinutes() + exp.duration);
      
      return (timeSlot < expEndTime && endTime > exp.timeSlot);
    });
  }

  /**
   * Sort experiences by time
   */
  sortExperiencesByTime() {
    this.experiences.sort((a, b) => a.timeSlot - b.timeSlot);
  }

  /**
   * Get day summary
   */
  getSummary() {
    return {
      date: this.date,
      experienceCount: this.experiences.length,
      estimatedCost: this.experiences.reduce((total, exp) => {
        return total + (exp.experience.admissionFee?.adultPrice || 0);
      }, 0),
      startTime: this.experiences.length > 0 ? this.experiences[0].timeSlot : null,
      endTime: this.experiences.length > 0 ? (() => {
        const lastExp = this.experiences[this.experiences.length - 1];
        const endTime = new Date(lastExp.timeSlot);
        endTime.setMinutes(endTime.getMinutes() + lastExp.duration);
        return endTime;
      })() : null
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      date: this.date.toISOString(),
      experiences: this.experiences.map(exp => exp.toJSON()),
      notes: this.notes
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    const day = new ItineraryDay(data);
    day.experiences = data.experiences.map(expData => ItineraryExperience.fromJSON(expData));
    return day;
  }
}

// =============================================================================
// ITINERARY EXPERIENCE CLASS
// =============================================================================

class ItineraryExperience {
  constructor(data) {
    this.experience = data.experience;
    this.timeSlot = new Date(data.timeSlot);
    this.duration = data.duration || ItineraryConfig.constraints.defaultExperienceDuration;
    this.addedAt = new Date(data.addedAt);
    this.notes = data.notes || '';
    this.completed = data.completed || false;
  }

  /**
   * Get end time
   */
  getEndTime() {
    const endTime = new Date(this.timeSlot);
    endTime.setMinutes(endTime.getMinutes() + this.duration);
    return endTime;
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      experience: this.experience,
      timeSlot: this.timeSlot.toISOString(),
      duration: this.duration,
      addedAt: this.addedAt.toISOString(),
      notes: this.notes,
      completed: this.completed
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new ItineraryExperience(data);
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXItinerary = {
  ItineraryManager,
  Itinerary,
  ItineraryDay,
  ItineraryExperience,
  ItineraryConfig
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📅 ExploreX Itinerary System loaded');
});/
/ =============================================================================
// ITINERARY OPTIMIZER CLASS
// =============================================================================

class ItineraryOptimizer {
  constructor(config) {
    this.config = config;
  }

  /**
   * Optimize itinerary for better scheduling and routing
   */
  optimize(itinerary, options = {}) {
    console.log('🔧 Starting itinerary optimization...');
    
    const optimizedItinerary = new Itinerary(itinerary.toJSON());
    
    // Optimize each day
    optimizedItinerary.days.forEach((day, index) => {
      if (day.experiences.length > 1) {
        this.optimizeDay(day, options);
      }
    });
    
    console.log('✅ Itinerary optimization completed');
    return optimizedItinerary;
  }

  /**
   * Optimize a single day's schedule
   */
  optimizeDay(day, options = {}) {
    const experiences = [...day.experiences];
    
    // Sort by priority score
    experiences.sort((a, b) => {
      const scoreA = this.calculatePriorityScore(a.experience, options);
      const scoreB = this.calculatePriorityScore(b.experience, options);
      return scoreB - scoreA;
    });
    
    // Optimize for travel distance
    const optimizedExperiences = this.optimizeForDistance(experiences);
    
    // Reschedule with optimal timing
    this.rescheduleExperiences(day, optimizedExperiences);
  }

  /**
   * Calculate priority score for experience
   */
  calculatePriorityScore(experience, options) {
    let score = 0;
    
    // Rating factor
    score += (experience.rating || 0) * this.config.optimization.prioritizeRating * 20;
    
    // User preference factor
    if (options.userPreferences && options.userPreferences.experienceTypes) {
      if (options.userPreferences.experienceTypes.includes(experience.type)) {
        score += this.config.optimization.prioritizePreferences * 100;
      }
    }
    
    // Featured/verified bonus
    if (experience.featured) score += 10;
    if (experience.verified) score += 5;
    
    return score;
  }

  /**
   * Optimize experiences for minimal travel distance
   */
  optimizeForDistance(experiences) {
    if (experiences.length <= 2) return experiences;
    
    // Simple nearest neighbor algorithm
    const optimized = [experiences[0]];
    const remaining = experiences.slice(1);
    
    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIndex = 0;
      let minDistance = this.calculateDistance(
        current.experience.location,
        remaining[0].experience.location
      );
      
      for (let i = 1; i < remaining.length; i++) {
        const distance = this.calculateDistance(
          current.experience.location,
          remaining[i].experience.location
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      
      optimized.push(remaining.splice(nearestIndex, 1)[0]);
    }
    
    return optimized;
  }

  /**
   * Reschedule experiences with optimal timing
   */
  rescheduleExperiences(day, experiences) {
    let currentTime = new Date(day.date);
    currentTime.setHours(9, 0, 0, 0); // Start at 9 AM
    
    day.experiences = [];
    
    experiences.forEach(exp => {
      exp.timeSlot = new Date(currentTime);
      day.experiences.push(exp);
      
      // Add experience duration and buffer time
      currentTime.setMinutes(
        currentTime.getMinutes() + 
        exp.duration + 
        this.config.constraints.minTimeBetweenExperiences
      );
    });
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(loc1, loc2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) * 
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
}

// =============================================================================
// TRAVEL TIME CALCULATOR CLASS
// =============================================================================

class TravelTimeCalculator {
  /**
   * Calculate travel time between two experiences
   */
  async calculateTravelTime(fromExperience, toExperience, travelMode = 'driving') {
    const distance = this.calculateDistance(
      fromExperience.location,
      toExperience.location
    );
    
    const modeConfig = ItineraryConfig.travelModes[travelMode];
    if (!modeConfig) {
      throw new Error(`Invalid travel mode: ${travelMode}`);
    }
    
    // Calculate time in minutes
    const timeInHours = distance / modeConfig.speed;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    
    return {
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      time: timeInMinutes,
      mode: travelMode,
      modeConfig
    };
  }

  /**
   * Calculate distance between locations
   */
  calculateDistance(loc1, loc2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) * 
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
}

// =============================================================================
// CONFLICT DETECTOR CLASS
// =============================================================================

class ConflictDetector {
  /**
   * Detect scheduling conflicts in itinerary
   */
  detectConflicts(itinerary) {
    const conflicts = [];
    
    itinerary.days.forEach((day, dayIndex) => {
      const dayConflicts = this.detectDayConflicts(day, dayIndex);
      conflicts.push(...dayConflicts);
    });
    
    return conflicts;
  }

  /**
   * Detect conflicts within a single day
   */
  detectDayConflicts(day, dayIndex) {
    const conflicts = [];
    const experiences = [...day.experiences].sort((a, b) => a.timeSlot - b.timeSlot);
    
    for (let i = 0; i < experiences.length - 1; i++) {
      const current = experiences[i];
      const next = experiences[i + 1];
      
      const currentEnd = new Date(current.timeSlot);
      currentEnd.setMinutes(currentEnd.getMinutes() + current.duration);
      
      // Check for time overlap
      if (currentEnd > next.timeSlot) {
        conflicts.push({
          type: 'time_overlap',
          dayIndex,
          experiences: [current, next],
          severity: 'high',
          message: `${current.experience.name} overlaps with ${next.experience.name}`,
          suggestion: 'Adjust start times or reduce duration'
        });
      }
      
      // Check for insufficient travel time
      const travelTime = this.estimateTravelTime(current.experience, next.experience);
      const availableTime = (next.timeSlot - currentEnd) / (1000 * 60); // minutes
      
      if (availableTime < travelTime) {
        conflicts.push({
          type: 'insufficient_travel_time',
          dayIndex,
          experiences: [current, next],
          severity: 'medium',
          message: `Not enough time to travel from ${current.experience.name} to ${next.experience.name}`,
          suggestion: `Add ${Math.ceil(travelTime - availableTime)} minutes between experiences`,
          requiredTime: travelTime,
          availableTime: Math.max(0, availableTime)
        });
      }
    }
    
    // Check for operating hours conflicts
    experiences.forEach(exp => {
      const conflict = this.checkOperatingHoursConflict(exp, dayIndex);
      if (conflict) {
        conflicts.push(conflict);
      }
    });
    
    return conflicts;
  }

  /**
   * Check if experience conflicts with operating hours
   */
  checkOperatingHoursConflict(itineraryExperience, dayIndex) {
    const experience = itineraryExperience.experience;
    const timeSlot = itineraryExperience.timeSlot;
    
    if (!experience.operatingHours || experience.operatingHours.length === 0) {
      return null;
    }
    
    const dayOfWeek = timeSlot.getDay();
    const dayHours = experience.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
    
    if (!dayHours) {
      return {
        type: 'no_operating_hours',
        dayIndex,
        experience: itineraryExperience,
        severity: 'high',
        message: `No operating hours found for ${experience.name} on this day`,
        suggestion: 'Move to a different day or verify operating hours'
      };
    }
    
    if (dayHours.isClosed) {
      return {
        type: 'closed_day',
        dayIndex,
        experience: itineraryExperience,
        severity: 'high',
        message: `${experience.name} is closed on this day`,
        suggestion: 'Move to a different day when the experience is open'
      };
    }
    
    // Check if scheduled time is within operating hours
    const scheduledTime = timeSlot.getHours() * 60 + timeSlot.getMinutes();
    const openTime = this.parseTime(dayHours.openTime);
    const closeTime = this.parseTime(dayHours.closeTime);
    
    if (scheduledTime < openTime || scheduledTime > closeTime) {
      return {
        type: 'outside_operating_hours',
        dayIndex,
        experience: itineraryExperience,
        severity: 'high',
        message: `${experience.name} is scheduled outside operating hours`,
        suggestion: `Schedule between ${dayHours.openTime} and ${dayHours.closeTime}`,
        operatingHours: dayHours
      };
    }
    
    return null;
  }

  /**
   * Estimate travel time between experiences
   */
  estimateTravelTime(fromExp, toExp) {
    const calculator = new TravelTimeCalculator();
    const distance = calculator.calculateDistance(fromExp.location, toExp.location);
    
    // Use driving speed as default estimate
    const drivingSpeed = ItineraryConfig.travelModes.driving.speed;
    const timeInHours = distance / drivingSpeed;
    return Math.ceil(timeInHours * 60) + ItineraryConfig.constraints.travelTimeBuffer;
  }

  /**
   * Parse time string to minutes
   */
  parseTime(timeStr) {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let totalMinutes = hours * 60 + (minutes || 0);
    
    if (period && period.toLowerCase() === 'pm' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period && period.toLowerCase() === 'am' && hours === 12) {
      totalMinutes -= 12 * 60;
    }
    
    return totalMinutes;
  }
}

// =============================================================================
// ITINERARY EXPORTER CLASS
// =============================================================================

class ItineraryExporter {
  /**
   * Export itinerary in specified format
   */
  async export(itinerary, format, options = {}) {
    switch (format) {
      case 'pdf':
        return this.exportToPDF(itinerary, options);
      case 'calendar':
        return this.exportToCalendar(itinerary, options);
      case 'json':
        return this.exportToJSON(itinerary, options);
      case 'share':
        return this.exportToShareLink(itinerary, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF (mock implementation)
   */
  async exportToPDF(itinerary, options) {
    // In production, this would generate an actual PDF
    const pdfContent = this.generatePDFContent(itinerary);
    
    return {
      format: 'pdf',
      filename: `${itinerary.name.replace(/\s+/g, '_')}_itinerary.pdf`,
      content: pdfContent,
      mimeType: 'application/pdf',
      downloadUrl: this.createDownloadURL(pdfContent, 'application/pdf')
    };
  }

  /**
   * Export to calendar format (ICS)
   */
  async exportToCalendar(itinerary, options) {
    const icsContent = this.generateICSContent(itinerary);
    
    return {
      format: 'calendar',
      filename: `${itinerary.name.replace(/\s+/g, '_')}_itinerary.ics`,
      content: icsContent,
      mimeType: 'text/calendar',
      downloadUrl: this.createDownloadURL(icsContent, 'text/calendar')
    };
  }

  /**
   * Export to JSON
   */
  async exportToJSON(itinerary, options) {
    const jsonContent = JSON.stringify(itinerary.toJSON(), null, 2);
    
    return {
      format: 'json',
      filename: `${itinerary.name.replace(/\s+/g, '_')}_itinerary.json`,
      content: jsonContent,
      mimeType: 'application/json',
      downloadUrl: this.createDownloadURL(jsonContent, 'application/json')
    };
  }

  /**
   * Export to share link
   */
  async exportToShareLink(itinerary, options) {
    const shareData = {
      id: itinerary.id,
      name: itinerary.name,
      description: itinerary.description,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      experienceCount: itinerary.getTotalExperiences(),
      estimatedCost: itinerary.getEstimatedCost()
    };
    
    const shareId = btoa(JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    
    return {
      format: 'share',
      shareUrl,
      shareId,
      qrCode: this.generateQRCode(shareUrl)
    };
  }

  /**
   * Generate PDF content (mock)
   */
  generatePDFContent(itinerary) {
    return `PDF Content for ${itinerary.name} - ${itinerary.getTotalExperiences()} experiences over ${itinerary.getDurationInDays()} days`;
  }

  /**
   * Generate ICS calendar content
   */
  generateICSContent(itinerary) {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ExploreX//Itinerary//EN\n';
    
    itinerary.days.forEach(day => {
      day.experiences.forEach(exp => {
        const startTime = exp.timeSlot.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endTime = exp.getEndTime().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        ics += 'BEGIN:VEVENT\n';
        ics += `UID:${exp.experience.id}@explorex.com\n`;
        ics += `DTSTART:${startTime}\n`;
        ics += `DTEND:${endTime}\n`;
        ics += `SUMMARY:${exp.experience.name}\n`;
        ics += `DESCRIPTION:${exp.experience.description || ''}\n`;
        ics += `LOCATION:${exp.experience.address.toString()}\n`;
        ics += 'END:VEVENT\n';
      });
    });
    
    ics += 'END:VCALENDAR';
    return ics;
  }

  /**
   * Create download URL for content
   */
  createDownloadURL(content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /**
   * Generate QR code (mock)
   */
  generateQRCode(url) {
    // In production, this would generate an actual QR code
    return `data:image/svg+xml;base64,${btoa(`<svg>QR Code for ${url}</svg>`)}`;
  }
}

// Add classes to global namespace
window.ExploreXItinerary.ItineraryOptimizer = ItineraryOptimizer;
window.ExploreXItinerary.TravelTimeCalculator = TravelTimeCalculator;
window.ExploreXItinerary.ConflictDetector = ConflictDetector;
window.ExploreXItinerary.ItineraryExporter = ItineraryExporter;