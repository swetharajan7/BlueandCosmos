/**
 * ExploreX Location Services and Geocoding Integration
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive location services including:
 * - GPS location detection
 * - Address geocoding and reverse geocoding
 * - Location autocomplete and suggestions
 * - Location validation and normalization
 * - Popular space destinations database
 */

// =============================================================================
// LOCATION SERVICES CONFIGURATION
// =============================================================================

const LocationConfig = {
  // API endpoints (in production, these would use real services)
  geocodingAPI: 'https://api.opencagedata.com/geocode/v1/json',
  placesAPI: 'https://nominatim.openstreetmap.org/search',
  reverseGeocodingAPI: 'https://nominatim.openstreetmap.org/reverse',
  
  // Default settings
  defaultRadius: 50, // miles
  maxSuggestions: 10,
  geocodingTimeout: 5000, // milliseconds
  
  // Popular space destinations for suggestions
  popularDestinations: [
    { name: 'Kennedy Space Center, FL', lat: 28.5721, lng: -80.6480, type: 'space_center' },
    { name: 'Griffith Observatory, CA', lat: 34.1184, lng: -118.3004, type: 'observatory' },
    { name: 'Hayden Planetarium, NY', lat: 40.7813, lng: -73.9737, type: 'planetarium' },
    { name: 'Smithsonian Air & Space Museum, DC', lat: 38.8882, lng: -77.0199, type: 'museum' },
    { name: 'Palomar Observatory, CA', lat: 33.3563, lng: -116.8650, type: 'observatory' },
    { name: 'Lowell Observatory, AZ', lat: 35.2033, lng: -111.6646, type: 'observatory' },
    { name: 'McDonald Observatory, TX', lat: 30.6719, lng: -104.0247, type: 'observatory' },
    { name: 'Adler Planetarium, IL', lat: 41.8663, lng: -87.6069, type: 'planetarium' },
    { name: 'Space Center Houston, TX', lat: 29.5518, lng: -95.0979, type: 'space_center' },
    { name: 'Jet Propulsion Laboratory, CA', lat: 34.2005, lng: -118.1712, type: 'research' }
  ]
};

// =============================================================================
// LOCATION SERVICES CLASS
// =============================================================================

class LocationServices {
  constructor() {
    this.currentLocation = null;
    this.locationHistory = [];
    this.geocodeCache = new Map();
    this.watchId = null;
    this.isWatching = false;
  }

  // ===========================================================================
  // GPS LOCATION DETECTION
  // ===========================================================================

  /**
   * Get current GPS location
   * @param {Object} options - Geolocation options
   * @returns {Promise<GeoLocation>} Current location
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    const geoOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = new window.ExploreXModels.GeoLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude
          });

          this.currentLocation = location;
          this.addToHistory(location, 'GPS');
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        geoOptions
      );
    });
  }

  /**
   * Watch location changes
   * @param {Function} callback - Called when location changes
   * @param {Object} options - Geolocation options
   * @returns {number} Watch ID
   */
  watchLocation(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 60000 // 1 minute
    };

