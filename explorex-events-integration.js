/**
 * ExploreX Events Integration Component
 * Space Travel Experience Recommendation System
 * 
 * This module integrates the events API with the main ExploreX interface:
 * - Event search and filtering integration
 * - Event display in experience results
 * - Event registration and booking flows
 * - Calendar integration and event scheduling
 * - Real-time event updates and notifications
 */

// =============================================================================
// EVENTS INTEGRATION MANAGER
// =============================================================================

class ExploreXEventsIntegration {
  constructor(options = {}) {
    this.options = {
      enableEventSearch: true,
      enableEventCalendar: true,
      enableEventRegistration: true,
      autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
      ...options
    };
    
    this.eventAPIManager = null;
    this.currentLocation = null;
    this.activeFilters = {
      eventTypes: [],
      dateRange: null,
      priceRange: null,
      radius: 50
    };
    
    this.eventCache = new Map();
    this.registrationQueue = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the events integration
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing ExploreX Events Integration...');
      
      // Initialize the Event API Manager
      this.eventAPIManager = new window.ExploreXEventAPI.EventAPIManager();
      await this.eventAPIManager.initialize();
      
      // Setup UI integration
      this.setupEventUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup auto-refresh
      if (this.options.autoRefreshInterval > 0) {
        this.setupAutoRefresh();
      }
      
      this.isInitialized = true;
      console.log('✅ Events Integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Events Integration:', error);
      throw error;
    }
  }

  /**
   * Setup event UI components
   */
  setupEventUI() {
    // Add events section to the main interface
    this.createEventsSection();
    
    // Add event filters to the search interface
    this.addEventFilters();
    
    // Add event calendar component
    if (this.options.enableEventCalendar) {
      this.createEventCalendar();
    }
  }

  /**
   * Create events section in the main interface
   */
  createEventsSection() {
    const mainContainer = document.querySelector('.search-results-container') || 
                         document.querySelector('main') || 
                         document.body;
    
    const eventsSection = document.createElement('section');
    eventsSection.id = 'events-section';
    eventsSection.className = 'events-section';
    eventsSection.style.display = 'none'; // Initially hidden
    
    eventsSection.innerHTML = `
      <div class="events-container">
        <div class="events-header">
          <h2 class="events-title">🎓 Astronomy Events & Workshops</h2>
          <p class="events-subtitle">
            Discover workshops, lectures, stargazing events, and celestial phenomena near you
          </p>
        </div>
        
        <div class="events-filters" id="events-filters">
          <h3 class="events-filters-title">Filter Events</h3>
          <div class="events-filters-grid">
            <div class="filter-group">
              <label class="filter-label">Event Types</label>
              <div class="filter-checkboxes" id="event-type-filters">
                <!-- Populated by JavaScript -->
              </div>
            </div>
            
            <div class="filter-group">
              <label class="filter-label">Date Range</label>
              <select class="filter-select" id="date-range-filter">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="next-month">Next Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label class="filter-label">Price Range</label>
              <select class="filter-select" id="price-range-filter">
                <option value="">All Prices</option>
                <option value="free">Free Events</option>
                <option value="0-25">$0 - $25</option>
                <option value="25-50">$25 - $50</option>
                <option value="50-100">$50 - $100</option>
                <option value="100+">$100+</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label class="filter-label">Distance</label>
              <select class="filter-select" id="distance-filter">
                <option value="10">Within 10 miles</option>
                <option value="25">Within 25 miles</option>
                <option value="50" selected>Within 50 miles</option>
                <option value="100">Within 100 miles</option>
                <option value="500">Within 500 miles</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="events-results" id="events-results">
          <div class="events-results-header" id="events-results-header" style="display: none;">
            <div class="events-results-count" id="events-results-count"></div>
            <div class="events-sort-controls">
              <span class="sort-label">Sort by:</span>
              <select class="sort-select" id="events-sort-select">
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="popularity">Popularity</option>
                <option value="name">Name</option>
                <option value="distance">Distance</option>
              </select>
            </div>
          </div>
          
          <div class="events-grid" id="events-grid">
            <!-- Events will be populated here -->
          </div>
          
          <div class="events-loading" id="events-loading" style="display: none;">
            <div class="events-loading-spinner"></div>
            <div class="events-loading-text">Loading events...</div>
          </div>
          
          <div class="events-empty" id="events-empty" style="display: none;">
            <div class="events-empty-icon">📅</div>
            <h3 class="events-empty-title">No Events Found</h3>
            <p class="events-empty-text">
              Try adjusting your filters or expanding your search radius to find more events.
            </p>
          </div>
        </div>
      </div>
    `;
    
    mainContainer.appendChild(eventsSection);
    
    // Populate event type filters
    this.populateEventTypeFilters();
  }

  /**
   * Populate event type filter checkboxes
   */
  populateEventTypeFilters() {
    const container = document.getElementById('event-type-filters');
    if (!container) return;
    
    const eventTypes = window.ExploreXEventAPI.EventAPIConfig.eventTypes;
    
    container.innerHTML = eventTypes.map(type => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${type.id}" onchange="this.handleEventTypeFilter('${type.id}', this.checked)">
        <span class="filter-checkbox-label">
          ${type.icon} ${type.label}
        </span>
      </label>
    `).join('');
  }

  /**
   * Add event filters to existing search interface
   */
  addEventFilters() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    
    // Add events toggle to search interface
    const eventsToggle = document.createElement('div');
    eventsToggle.className = 'search-toggle-group';
    eventsToggle.innerHTML = `
      <label class="search-toggle">
        <input type="checkbox" id="include-events-toggle" onchange="this.toggleEventsSearch(this.checked)">
        <span class="toggle-slider"></span>
        <span class="toggle-label">Include Events & Workshops</span>
      </label>
    `;
    
    // Insert after search input
    const searchInput = searchContainer.querySelector('.search-input-container');
    if (searchInput) {
      searchInput.parentNode.insertBefore(eventsToggle, searchInput.nextSibling);
    }
  }

  /**
   * Create event calendar component
   */
  createEventCalendar() {
    const eventsSection = document.getElementById('events-section');
    if (!eventsSection) return;
    
    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'event-calendar-container';
    calendarContainer.innerHTML = `
      <div class="event-calendar" id="event-calendar">
        <div class="calendar-header">
          <h3 class="calendar-title">Event Calendar</h3>
          <div class="calendar-navigation">
            <button class="calendar-nav-button" id="calendar-prev-month">‹</button>
            <div class="calendar-month-year" id="calendar-month-year"></div>
            <button class="calendar-nav-button" id="calendar-next-month">›</button>
          </div>
        </div>
        
        <div class="calendar-grid" id="calendar-grid">
          <!-- Calendar will be populated here -->
        </div>
      </div>
    `;
    
    eventsSection.appendChild(calendarContainer);
    this.initializeCalendar();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Global event listeners
    document.addEventListener('showEventDetails', this.handleShowEventDetails.bind(this));
    document.addEventListener('registerForEvent', this.handleEventRegistration.bind(this));
    
    // Filter change listeners
    document.addEventListener('change', (e) => {
      if (e.target.matches('#date-range-filter')) {
        this.handleDateRangeFilter(e.target.value);
      } else if (e.target.matches('#price-range-filter')) {
        this.handlePriceRangeFilter(e.target.value);
      } else if (e.target.matches('#distance-filter')) {
        this.handleDistanceFilter(e.target.value);
      } else if (e.target.matches('#events-sort-select')) {
        this.handleSortChange(e.target.value);
      }
    });
    
    // Calendar navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('#calendar-prev-month')) {
        this.navigateCalendar(-1);
      } else if (e.target.matches('#calendar-next-month')) {
        this.navigateCalendar(1);
      }
    });
  }

  // ===========================================================================
  // EVENT SEARCH AND DISPLAY
  // ===========================================================================

  /**
   * Search for events based on current criteria
   */
  async searchEvents(location = null) {
    try {
      this.showEventsLoading(true);
      
      const searchCriteria = {
        location: location || this.currentLocation,
        ...this.activeFilters
      };
      
      console.log('🔍 Searching events with criteria:', searchCriteria);
      
      const results = await this.eventAPIManager.searchEvents(searchCriteria);
      
      this.displayEventResults(results);
      this.updateEventCalendar(results.events);
      
      return results;
      
    } catch (error) {
      console.error('❌ Event search failed:', error);
      this.showEventsError('Failed to load events. Please try again.');
    } finally {
      this.showEventsLoading(false);
    }
  }

  /**
   * Display event search results
   */
  displayEventResults(results) {
    const eventsGrid = document.getElementById('events-grid');
    const resultsHeader = document.getElementById('events-results-header');
    const resultsCount = document.getElementById('events-results-count');
    const emptyState = document.getElementById('events-empty');
    
    if (!eventsGrid) return;
    
    // Clear previous results
    eventsGrid.innerHTML = '';
    
    if (results.events.length === 0) {
      emptyState.style.display = 'flex';
      resultsHeader.style.display = 'none';
      return;
    }
    
    // Show results header
    emptyState.style.display = 'none';
    resultsHeader.style.display = 'flex';
    resultsCount.innerHTML = `
      Found <strong>${results.total}</strong> event${results.total !== 1 ? 's' : ''}
    `;
    
    // Create event cards
    results.events.forEach(event => {
      new window.ExploreXEventAPI.EventCard(event, eventsGrid);
    });
    
    // Show events section
    document.getElementById('events-section').style.display = 'block';
  }

  /**
   * Show/hide events loading state
   */
  showEventsLoading(show) {
    const loadingElement = document.getElementById('events-loading');
    if (loadingElement) {
      loadingElement.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show events error message
   */
  showEventsError(message) {
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.error(message);
    } else {
      console.error(message);
    }
  }

  // ===========================================================================
  // EVENT FILTERING
  // ===========================================================================

  /**
   * Handle event type filter changes
   */
  handleEventTypeFilter(typeId, checked) {
    if (checked) {
      if (!this.activeFilters.eventTypes.includes(typeId)) {
        this.activeFilters.eventTypes.push(typeId);
      }
    } else {
      this.activeFilters.eventTypes = this.activeFilters.eventTypes.filter(id => id !== typeId);
    }
    
    this.refreshEventSearch();
  }

  /**
   * Handle date range filter changes
   */
  handleDateRangeFilter(value) {
    const now = new Date();
    let dateRange = null;
    
    switch (value) {
      case 'today':
        dateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        break;
      case 'tomorrow':
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        dateRange = {
          startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
          endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
        };
        break;
      case 'this-week':
        const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        dateRange = { startDate: startOfWeek, endDate: endOfWeek };
        break;
      case 'this-month':
        dateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
        break;
      case 'next-month':
        dateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 2, 0)
        };
        break;
    }
    
    this.activeFilters.dateRange = dateRange;
    this.refreshEventSearch();
  }

  /**
   * Handle price range filter changes
   */
  handlePriceRangeFilter(value) {
    let priceRange = null;
    
    switch (value) {
      case 'free':
        priceRange = { min: 0, max: 0 };
        break;
      case '0-25':
        priceRange = { min: 0, max: 25 };
        break;
      case '25-50':
        priceRange = { min: 25, max: 50 };
        break;
      case '50-100':
        priceRange = { min: 50, max: 100 };
        break;
      case '100+':
        priceRange = { min: 100, max: Infinity };
        break;
    }
    
    this.activeFilters.priceRange = priceRange;
    this.refreshEventSearch();
  }

  /**
   * Handle distance filter changes
   */
  handleDistanceFilter(value) {
    this.activeFilters.radius = parseInt(value);
    this.refreshEventSearch();
  }

  /**
   * Handle sort order changes
   */
  handleSortChange(sortBy) {
    // Re-search with new sort order
    this.refreshEventSearch(sortBy);
  }

  /**
   * Refresh event search with current filters
   */
  refreshEventSearch(sortBy = 'date') {
    if (this.currentLocation) {
      this.searchEvents(this.currentLocation);
    }
  }

  // ===========================================================================
  // EVENT DETAILS AND REGISTRATION
  // ===========================================================================

  /**
   * Handle show event details request
   */
  async handleShowEventDetails(event) {
    const eventData = event.detail.event;
    
    try {
      // Get detailed event information
      const eventDetails = await this.eventAPIManager.getEventDetails(eventData.id);
      
      // Show event details modal
      this.showEventDetailsModal(eventDetails);
      
    } catch (error) {
      console.error('Failed to load event details:', error);
      this.showEventsError('Failed to load event details. Please try again.');
    }
  }

  /**
   * Show event details modal
   */
  showEventDetailsModal(eventData) {
    // Create modal if it doesn't exist
    if (!this.eventDetailsModal) {
      this.eventDetailsModal = new window.ExploreXUI.Modal({
        size: 'large',
        closeOnBackdrop: true,
        closeOnEscape: true
      });
    }
    
    const modalContent = this.createEventDetailsContent(eventData);
    
    this.eventDetailsModal.open({
      title: eventData.title,
      body: modalContent,
      footer: this.createEventDetailsFooter(eventData)
    });
  }

  /**
   * Create event details modal content
   */
  createEventDetailsContent(eventData) {
    const container = document.createElement('div');
    container.className = 'event-detail-modal';
    
    const eventDate = new Date(eventData.startDate);
    const eventTypeConfig = window.ExploreXEventAPI.EventAPIConfig.eventTypes.find(t => t.id === eventData.type);
    
    container.innerHTML = `
      <div class="event-modal-header" style="background-image: url('${eventData.imageUrl}')">
        <div class="event-modal-overlay">
          <div class="event-modal-badges">
            ${eventData.price.isFree ? '<span class="event-modal-badge free">Free</span>' : ''}
            <span class="event-modal-badge ${eventData.type}">${eventTypeConfig ? eventTypeConfig.label : eventData.type}</span>
          </div>
          <div class="event-modal-info">
            <h1 class="event-modal-title">${eventData.title}</h1>
            <div class="event-modal-meta">
              <div class="event-meta-item">
                <span class="event-detail-icon">📅</span>
                <span>${eventDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div class="event-meta-item">
                <span class="event-detail-icon">⏰</span>
                <span>${eventDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}</span>
              </div>
              <div class="event-meta-item">
                <span class="event-detail-icon">📍</span>
                <span>${eventData.location.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="event-modal-content">
        <div class="event-content-section">
          <h3 class="event-section-title">About This Event</h3>
          <p class="event-description-full">${eventData.description}</p>
        </div>
        
        <div class="event-content-section">
          <h3 class="event-section-title">Event Details</h3>
          <div class="event-details-grid">
            <div class="event-detail-card">
              <h4 class="event-detail-card-title">When & Where</h4>
              <ul class="event-detail-list">
                <li><strong>Date:</strong> ${eventDate.toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${this.formatEventTime(eventData)}</li>
                <li><strong>Duration:</strong> ${this.formatDuration(eventData.duration)}</li>
                <li><strong>Location:</strong> ${eventData.location.name}</li>
                <li><strong>Address:</strong> ${eventData.location.address}</li>
              </ul>
            </div>
            
            <div class="event-detail-card">
              <h4 class="event-detail-card-title">Pricing & Registration</h4>
              <ul class="event-detail-list">
                <li><strong>Price:</strong> ${eventData.price.isFree ? 'Free' : `$${eventData.price.amount}`}</li>
                ${eventData.capacity ? `
                  <li><strong>Capacity:</strong> ${eventData.capacity} people</li>
                  <li><strong>Available:</strong> ${eventData.capacity - eventData.registered} spots</li>
                ` : ''}
                <li><strong>Difficulty:</strong> ${eventData.difficulty}</li>
                <li><strong>Organizer:</strong> ${eventData.organizer.name}</li>
              </ul>
            </div>
          </div>
          
          ${eventData.requirements && eventData.requirements.length > 0 ? `
            <div class="event-requirements">
              <h4 class="event-requirements-title">Requirements & What to Bring</h4>
              <ul class="event-requirements-list">
                ${eventData.requirements.map(req => `<li>${req}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
        
        ${eventData.instructor ? `
          <div class="event-content-section">
            <h3 class="event-section-title">Instructor</h3>
            <p>${eventData.instructor}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    return container;
  }

  /**
   * Create event details modal footer
   */
  createEventDetailsFooter(eventData) {
    const footer = document.createElement('div');
    footer.className = 'event-modal-footer';
    
    footer.innerHTML = `
      <div class="event-modal-actions">
        ${eventData.registrationUrl ? `
          <button class="registration-button primary" onclick="this.handleEventRegistration('${eventData.id}')">
            <span class="button-icon">🎫</span>
            <span class="button-text">Register Now</span>
          </button>
        ` : ''}
        <button class="registration-button secondary" onclick="this.addEventToCalendar('${eventData.id}')">
          <span class="button-icon">📅</span>
          <span class="button-text">Add to Calendar</span>
        </button>
        <button class="registration-button secondary" onclick="this.shareEvent('${eventData.id}')">
          <span class="button-icon">📤</span>
          <span class="button-text">Share Event</span>
        </button>
      </div>
    `;
    
    return footer;
  }

  /**
   * Handle event registration
   */
  async handleEventRegistration(event) {
    const eventData = event.detail ? event.detail.event : await this.eventAPIManager.getEventDetails(event);
    
    if (eventData.registrationUrl) {
      // Open external registration URL
      window.open(eventData.registrationUrl, '_blank', 'noopener');
    } else {
      // Show internal registration form
      this.showRegistrationForm(eventData);
    }
  }

  // ===========================================================================
  // CALENDAR INTEGRATION
  // ===========================================================================

  /**
   * Initialize event calendar
   */
  initializeCalendar() {
    this.currentCalendarDate = new Date();
    this.renderCalendar();
  }

  /**
   * Render calendar for current month
   */
  renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearElement = document.getElementById('calendar-month-year');
    
    if (!calendarGrid || !monthYearElement) return;
    
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    
    // Update month/year display
    monthYearElement.textContent = this.currentCalendarDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    
    // Clear previous calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });
    
    // Calculate calendar days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate calendar days
    for (let i = 0; i < 42; i++) { // 6 weeks
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayElement = this.createCalendarDay(currentDate, month);
      calendarGrid.appendChild(dayElement);
    }
  }

  /**
   * Create calendar day element
   */
  createCalendarDay(date, currentMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = this.isSameDay(date, new Date());
    
    if (!isCurrentMonth) {
      dayElement.classList.add('other-month');
    }
    
    if (isToday) {
      dayElement.classList.add('today');
    }
    
    // Get events for this day
    const dayEvents = this.getEventsForDate(date);
    if (dayEvents.length > 0) {
      dayElement.classList.add('has-events');
    }
    
    dayElement.innerHTML = `
      <div class="calendar-day-number">${date.getDate()}</div>
      <div class="calendar-events">
        ${dayEvents.slice(0, 3).map(event => `
          <div class="calendar-event ${event.type}" title="${event.title}">
            ${event.title}
          </div>
        `).join('')}
        ${dayEvents.length > 3 ? `
          <div class="calendar-event more">+${dayEvents.length - 3} more</div>
        ` : ''}
      </div>
    `;
    
    return dayElement;
  }

  /**
   * Navigate calendar months
   */
  navigateCalendar(direction) {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + direction);
    this.renderCalendar();
  }

  /**
   * Update calendar with new events
   */
  updateEventCalendar(events) {
    this.calendarEvents = events || [];
    if (document.getElementById('calendar-grid')) {
      this.renderCalendar();
    }
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date) {
    if (!this.calendarEvents) return [];
    
    return this.calendarEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return this.isSameDay(eventDate, date);
    });
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Format event time range
   */
  formatEventTime(eventData) {
    const startDate = new Date(eventData.startDate);
    const endDate = new Date(eventData.endDate);
    
    if (this.isSameDay(startDate, endDate)) {
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

  /**
   * Format event duration
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? 
        `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes` :
        `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Setup auto-refresh for events
   */
  setupAutoRefresh() {
    setInterval(() => {
      if (this.currentLocation && document.getElementById('events-section').style.display !== 'none') {
        console.log('🔄 Auto-refreshing events...');
        this.searchEvents(this.currentLocation);
      }
    }, this.options.autoRefreshInterval);
  }

  /**
   * Toggle events search integration
   */
  toggleEventsSearch(enabled) {
    const eventsSection = document.getElementById('events-section');
    if (eventsSection) {
      eventsSection.style.display = enabled ? 'block' : 'none';
    }
    
    if (enabled && this.currentLocation) {
      this.searchEvents(this.currentLocation);
    }
  }

  /**
   * Set current location for event searches
   */
  setLocation(location) {
    this.currentLocation = location;
    
    // Auto-search if events are enabled
    const eventsToggle = document.getElementById('include-events-toggle');
    if (eventsToggle && eventsToggle.checked) {
      this.searchEvents(location);
    }
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXEventsIntegration = ExploreXEventsIntegration;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 ExploreX Events Integration system loaded');
});