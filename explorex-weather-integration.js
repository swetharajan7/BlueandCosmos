/**
 * ExploreX Weather Integration Component
 * Space Travel Experience Recommendation System
 * 
 * This module integrates weather and astronomical conditions with the main ExploreX interface:
 * - Weather-based experience recommendations
 * - Real-time condition displays
 * - Optimal viewing time suggestions
 * - Weather alerts and notifications
 * - Experience suitability assessments
 */

// =============================================================================
// WEATHER INTEGRATION MANAGER
// =============================================================================

class ExploreXWeatherIntegration {
  constructor(options = {}) {
    this.options = {
      enableWeatherDisplay: true,
      enableViewingRecommendations: true,
      enableWeatherAlerts: true,
      autoRefreshInterval: 15 * 60 * 1000, // 15 minutes
      forecastDays: 5,
      ...options
    };
    
    this.weatherAPIManager = null;
    this.currentLocation = null;
    this.currentWeather = null;
    this.weatherForecast = null;
    this.weatherWidgets = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the weather integration
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🌤️ Initializing ExploreX Weather Integration...');
      
      // Initialize the Weather API Manager
      this.weatherAPIManager = new window.ExploreXWeatherAPI.WeatherAPIManager();
      await this.weatherAPIManager.initialize();
      
      // Setup weather UI components
      this.setupWeatherUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup auto-refresh
      if (this.options.autoRefreshInterval > 0) {
        this.setupAutoRefresh();
      }
      
      this.isInitialized = true;
      console.log('✅ Weather Integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Weather Integration:', error);
      throw error;
    }
  }

  /**
   * Setup weather UI components
   */
  setupWeatherUI() {
    // Add weather widget to the main interface
    this.createWeatherWidget();
    
    // Add weather information to experience cards
    this.enhanceExperienceCards();
    
    // Add viewing conditions panel
    this.createViewingConditionsPanel();
  }

  /**
   * Create main weather widget
   */
  createWeatherWidget() {
    const searchContainer = document.querySelector('.search-container') || 
                           document.querySelector('.hero-section') ||
                           document.querySelector('main');
    
    if (!searchContainer) return;
    
    const weatherWidget = document.createElement('div');
    weatherWidget.id = 'weather-widget';
    weatherWidget.className = 'weather-widget';
    weatherWidget.style.display = 'none'; // Initially hidden
    
    weatherWidget.innerHTML = `
      <div class="weather-widget-content">
        <div class="weather-current" id="weather-current">
          <div class="weather-loading">
            <div class="weather-loading-spinner"></div>
            <span class="weather-loading-text">Loading weather...</span>
          </div>
        </div>
        
        <div class="weather-viewing-conditions" id="weather-viewing-conditions">
          <!-- Viewing conditions will be populated here -->
        </div>
        
        <div class="weather-forecast-toggle">
          <button class="weather-toggle-button" onclick="this.toggleWeatherForecast()">
            <span class="toggle-icon">📅</span>
            <span class="toggle-text">5-Day Forecast</span>
          </button>
        </div>
        
        <div class="weather-forecast" id="weather-forecast" style="display: none;">
          <!-- Forecast will be populated here -->
        </div>
      </div>
    `;
    
    // Insert after search container
    searchContainer.parentNode.insertBefore(weatherWidget, searchContainer.nextSibling);
    
    this.weatherWidgets.set('main', weatherWidget);
  }

  /**
   * Create viewing conditions panel
   */
  createViewingConditionsPanel() {
    const resultsContainer = document.querySelector('.search-results-container') ||
                            document.querySelector('.results-section') ||
                            document.querySelector('main');
    
    if (!resultsContainer) return;
    
    const viewingPanel = document.createElement('div');
    viewingPanel.id = 'viewing-conditions-panel';
    viewingPanel.className = 'viewing-conditions-panel';
    viewingPanel.style.display = 'none'; // Initially hidden
    
    viewingPanel.innerHTML = `
      <div class="viewing-conditions-content">
        <div class="viewing-conditions-header">
          <h3 class="viewing-conditions-title">
            <span class="title-icon">🌌</span>
            <span class="title-text">Astronomical Viewing Conditions</span>
          </h3>
          <button class="viewing-conditions-toggle" onclick="this.toggleViewingConditions()">
            <span class="toggle-icon">📊</span>
          </button>
        </div>
        
        <div class="viewing-conditions-body" id="viewing-conditions-body">
          <!-- Viewing conditions details will be populated here -->
        </div>
      </div>
    `;
    
    resultsContainer.appendChild(viewingPanel);
    this.weatherWidgets.set('viewing', viewingPanel);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for location changes
    document.addEventListener('locationSelected', this.handleLocationChange.bind(this));
    
    // Listen for experience card interactions
    document.addEventListener('experienceCardHover', this.handleExperienceHover.bind(this));
    
    // Listen for weather widget interactions
    document.addEventListener('click', (e) => {
      if (e.target.matches('.weather-refresh-button')) {
        this.refreshWeatherData();
      }
    });
  }

  // ===========================================================================
  // WEATHER DATA MANAGEMENT
  // ===========================================================================

  /**
   * Load weather data for a location
   */
  async loadWeatherData(location) {
    try {
      this.currentLocation = location;
      
      console.log(`🌤️ Loading weather data for ${location.name || 'location'}`);
      
      // Show loading state
      this.showWeatherLoading(true);
      
      // Fetch current weather and forecast
      const [currentWeather, forecast] = await Promise.all([
        this.weatherAPIManager.getCurrentWeather(location),
        this.weatherAPIManager.getWeatherForecast(location, this.options.forecastDays)
      ]);
      
      this.currentWeather = currentWeather;
      this.weatherForecast = forecast;
      
      // Update UI
      this.updateWeatherDisplay();
      this.updateViewingConditions();
      this.updateExperienceRecommendations();
      
      // Show weather widgets
      this.showWeatherWidgets(true);
      
      console.log('✅ Weather data loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load weather data:', error);
      this.showWeatherError('Unable to load weather data');
    } finally {
      this.showWeatherLoading(false);
    }
  }

  /**
   * Update weather display
   */
  updateWeatherDisplay() {
    const weatherCurrent = document.getElementById('weather-current');
    if (!weatherCurrent || !this.currentWeather) return;
    
    const weather = this.currentWeather;
    const astronomy = weather.astronomy;
    
    weatherCurrent.innerHTML = `
      <div class="weather-current-content">
        <div class="weather-main">
          <div class="weather-condition">
            <span class="weather-icon">${weather.condition.icon}</span>
            <div class="weather-details">
              <div class="weather-temperature">${Math.round(weather.temperature)}°C</div>
              <div class="weather-condition-text">${weather.condition.name}</div>
            </div>
          </div>
          
          <div class="weather-metrics">
            <div class="weather-metric">
              <span class="metric-icon">☁️</span>
              <span class="metric-label">Cloud Cover</span>
              <span class="metric-value">${weather.cloudCover}%</span>
            </div>
            <div class="weather-metric">
              <span class="metric-icon">👁️</span>
              <span class="metric-label">Visibility</span>
              <span class="metric-value">${weather.visibility} km</span>
            </div>
            <div class="weather-metric">
              <span class="metric-icon">💨</span>
              <span class="metric-label">Wind</span>
              <span class="metric-value">${weather.windSpeed} km/h</span>
            </div>
            <div class="weather-metric">
              <span class="metric-icon">💧</span>
              <span class="metric-label">Humidity</span>
              <span class="metric-value">${weather.humidity}%</span>
            </div>
          </div>
        </div>
        
        <div class="weather-astronomy">
          <div class="astronomy-section">
            <h4 class="astronomy-title">
              <span class="title-icon">🌅</span>
              <span class="title-text">Sun & Moon</span>
            </h4>
            <div class="astronomy-times">
              <div class="astronomy-time">
                <span class="time-label">Sunrise</span>
                <span class="time-value">${this.formatTime(astronomy.sun.sunrise)}</span>
              </div>
              <div class="astronomy-time">
                <span class="time-label">Sunset</span>
                <span class="time-value">${this.formatTime(astronomy.sun.sunset)}</span>
              </div>
              <div class="astronomy-time">
                <span class="time-label">Moon Phase</span>
                <span class="time-value">${astronomy.moon.phase}</span>
              </div>
              <div class="astronomy-time">
                <span class="time-label">Illumination</span>
                <span class="time-value">${Math.round(astronomy.moon.illumination)}%</span>
              </div>
            </div>
          </div>
          
          <div class="darkness-section">
            <h4 class="darkness-title">
              <span class="title-icon">🌌</span>
              <span class="title-text">Darkness Period</span>
            </h4>
            ${astronomy.darkness.hasDarkness ? `
              <div class="darkness-times">
                <div class="darkness-time">
                  <span class="time-label">Darkness Starts</span>
                  <span class="time-value">${this.formatTime(astronomy.darkness.start)}</span>
                </div>
                <div class="darkness-time">
                  <span class="time-label">Darkness Ends</span>
                  <span class="time-value">${this.formatTime(astronomy.darkness.end)}</span>
                </div>
                <div class="darkness-duration">
                  <span class="duration-label">Duration</span>
                  <span class="duration-value">${this.formatDuration(astronomy.darkness.duration)}</span>
                </div>
              </div>
            ` : `
              <div class="no-darkness">
                <span class="no-darkness-text">No astronomical darkness tonight</span>
              </div>
            `}
          </div>
        </div>
        
        <div class="weather-actions">
          <button class="weather-refresh-button">
            <span class="button-icon">🔄</span>
            <span class="button-text">Refresh</span>
          </button>
          <button class="weather-details-button" onclick="this.showDetailedWeather()">
            <span class="button-icon">📊</span>
            <span class="button-text">Details</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Update viewing conditions display
   */
  updateViewingConditions() {
    const viewingConditionsBody = document.getElementById('viewing-conditions-body');
    if (!viewingConditionsBody || !this.currentWeather) return;
    
    const viewing = this.currentWeather.viewing;
    const recommendations = this.currentWeather.recommendations;
    
    viewingConditionsBody.innerHTML = `
      <div class="viewing-score-section">
        <div class="viewing-score">
          <div class="score-circle ${viewing.rating}">
            <span class="score-value">${viewing.score}</span>
            <span class="score-label">Score</span>
          </div>
          <div class="score-details">
            <div class="score-rating ${viewing.rating}">${this.formatRating(viewing.rating)}</div>
            <div class="score-description">${viewing.description}</div>
          </div>
        </div>
      </div>
      
      <div class="viewing-factors-section">
        <h4 class="factors-title">Condition Factors</h4>
        <div class="viewing-factors">
          ${viewing.factors.map(factor => `
            <div class="viewing-factor">
              <div class="factor-header">
                <span class="factor-name">${factor.factor}</span>
                <span class="factor-status ${factor.status}">${factor.value}</span>
              </div>
              <div class="factor-impact ${factor.impact < 0 ? 'negative' : 'positive'}">
                ${factor.impact < 0 ? '↓' : '↑'} ${Math.abs(Math.round(factor.impact))} points
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      ${recommendations.length > 0 ? `
        <div class="viewing-recommendations-section">
          <h4 class="recommendations-title">Recommendations</h4>
          <div class="viewing-recommendations">
            ${recommendations.map(rec => `
              <div class="viewing-recommendation ${rec.type}">
                <span class="recommendation-icon">${rec.icon}</span>
                <div class="recommendation-content">
                  <div class="recommendation-title">${rec.title}</div>
                  <div class="recommendation-description">${rec.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="forecast-preview-section">
        <h4 class="forecast-title">5-Day Outlook</h4>
        <div class="forecast-preview">
          ${this.createForecastPreview()}
        </div>
      </div>
    `;
  }

  /**
   * Create forecast preview
   */
  createForecastPreview() {
    if (!this.weatherForecast || !this.weatherForecast.forecast) {
      return '<div class="forecast-unavailable">Forecast unavailable</div>';
    }
    
    return this.weatherForecast.forecast.slice(0, 5).map(day => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      return `
        <div class="forecast-day">
          <div class="forecast-day-name">${dayName}</div>
          <div class="forecast-day-icon">${day.condition.icon}</div>
          <div class="forecast-day-temp">${Math.round(day.temperature.max)}°</div>
          <div class="forecast-day-conditions">
            <div class="forecast-clouds">${day.cloudCover}%</div>
            <div class="forecast-viewing ${day.viewing.rating}">
              ${this.getViewingIcon(day.viewing.rating)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update experience recommendations based on weather
   */
  updateExperienceRecommendations() {
    if (!this.currentWeather) return;
    
    // Find all experience cards and add weather suitability
    const experienceCards = document.querySelectorAll('.experience-card');
    experienceCards.forEach(card => {
      this.addWeatherSuitabilityToCard(card);
    });
    
    // Update search results with weather-based filtering
    this.updateSearchResultsWithWeather();
  }

  /**
   * Add weather suitability indicator to experience card
   */
  addWeatherSuitabilityToCard(card) {
    // Remove existing weather indicator
    const existingIndicator = card.querySelector('.weather-suitability');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Determine suitability based on experience type and weather
    const experienceType = this.getExperienceTypeFromCard(card);
    const suitability = this.assessExperienceSuitability(experienceType, this.currentWeather);
    
    // Create weather indicator
    const weatherIndicator = document.createElement('div');
    weatherIndicator.className = `weather-suitability ${suitability.level}`;
    weatherIndicator.innerHTML = `
      <span class="suitability-icon">${suitability.icon}</span>
      <span class="suitability-text">${suitability.text}</span>
    `;
    
    // Add to card
    const cardContent = card.querySelector('.card-content') || card;
    cardContent.appendChild(weatherIndicator);
  }

  /**
   * Assess experience suitability based on weather
   */
  assessExperienceSuitability(experienceType, weather) {
    const viewing = weather.viewing;
    
    // Different experience types have different weather requirements
    const requirements = {
      observatory: { minScore: 60, outdoor: true },
      planetarium: { minScore: 0, outdoor: false },
      space_center: { minScore: 20, outdoor: false },
      space_museum: { minScore: 0, outdoor: false },
      science_center: { minScore: 0, outdoor: false },
      stargazing_site: { minScore: 70, outdoor: true }
    };
    
    const req = requirements[experienceType] || { minScore: 30, outdoor: false };
    
    if (!req.outdoor) {
      return {
        level: 'excellent',
        icon: '✅',
        text: 'Weather independent'
      };
    }
    
    if (viewing.score >= req.minScore + 20) {
      return {
        level: 'excellent',
        icon: '🌟',
        text: 'Excellent conditions'
      };
    } else if (viewing.score >= req.minScore) {
      return {
        level: 'good',
        icon: '👍',
        text: 'Good conditions'
      };
    } else if (viewing.score >= req.minScore - 20) {
      return {
        level: 'fair',
        icon: '⚠️',
        text: 'Fair conditions'
      };
    } else {
      return {
        level: 'poor',
        icon: '❌',
        text: 'Poor conditions'
      };
    }
  }

  // ===========================================================================
  // UI INTERACTION HANDLERS
  // ===========================================================================

  /**
   * Handle location change
   */
  async handleLocationChange(event) {
    const locationData = event.detail;
    
    if (locationData.location) {
      await this.loadWeatherData(locationData.location);
    }
  }

  /**
   * Handle experience card hover
   */
  handleExperienceHover(event) {
    const card = event.target.closest('.experience-card');
    if (!card || !this.currentWeather) return;
    
    // Show weather tooltip or enhanced information
    this.showWeatherTooltip(card, event);
  }

  /**
   * Toggle weather forecast display
   */
  toggleWeatherForecast() {
    const forecastElement = document.getElementById('weather-forecast');
    const toggleButton = document.querySelector('.weather-toggle-button');
    
    if (!forecastElement || !toggleButton) return;
    
    const isVisible = forecastElement.style.display !== 'none';
    
    if (isVisible) {
      forecastElement.style.display = 'none';
      toggleButton.querySelector('.toggle-text').textContent = '5-Day Forecast';
      toggleButton.querySelector('.toggle-icon').textContent = '📅';
    } else {
      this.updateForecastDisplay();
      forecastElement.style.display = 'block';
      toggleButton.querySelector('.toggle-text').textContent = 'Hide Forecast';
      toggleButton.querySelector('.toggle-icon').textContent = '📈';
    }
  }

  /**
   * Toggle viewing conditions panel
   */
  toggleViewingConditions() {
    const panel = document.getElementById('viewing-conditions-panel');
    const body = document.getElementById('viewing-conditions-body');
    
    if (!panel || !body) return;
    
    const isExpanded = body.style.display !== 'none';
    body.style.display = isExpanded ? 'none' : 'block';
    
    const toggleButton = panel.querySelector('.viewing-conditions-toggle');
    if (toggleButton) {
      toggleButton.querySelector('.toggle-icon').textContent = isExpanded ? '📊' : '📉';
    }
  }

  /**
   * Show detailed weather modal
   */
  showDetailedWeather() {
    if (!this.currentWeather || !this.weatherForecast) return;
    
    // Create detailed weather modal
    const modal = new window.ExploreXUI.Modal({
      size: 'large',
      closeOnBackdrop: true,
      closeOnEscape: true
    });
    
    const content = this.createDetailedWeatherContent();
    
    modal.open({
      title: `Weather & Astronomical Conditions - ${this.currentLocation.name || 'Current Location'}`,
      body: content,
      footer: this.createWeatherModalFooter()
    });
  }

  /**
   * Refresh weather data
   */
  async refreshWeatherData() {
    if (!this.currentLocation) return;
    
    console.log('🔄 Refreshing weather data...');
    
    // Clear cache for current location
    const cacheKeys = [
      `current_${this.currentLocation.latitude}_${this.currentLocation.longitude}`,
      `forecast_${this.currentLocation.latitude}_${this.currentLocation.longitude}_${this.options.forecastDays}`
    ];
    
    cacheKeys.forEach(key => {
      this.weatherAPIManager.cache.delete(key);
    });
    
    // Reload weather data
    await this.loadWeatherData(this.currentLocation);
    
    // Show success notification
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.success('Weather data refreshed!');
    }
  }

  // ===========================================================================
  // UI UTILITY METHODS
  // ===========================================================================

  /**
   * Show/hide weather widgets
   */
  showWeatherWidgets(show) {
    this.weatherWidgets.forEach(widget => {
      widget.style.display = show ? 'block' : 'none';
    });
  }

  /**
   * Show/hide weather loading state
   */
  showWeatherLoading(show) {
    const loadingElements = document.querySelectorAll('.weather-loading');
    loadingElements.forEach(element => {
      element.style.display = show ? 'flex' : 'none';
    });
  }

  /**
   * Show weather error message
   */
  showWeatherError(message) {
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.error(message);
    } else {
      console.error(message);
    }
  }

  /**
   * Format time for display
   */
  formatTime(date) {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Format duration in minutes to readable format
   */
  formatDuration(minutes) {
    if (!minutes || minutes <= 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * Format rating for display
   */
  formatRating(rating) {
    const ratingMap = {
      'excellent': 'Excellent',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor',
      'very-poor': 'Very Poor'
    };
    
    return ratingMap[rating] || 'Unknown';
  }

  /**
   * Get viewing icon for rating
   */
  getViewingIcon(rating) {
    const iconMap = {
      'excellent': '🌟',
      'good': '👍',
      'fair': '⚠️',
      'poor': '👎',
      'very-poor': '❌'
    };
    
    return iconMap[rating] || '❓';
  }

  /**
   * Get experience type from card
   */
  getExperienceTypeFromCard(card) {
    // Try to extract experience type from card data or classes
    const typeElement = card.querySelector('[data-type]');
    if (typeElement) {
      return typeElement.dataset.type;
    }
    
    // Fallback: try to determine from card content
    const cardText = card.textContent.toLowerCase();
    if (cardText.includes('observatory')) return 'observatory';
    if (cardText.includes('planetarium')) return 'planetarium';
    if (cardText.includes('space center')) return 'space_center';
    if (cardText.includes('museum')) return 'space_museum';
    if (cardText.includes('science')) return 'science_center';
    
    return 'observatory'; // Default
  }

  /**
   * Update forecast display
   */
  updateForecastDisplay() {
    const forecastElement = document.getElementById('weather-forecast');
    if (!forecastElement || !this.weatherForecast) return;
    
    forecastElement.innerHTML = `
      <div class="forecast-content">
        <div class="forecast-header">
          <h4 class="forecast-title">5-Day Weather & Viewing Forecast</h4>
          <div class="forecast-summary">${this.weatherForecast.summary.description}</div>
        </div>
        
        <div class="forecast-days">
          ${this.weatherForecast.forecast.map(day => this.createForecastDayCard(day)).join('')}
        </div>
        
        <div class="forecast-best-days">
          <h5 class="best-days-title">Best Viewing Days</h5>
          <div class="best-days-list">
            ${this.weatherForecast.bestViewingDays.map(day => `
              <div class="best-day">
                <span class="best-day-date">${day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span class="best-day-score">${Math.round(day.score)}%</span>
                <span class="best-day-reason">${day.reason}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create forecast day card
   */
  createForecastDayCard(day) {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `
      <div class="forecast-day-card">
        <div class="forecast-day-header">
          <div class="forecast-day-name">${dayName}</div>
          <div class="forecast-day-date">${dateStr}</div>
        </div>
        
        <div class="forecast-day-weather">
          <div class="forecast-weather-icon">${day.condition.icon}</div>
          <div class="forecast-weather-temp">
            <span class="temp-high">${Math.round(day.temperature.max)}°</span>
            <span class="temp-low">${Math.round(day.temperature.min)}°</span>
          </div>
          <div class="forecast-weather-condition">${day.condition.name}</div>
        </div>
        
        <div class="forecast-day-details">
          <div class="forecast-detail">
            <span class="detail-label">Clouds</span>
            <span class="detail-value">${day.cloudCover}%</span>
          </div>
          <div class="forecast-detail">
            <span class="detail-label">Visibility</span>
            <span class="detail-value">${day.visibility} km</span>
          </div>
          <div class="forecast-detail">
            <span class="detail-label">Wind</span>
            <span class="detail-value">${day.windSpeed} km/h</span>
          </div>
        </div>
        
        <div class="forecast-viewing-score">
          <div class="viewing-score-circle ${day.viewing.rating}">
            <span class="score-number">${day.viewing.score}</span>
          </div>
          <div class="viewing-score-text">${this.formatRating(day.viewing.rating)}</div>
        </div>
        
        <div class="forecast-astronomy">
          <div class="astronomy-detail">
            <span class="astronomy-label">Moon</span>
            <span class="astronomy-value">${day.astronomy.moon.phase}</span>
          </div>
          <div class="astronomy-detail">
            <span class="astronomy-label">Darkness</span>
            <span class="astronomy-value">${this.formatDuration(day.astronomy.darkness.duration)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup auto-refresh for weather data
   */
  setupAutoRefresh() {
    setInterval(() => {
      if (this.currentLocation) {
        console.log('🔄 Auto-refreshing weather data...');
        this.refreshWeatherData();
      }
    }, this.options.autoRefreshInterval);
  }

  /**
   * Set location for weather integration
   */
  setLocation(location) {
    this.loadWeatherData(location);
  }

  /**
   * Update search results with weather information
   */
  updateSearchResultsWithWeather() {
    // This would integrate with the search engine to factor in weather conditions
    // For now, we just update the visual indicators
    console.log('🌤️ Updated search results with weather information');
  }

  /**
   * Create detailed weather content for modal
   */
  createDetailedWeatherContent() {
    const container = document.createElement('div');
    container.className = 'detailed-weather-content';
    
    // This would create a comprehensive weather details view
    container.innerHTML = `
      <div class="detailed-weather-placeholder">
        <h3>Detailed Weather Information</h3>
        <p>Comprehensive weather and astronomical data would be displayed here.</p>
      </div>
    `;
    
    return container;
  }

  /**
   * Create weather modal footer
   */
  createWeatherModalFooter() {
    const footer = document.createElement('div');
    footer.className = 'weather-modal-footer';
    
    footer.innerHTML = `
      <button class="weather-modal-button secondary" onclick="this.exportWeatherData()">
        <span class="button-icon">📊</span>
        <span class="button-text">Export Data</span>
      </button>
      <button class="weather-modal-button primary" onclick="this.refreshWeatherData()">
        <span class="button-icon">🔄</span>
        <span class="button-text">Refresh</span>
      </button>
    `;
    
    return footer;
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXWeatherIntegration = ExploreXWeatherIntegration;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌤️ ExploreX Weather Integration system loaded');
});