    const geoOptions = { ...defaultOptions, ...options };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = new window.ExploreXModels.GeoLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude
        });

        this.currentLocation = location;
        this.addToHistory(location, 'GPS_WATCH');
        callback(location);
      },
      (error) => {
        callback(null, error);
      },
      geoOptions
    );

    this.isWatching = true;
    return this.watchId;
  }

  /**
   * Stop watching location
   */
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  // ===========================================================================
  // GEOCODING SERVICES
  // ===========================================================================

  /**
   * Geocode an address to coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<Array>} Array of location results
   */
  async geocodeAddress(address) {
    if (!address || address.trim().length === 0) {
      throw new Error('Address is required');
    }

    const cacheKey = `geocode_${address.toLowerCase().trim()}`;
    
    // Check cache first
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      // For development, use mock geocoding with popular destinations
      const results = await this.mockGeocode(address);
      
      // Cache results
      this.geocodeCache.set(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Address>} Address object
   */
  async reverseGeocode(lat, lng) {
    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    const cacheKey = `reverse_${lat}_${lng}`;
    
    // Check cache first
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    try {
      // For development, use mock reverse geocoding
      const address = await this.mockReverseGeocode(lat, lng);
      
      // Cache result
      this.geocodeCache.set(cacheKey, address);
      
      return address;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  // ===========================================================================
  // LOCATION AUTOCOMPLETE AND SUGGESTIONS
  // ===========================================================================

  /**
   * Get location suggestions for autocomplete
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of location suggestions
   */
  async getLocationSuggestions(query, options = {}) {
    if (!query || query.trim().length < 2) {
      return this.getPopularDestinations();
    }

    const { maxResults = LocationConfig.maxSuggestions, includePopular = true } = options;
    const queryLower = query.toLowerCase().trim();

    try {
      // Start with popular destinations that match
      let suggestions = [];
      
      if (includePopular) {
        const popularMatches = LocationConfig.popularDestinations.filter(dest =>
          dest.name.toLowerCase().includes(queryLower)
        );
        suggestions.push(...popularMatches.map(dest => ({
          name: dest.name,
          location: new window.ExploreXModels.GeoLocation({ latitude: dest.lat, longitude: dest.lng }),
          type: 'popular_destination',
          category: dest.type
        })));
      }

      // Add mock city/state suggestions
      const mockSuggestions = await this.getMockLocationSuggestions(query);
      suggestions.push(...mockSuggestions);

      // Remove duplicates and limit results
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
        index === self.findIndex(s => s.name === suggestion.name)
      );

      return uniqueSuggestions.slice(0, maxResults);
    } catch (error) {
      console.error('Failed to get location suggestions:', error);
      return this.getPopularDestinations().slice(0, maxResults);
    }
  }

  /**
   * Get popular space destinations
   * @returns {Array} Popular destinations
   */
  getPopularDestinations() {
    return LocationConfig.popularDestinations.map(dest => ({
      name: dest.name,
      location: new window.ExploreXModels.GeoLocation({ latitude: dest.lat, longitude: dest.lng }),
      type: 'popular_destination',
      category: dest.type
    }));
  }

  /**
   * Validate location input
   * @param {string} locationInput - Location string to validate
   * @returns {Object} Validation result
   */
  validateLocation(locationInput) {
    if (!locationInput || locationInput.trim().length === 0) {
      return {
        isValid: false,
        error: 'Location is required',
        suggestions: this.getPopularDestinations().slice(0, 3)
      };
    }

    const trimmed = locationInput.trim();
    
    // Check if it's coordinates
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
    if (coordPattern.test(trimmed)) {
      const [lat, lng] = trimmed.split(',').map(coord => parseFloat(coord.trim()));
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          isValid: true,
          type: 'coordinates',
          location: new window.ExploreXModels.GeoLocation({ latitude: lat, longitude: lng })
        };
      } else {
        return {
          isValid: false,
          error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
          suggestions: []
        };
      }
    }

    // Check if it matches popular destinations
    const popularMatch = LocationConfig.popularDestinations.find(dest =>
      dest.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (popularMatch) {
      return {
        isValid: true,
        type: 'popular_destination',
        location: new window.ExploreXModels.GeoLocation({ latitude: popularMatch.lat, longitude: popularMatch.lng }),
        name: popularMatch.name
      };
    }

    // For other inputs, assume they need geocoding
    return {
      isValid: true,
      type: 'address',
      needsGeocoding: true,
      input: trimmed
    };
  }

  // ===========================================================================
  // LOCATION UTILITIES
  // ===========================================================================

  /**
   * Find nearby locations
   * @param {GeoLocation} centerLocation - Center point
   * @param {Array} locations - Array of locations to search
   * @param {number} radiusMiles - Search radius in miles
   * @returns {Array} Nearby locations with distances
   */
  findNearbyLocations(centerLocation, locations, radiusMiles = LocationConfig.defaultRadius) {
    return locations
      .map(location => ({
        ...location,
        distance: centerLocation.distanceTo(location.location || location)
      }))
      .filter(location => location.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get location display name
   * @param {GeoLocation|Address} location - Location object
   * @returns {string} Formatted display name
   */
  getLocationDisplayName(location) {
    if (location instanceof window.ExploreXModels.Address) {
      return location.toString();
    }
    
    if (location.name) {
      return location.name;
    }
    
    if (location.latitude && location.longitude) {
      return window.ExploreXUtils.GeoUtils.formatCoordinates(location.latitude, location.longitude);
    }
    
    return 'Unknown Location';
  }

  /**
   * Add location to history
   * @param {GeoLocation} location - Location to add
   * @param {string} source - Source of location (GPS, GEOCODE, etc.)
   */
  addToHistory(location, source = 'UNKNOWN') {
    const historyEntry = {
      location,
      source,
      timestamp: new Date(),
      id: Date.now() + Math.random()
    };

    this.locationHistory.unshift(historyEntry);
    
    // Keep only last 50 entries
    if (this.locationHistory.length > 50) {
      this.locationHistory = this.locationHistory.slice(0, 50);
    }

    // Save to localStorage
    try {
      window.ExploreXUtils.StorageUtils.setItem('location_history', this.locationHistory, 24); // 24 hours
    } catch (error) {
      console.warn('Failed to save location history:', error);
    }
  }

  /**
   * Load location history from storage
   */
  loadLocationHistory() {
    try {
      const history = window.ExploreXUtils.StorageUtils.getItem('location_history');
      if (history && Array.isArray(history)) {
        this.locationHistory = history;
      }
    } catch (error) {
      console.warn('Failed to load location history:', error);
    }
  }

  // ===========================================================================
  // MOCK SERVICES FOR DEVELOPMENT
  // ===========================================================================

  /**
   * Mock geocoding service for development
   * @param {string} address - Address to geocode
   * @returns {Promise<Array>} Mock geocoding results
   */
  async mockGeocode(address) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const queryLower = address.toLowerCase();
    const results = [];

    // Check popular destinations first
    LocationConfig.popularDestinations.forEach(dest => {
      if (dest.name.toLowerCase().includes(queryLower)) {
        results.push({
          name: dest.name,
          location: new window.ExploreXModels.GeoLocation({ latitude: dest.lat, longitude: dest.lng }),
          address: new window.ExploreXModels.Address({
            formattedAddress: dest.name,
            city: dest.name.split(',')[0].trim(),
            state: dest.name.split(',')[1]?.trim() || '',
            country: 'USA'
          }),
          confidence: 0.9,
          type: 'popular_destination'
        });
      }
    });

    // Add some mock city results
    const mockCities = [
      { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
      { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
      { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
      { name: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
      { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740 },
      { name: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
      { name: 'San Antonio, TX', lat: 29.4241, lng: -98.4936 },
      { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611 },
      { name: 'Dallas, TX', lat: 32.7767, lng: -96.7970 },
      { name: 'San Jose, CA', lat: 37.3382, lng: -121.8863 }
    ];

    mockCities.forEach(city => {
      if (city.name.toLowerCase().includes(queryLower)) {
        results.push({
          name: city.name,
          location: new window.ExploreXModels.GeoLocation({ latitude: city.lat, longitude: city.lng }),
          address: new window.ExploreXModels.Address({
            formattedAddress: city.name,
            city: city.name.split(',')[0].trim(),
            state: city.name.split(',')[1]?.trim() || '',
            country: 'USA'
          }),
          confidence: 0.8,
          type: 'city'
        });
      }
    });

    return results.slice(0, LocationConfig.maxSuggestions);
  }

  /**
   * Mock reverse geocoding service
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Address>} Mock address
   */
  async mockReverseGeocode(lat, lng) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Find closest popular destination
    let closestDest = null;
    let minDistance = Infinity;

    LocationConfig.popularDestinations.forEach(dest => {
      const distance = window.ExploreXUtils.GeoUtils.calculateDistance(lat, lng, dest.lat, dest.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestDest = dest;
      }
    });

    if (closestDest && minDistance < 10) {
      // If within 10 miles of a popular destination, return that
      return new window.ExploreXModels.Address({
        formattedAddress: closestDest.name,
        city: closestDest.name.split(',')[0].trim(),
        state: closestDest.name.split(',')[1]?.trim() || '',
        country: 'USA'
      });
    }

    // Otherwise return generic coordinates-based address
    return new window.ExploreXModels.Address({
      formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: 'Unknown City',
      state: 'Unknown State',
      country: 'USA'
    });
  }

  /**
   * Get mock location suggestions
   * @param {string} query - Search query
   * @returns {Promise<Array>} Mock suggestions
   */
  async getMockLocationSuggestions(query) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const queryLower = query.toLowerCase();
    const suggestions = [];

    // Mock US cities and states
    const mockLocations = [
      'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
      'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
      'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
      'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
      'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK',
      'Portland, OR', 'Las Vegas, NV', 'Memphis, TN', 'Louisville, KY', 'Baltimore, MD'
    ];

    mockLocations.forEach(location => {
      if (location.toLowerCase().includes(queryLower)) {
        suggestions.push({
          name: location,
          location: new window.ExploreXModels.GeoLocation({ 
            latitude: 40 + Math.random() * 10, 
            longitude: -120 + Math.random() * 40 
          }),
          type: 'city',
          category: 'general'
        });
      }
    });

    return suggestions.slice(0, 5);
  }
}

// =============================================================================
// LOCATION AUTOCOMPLETE UI COMPONENT
// =============================================================================

class LocationAutocomplete {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      minLength: 2,
      maxSuggestions: 8,
      showPopularDestinations: true,
      enableGPS: true,
      placeholder: 'Enter city, state, or space destination',
      ...options
    };
    
    this.locationServices = new LocationServices();
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    
    this.init();
  }

  init() {
    this.setupInput();
    this.createSuggestionsContainer();
    this.setupEventListeners();
    this.loadLocationHistory();
  }

  setupInput() {
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('placeholder', this.options.placeholder);
    this.input.classList.add('location-autocomplete-input');
  }

  createSuggestionsContainer() {
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'location-suggestions';
    this.suggestionsContainer.style.display = 'none';
    
    // Insert after input
    this.input.parentNode.insertBefore(this.suggestionsContainer, this.input.nextSibling);
  }

  setupEventListeners() {
    // Input events
    this.input.addEventListener('input', window.ExploreXUtils.PerformanceUtils.debounce(
      this.handleInput.bind(this), 300
    ));
    
    this.input.addEventListener('focus', this.handleFocus.bind(this));
    this.input.addEventListener('blur', this.handleBlur.bind(this));
    this.input.addEventListener('keydown', this.handleKeydown.bind(this));

    // GPS button if enabled
    if (this.options.enableGPS) {
      this.createGPSButton();
    }

    // Click outside to close
    document.addEventListener('click', (event) => {
      if (!this.input.contains(event.target) && !this.suggestionsContainer.contains(event.target)) {
        this.closeSuggestions();
      }
    });
  }

  createGPSButton() {
    const gpsButton = document.createElement('button');
    gpsButton.type = 'button';
    gpsButton.className = 'gps-location-button';
    gpsButton.innerHTML = '📍';
    gpsButton.title = 'Use my current location';
    
    gpsButton.addEventListener('click', this.handleGPSClick.bind(this));
    
    // Insert GPS button after input
    this.input.parentNode.insertBefore(gpsButton, this.input.nextSibling);
  }

  async handleInput(event) {
    const query = event.target.value.trim();
    
    if (query.length < this.options.minLength) {
      if (this.options.showPopularDestinations) {
        this.showPopularDestinations();
      } else {
        this.closeSuggestions();
      }
      return;
    }

    try {
      this.suggestions = await this.locationServices.getLocationSuggestions(query, {
        maxResults: this.options.maxSuggestions
      });
      
      this.renderSuggestions();
      this.openSuggestions();
    } catch (error) {
      console.error('Failed to get location suggestions:', error);
      this.closeSuggestions();
    }
  }

  handleFocus() {
    if (this.input.value.trim().length === 0 && this.options.showPopularDestinations) {
      this.showPopularDestinations();
    } else if (this.suggestions.length > 0) {
      this.openSuggestions();
    }
  }

  handleBlur() {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      this.closeSuggestions();
    }, 150);
  }

  handleKeydown(event) {
    if (!this.isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.updateSelection();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
        
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
        break;
        
      case 'Escape':
        this.closeSuggestions();
        break;
    }
  }

  async handleGPSClick() {
    const gpsButton = document.querySelector('.gps-location-button');
    const originalContent = gpsButton.innerHTML;
    
    try {
      gpsButton.innerHTML = '⏳';
      gpsButton.disabled = true;
      
      const location = await this.locationServices.getCurrentLocation();
      const address = await this.locationServices.reverseGeocode(location.latitude, location.longitude);
      
      this.input.value = address.toString();
      this.input.dispatchEvent(new Event('locationSelected', { 
        bubbles: true, 
        detail: { location, address, source: 'gps' }
      }));
      
      this.closeSuggestions();
      
    } catch (error) {
      console.error('GPS location failed:', error);
      alert('Unable to get your location. Please enter a location manually.');
    } finally {
      gpsButton.innerHTML = originalContent;
      gpsButton.disabled = false;
    }
  }

  showPopularDestinations() {
    this.suggestions = this.locationServices.getPopularDestinations().slice(0, this.options.maxSuggestions);
    this.renderSuggestions();
    this.openSuggestions();
  }

  renderSuggestions() {
    this.suggestionsContainer.innerHTML = '';
    this.selectedIndex = -1;

    if (this.suggestions.length === 0) {
      this.closeSuggestions();
      return;
    }

    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'location-suggestion-item';
      item.dataset.index = index;
      
      const icon = this.getSuggestionIcon(suggestion.category || suggestion.type);
      const name = suggestion.name;
      const category = this.getSuggestionCategory(suggestion.category || suggestion.type);
      
      item.innerHTML = `
        <span class="suggestion-icon">${icon}</span>
        <div class="suggestion-content">
          <div class="suggestion-name">${name}</div>
          <div class="suggestion-category">${category}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      this.suggestionsContainer.appendChild(item);
    });
  }

  getSuggestionIcon(type) {
    const icons = {
      observatory: '🔭',
      planetarium: '🌌',
      space_center: '🚀',
      museum: '🏛️',
      research: '🔬',
      city: '🏙️',
      popular_destination: '⭐',
      default: '📍'
    };
    
    return icons[type] || icons.default;
  }

  getSuggestionCategory(type) {
    const categories = {
      observatory: 'Observatory',
      planetarium: 'Planetarium',
      space_center: 'Space Center',
      museum: 'Museum',
      research: 'Research Facility',
      city: 'City',
      popular_destination: 'Popular Destination',
      default: 'Location'
    };
    
    return categories[type] || categories.default;
  }

  updateSelection() {
    const items = this.suggestionsContainer.querySelectorAll('.location-suggestion-item');
    
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  selectSuggestion(suggestion) {
    this.input.value = suggestion.name;
    
    // Dispatch custom event with location data
    this.input.dispatchEvent(new CustomEvent('locationSelected', {
      bubbles: true,
      detail: {
        location: suggestion.location,
        name: suggestion.name,
        type: suggestion.type,
        category: suggestion.category,
        source: 'autocomplete'
      }
    }));
    
    this.closeSuggestions();
    this.locationServices.addToHistory(suggestion.location, 'AUTOCOMPLETE');
  }

  openSuggestions() {
    this.suggestionsContainer.style.display = 'block';
    this.isOpen = true;
  }

  closeSuggestions() {
    this.suggestionsContainer.style.display = 'none';
    this.isOpen = false;
    this.selectedIndex = -1;
  }

  loadLocationHistory() {
    this.locationServices.loadLocationHistory();
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

// Make location services available globally
if (typeof window !== 'undefined') {
  window.ExploreXLocationServices = {
    LocationServices,
    LocationAutocomplete,
    LocationConfig
  };
} else {
  module.exports = {
    LocationServices,
    LocationAutocomplete,
    LocationConfig
  };
}

console.log('✅ ExploreX Location Services loaded successfully');