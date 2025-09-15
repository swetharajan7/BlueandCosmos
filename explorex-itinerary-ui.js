/**
 * ExploreX Itinerary UI Components
 * Space Travel Experience Recommendation System
 * 
 * This module provides user interface components for:
 * - Drag-and-drop itinerary builder interface
 * - Itinerary timeline and schedule visualization
 * - Travel time and route optimization displays
 * - Conflict detection and resolution interfaces
 * - Itinerary sharing and export modals
 */

// =============================================================================
// ITINERARY UI MANAGER CLASS
// =============================================================================

class ExploreXItineraryUI {
  constructor(itineraryManager) {
    this.itineraryManager = itineraryManager;
    this.currentView = 'list'; // list, timeline, map
    this.draggedExperience = null;
    this.isInitialized = false;
  }

  /**
   * Initialize itinerary UI components
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('📅 Initializing ExploreX Itinerary UI...');
      
      // Create itinerary interface
      this.createItineraryInterface();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup drag and drop
      this.setupDragAndDrop();
      
      // Make methods globally available
      this.makeGlobalMethods();
      
      this.isInitialized = true;
      console.log('✅ Itinerary UI initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Itinerary UI:', error);
      throw error;
    }
  }

  /**
   * Create main itinerary interface
   */
  createItineraryInterface() {
    const mainContainer = document.querySelector('main') || document.body;
    
    const itinerarySection = document.createElement('section');
    itinerarySection.id = 'itinerary-section';
    itinerarySection.className = 'itinerary-section';
    itinerarySection.style.display = 'none'; // Initially hidden
    
    itinerarySection.innerHTML = `
      <div class="itinerary-container">
        <div class="itinerary-header">
          <div class="itinerary-title-section">
            <h2 class="itinerary-title">📅 My Itineraries</h2>
            <p class="itinerary-subtitle">Plan your perfect space exploration journey</p>
          </div>
          
          <div class="itinerary-actions">
            <button class="itinerary-action-button primary" onclick="this.showCreateItineraryModal()">
              <span class="button-icon">➕</span>
              <span class="button-text">New Itinerary</span>
            </button>
            <button class="itinerary-action-button secondary" onclick="this.toggleItineraryView()">
              <span class="button-icon">👁️</span>
              <span class="button-text">View Mode</span>
            </button>
          </div>
        </div>
        
        <div class="itinerary-content">
          <!-- Itinerary list view -->
          <div class="itinerary-list-view" id="itinerary-list-view">
            <div class="itineraries-grid" id="itineraries-grid">
              <!-- Itinerary cards will be populated here -->
            </div>
            
            <div class="itineraries-empty" id="itineraries-empty">
              <div class="empty-icon">📅</div>
              <h3 class="empty-title">No Itineraries Yet</h3>
              <p class="empty-description">
                Create your first itinerary to start planning your space exploration adventure!
              </p>
              <button class="empty-action-button" onclick="this.showCreateItineraryModal()">
                <span class="button-icon">➕</span>
                <span class="button-text">Create First Itinerary</span>
              </button>
            </div>
          </div>
          
          <!-- Itinerary builder view -->
          <div class="itinerary-builder-view" id="itinerary-builder-view" style="display: none;">
            <div class="builder-header">
              <div class="builder-title-section">
                <h3 class="builder-title" id="builder-title">Itinerary Builder</h3>
                <div class="builder-meta" id="builder-meta"></div>
              </div>
              
              <div class="builder-actions">
                <button class="builder-action-button" onclick="this.optimizeCurrentItinerary()">
                  <span class="button-icon">🔧</span>
                  <span class="button-text">Optimize</span>
                </button>
                <button class="builder-action-button" onclick="this.showItineraryExport()">
                  <span class="button-icon">📤</span>
                  <span class="button-text">Export</span>
                </button>
                <button class="builder-action-button" onclick="this.closeItineraryBuilder()">
                  <span class="button-icon">✖️</span>
                  <span class="button-text">Close</span>
                </button>
              </div>
            </div>
            
            <div class="builder-content">
              <div class="builder-timeline" id="builder-timeline">
                <!-- Timeline will be populated here -->
              </div>
              
              <div class="builder-sidebar">
                <div class="conflicts-panel" id="conflicts-panel">
                  <h4 class="panel-title">⚠️ Conflicts</h4>
                  <div class="conflicts-list" id="conflicts-list">
                    <!-- Conflicts will be populated here -->
                  </div>
                </div>
                
                <div class="suggestions-panel" id="suggestions-panel">
                  <h4 class="panel-title">💡 Suggestions</h4>
                  <div class="suggestions-list" id="suggestions-list">
                    <!-- Suggestions will be populated here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    mainContainer.appendChild(itinerarySection);
  }

  /**
   * Show itinerary section
   */
  showItinerarySection() {
    const section = document.getElementById('itinerary-section');
    if (section) {
      section.style.display = 'block';
      this.refreshItineraryList();
    }
  }

  /**
   * Hide itinerary section
   */
  hideItinerarySection() {
    const section = document.getElementById('itinerary-section');
    if (section) {
      section.style.display = 'none';
    }
  } 
 /**
   * Refresh itinerary list display
   */
  refreshItineraryList() {
    const itinerariesGrid = document.getElementById('itineraries-grid');
    const emptyState = document.getElementById('itineraries-empty');
    
    if (!itinerariesGrid || !emptyState) return;
    
    const itineraries = this.itineraryManager.getAllItineraries();
    
    // Clear existing content
    itinerariesGrid.innerHTML = '';
    
    if (itineraries.length === 0) {
      emptyState.style.display = 'block';
      itinerariesGrid.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      itinerariesGrid.style.display = 'grid';
      
      // Create itinerary cards
      itineraries.forEach(itinerary => {
        const card = this.createItineraryCard(itinerary);
        itinerariesGrid.appendChild(card);
      });
    }
  }

  /**
   * Create itinerary card
   */
  createItineraryCard(itinerary) {
    const card = document.createElement('div');
    card.className = 'itinerary-card';
    card.dataset.itineraryId = itinerary.id;
    
    const duration = itinerary.getDurationInDays();
    const experienceCount = itinerary.getTotalExperiences();
    const estimatedCost = itinerary.getEstimatedCost();
    
    card.innerHTML = `
      <div class="itinerary-card-header">
        <h3 class="itinerary-card-title">${itinerary.name}</h3>
        <div class="itinerary-card-actions">
          <button class="card-action-button" onclick="this.editItinerary('${itinerary.id}')" title="Edit">
            <span class="action-icon">✏️</span>
          </button>
          <button class="card-action-button" onclick="this.duplicateItinerary('${itinerary.id}')" title="Duplicate">
            <span class="action-icon">📋</span>
          </button>
          <button class="card-action-button" onclick="this.deleteItinerary('${itinerary.id}')" title="Delete">
            <span class="action-icon">🗑️</span>
          </button>
        </div>
      </div>
      
      <div class="itinerary-card-content">
        ${itinerary.description ? `<p class="itinerary-description">${itinerary.description}</p>` : ''}
        
        <div class="itinerary-stats">
          <div class="itinerary-stat">
            <span class="stat-icon">📅</span>
            <span class="stat-value">${duration} day${duration !== 1 ? 's' : ''}</span>
          </div>
          <div class="itinerary-stat">
            <span class="stat-icon">📍</span>
            <span class="stat-value">${experienceCount} experience${experienceCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="itinerary-stat">
            <span class="stat-icon">💰</span>
            <span class="stat-value">${estimatedCost > 0 ? `$${estimatedCost.toFixed(2)}` : 'Free'}</span>
          </div>
        </div>
        
        <div class="itinerary-dates">
          <span class="date-range">
            ${itinerary.startDate.toLocaleDateString()} - ${itinerary.endDate.toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div class="itinerary-card-footer">
        <button class="itinerary-button primary" onclick="this.openItineraryBuilder('${itinerary.id}')">
          <span class="button-icon">📝</span>
          <span class="button-text">Edit Itinerary</span>
        </button>
        <button class="itinerary-button secondary" onclick="this.shareItinerary('${itinerary.id}')">
          <span class="button-icon">📤</span>
          <span class="button-text">Share</span>
        </button>
      </div>
    `;
    
    return card;
  }

  /**
   * Show create itinerary modal
   */
  showCreateItineraryModal() {
    const modal = this.createItineraryModal('create');
    document.body.appendChild(modal);
  }

  /**
   * Create itinerary modal
   */
  createItineraryModal(type, itinerary = null) {
    const modal = document.createElement('div');
    modal.className = 'itinerary-modal-overlay';
    
    const isEdit = type === 'edit' && itinerary;
    
    modal.innerHTML = `
      <div class="itinerary-modal">
        <div class="itinerary-modal-header">
          <h2 class="itinerary-modal-title">
            ${isEdit ? '✏️ Edit Itinerary' : '➕ Create New Itinerary'}
          </h2>
          <button class="itinerary-modal-close" onclick="this.closeItineraryModal()">×</button>
        </div>
        
        <div class="itinerary-modal-body">
          <form class="itinerary-form" id="itinerary-form">
            <div class="form-error" style="display: none;"></div>
            
            <div class="form-group">
              <label for="itinerary-name" class="form-label">Itinerary Name</label>
              <input type="text" id="itinerary-name" name="name" class="form-input" 
                     placeholder="My Space Adventure" 
                     value="${isEdit ? itinerary.name : ''}" required>
            </div>
            
            <div class="form-group">
              <label for="itinerary-description" class="form-label">Description (Optional)</label>
              <textarea id="itinerary-description" name="description" class="form-textarea" 
                        placeholder="Describe your planned journey..."
                        rows="3">${isEdit ? itinerary.description : ''}</textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="itinerary-start-date" class="form-label">Start Date</label>
                <input type="date" id="itinerary-start-date" name="startDate" class="form-input" 
                       value="${isEdit ? itinerary.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}" required>
              </div>
              <div class="form-group">
                <label for="itinerary-end-date" class="form-label">End Date</label>
                <input type="date" id="itinerary-end-date" name="endDate" class="form-input" 
                       value="${isEdit ? itinerary.endDate.toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}" required>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="form-button secondary" onclick="this.closeItineraryModal()">
                <span class="button-icon">❌</span>
                <span class="button-text">Cancel</span>
              </button>
              <button type="submit" class="form-button primary">
                <span class="button-icon">${isEdit ? '💾' : '➕'}</span>
                <span class="button-text">${isEdit ? 'Save Changes' : 'Create Itinerary'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Setup form submission
    const form = modal.querySelector('#itinerary-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleItineraryFormSubmission(form, type, itinerary);
    });
    
    return modal;
  }

  /**
   * Open itinerary builder
   */
  openItineraryBuilder(itineraryId) {
    const itinerary = this.itineraryManager.getItinerary(itineraryId);
    if (!itinerary) return;
    
    // Set as current itinerary
    this.itineraryManager.setCurrentItinerary(itineraryId);
    
    // Show builder view
    this.showBuilderView(itinerary);
  }

  /**
   * Show builder view
   */
  showBuilderView(itinerary) {
    const listView = document.getElementById('itinerary-list-view');
    const builderView = document.getElementById('itinerary-builder-view');
    
    if (listView) listView.style.display = 'none';
    if (builderView) builderView.style.display = 'block';
    
    // Update builder content
    this.updateBuilderContent(itinerary);
  }

  /**
   * Update builder content
   */
  updateBuilderContent(itinerary) {
    const builderTitle = document.getElementById('builder-title');
    const builderMeta = document.getElementById('builder-meta');
    const builderTimeline = document.getElementById('builder-timeline');
    
    if (builderTitle) {
      builderTitle.textContent = itinerary.name;
    }
    
    if (builderMeta) {
      builderMeta.innerHTML = `
        <span class="meta-item">
          <span class="meta-icon">📅</span>
          <span class="meta-text">${itinerary.getDurationInDays()} days</span>
        </span>
        <span class="meta-item">
          <span class="meta-icon">📍</span>
          <span class="meta-text">${itinerary.getTotalExperiences()} experiences</span>
        </span>
        <span class="meta-item">
          <span class="meta-icon">💰</span>
          <span class="meta-text">$${itinerary.getEstimatedCost().toFixed(2)}</span>
        </span>
      `;
    }
    
    if (builderTimeline) {
      this.updateTimelineDisplay(itinerary);
    }
    
    // Update conflicts and suggestions
    this.updateConflictsDisplay(itinerary);
    this.updateSuggestionsDisplay(itinerary);
  } 
 }

  /**
   * Get modal title based on type
   */
  getModalTitle(type) {
    const titles = {
      'create-itinerary': 'Create New Itinerary',
      'edit-itinerary': 'Edit Itinerary',
      'share-itinerary': 'Share Itinerary',
      'export-itinerary': 'Export Itinerary'
    };
    return titles[type] || 'Itinerary';
  }

  /**
   * Get modal content based on type
   */
  getModalContent(type) {
    switch (type) {
      case 'create-itinerary':
        return `
          <form class="itinerary-form" id="create-itinerary-form">
            <div class="form-group">
              <label for="itinerary-name">Itinerary Name</label>
              <input type="text" id="itinerary-name" name="name" required 
                     placeholder="e.g., Weekend Space Adventure">
            </div>
            
            <div class="form-group">
              <label for="itinerary-description">Description</label>
              <textarea id="itinerary-description" name="description" 
                        placeholder="Describe your space exploration journey..."></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="start-date">Start Date</label>
                <input type="date" id="start-date" name="startDate" required>
              </div>
              <div class="form-group">
                <label for="end-date">End Date</label>
                <input type="date" id="end-date" name="endDate" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="itinerary-location">Primary Location</label>
              <input type="text" id="itinerary-location" name="location" 
                     placeholder="City, State or Region">
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button" onclick="this.closeModal()">Cancel</button>
              <button type="submit" class="create-button">Create Itinerary</button>
            </div>
          </form>
        `;
        
      case 'share-itinerary':
        return `
          <div class="share-options">
            <div class="share-option">
              <button class="share-button" onclick="this.shareViaLink()">
                <span class="share-icon">🔗</span>
                <span class="share-text">Copy Link</span>
              </button>
            </div>
            <div class="share-option">
              <button class="share-button" onclick="this.shareViaEmail()">
                <span class="share-icon">📧</span>
                <span class="share-text">Email</span>
              </button>
            </div>
            <div class="share-option">
              <button class="share-button" onclick="this.shareViaSocial('facebook')">
                <span class="share-icon">📘</span>
                <span class="share-text">Facebook</span>
              </button>
            </div>
            <div class="share-option">
              <button class="share-button" onclick="this.shareViaSocial('twitter')">
                <span class="share-icon">🐦</span>
                <span class="share-text">Twitter</span>
              </button>
            </div>
          </div>
        `;
        
      case 'export-itinerary':
        return `
          <div class="export-options">
            <div class="export-option">
              <button class="export-button" onclick="this.exportToPDF()">
                <span class="export-icon">📄</span>
                <span class="export-text">PDF Document</span>
              </button>
            </div>
            <div class="export-option">
              <button class="export-button" onclick="this.exportToCalendar()">
                <span class="export-icon">📅</span>
                <span class="export-text">Calendar (ICS)</span>
              </button>
            </div>
            <div class="export-option">
              <button class="export-button" onclick="this.exportToJSON()">
                <span class="export-icon">💾</span>
                <span class="export-text">JSON File</span>
              </button>
            </div>
          </div>
        `;
        
      default:
        return '<p>Modal content not available.</p>';
    }
  }

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners(modal, type) {
    // Close modal when clicking overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    // Handle form submission for create itinerary
    if (type === 'create-itinerary') {
      const form = modal.querySelector('#create-itinerary-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateItinerary(form);
      });
    }
  }

  /**
   * Handle create itinerary form submission
   */
  async handleCreateItinerary(form) {
    try {
      const formData = new FormData(form);
      const itineraryData = {
        name: formData.get('name'),
        description: formData.get('description'),
        startDate: new Date(formData.get('startDate')),
        endDate: new Date(formData.get('endDate')),
        location: formData.get('location')
      };

      // Create itinerary using manager
      const itinerary = await this.itineraryManager.createItinerary(itineraryData);
      
      // Close modal and refresh view
      this.closeModal();
      this.refreshItineraryList();
      this.displayItinerary(itinerary);
      
      // Show success message
      this.showNotification('Itinerary created successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to create itinerary:', error);
      this.showNotification('Failed to create itinerary. Please try again.', 'error');
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.querySelector('.itinerary-modal-overlay');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // View toggle buttons
    document.querySelectorAll('.view-button').forEach(button => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        this.switchView(view);
      });
    });

    // Create itinerary button
    const createButton = document.querySelector('.create-itinerary-button');
    if (createButton) {
      createButton.addEventListener('click', () => {
        this.showCreateItineraryModal();
      });
    }
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    // Make experience cards draggable
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('experience-card')) {
        this.draggedExperience = e.target.dataset.experienceId;
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    // Handle drop zones
    document.addEventListener('dragover', (e) => {
      if (e.target.classList.contains('itinerary-day') || 
          e.target.closest('.itinerary-day')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const dayElement = e.target.closest('.itinerary-day');
      if (dayElement && this.draggedExperience) {
        this.handleExperienceDrop(dayElement, this.draggedExperience);
        this.draggedExperience = null;
      }
    });
  }

  /**
   * Handle experience drop onto itinerary day
   */
  async handleExperienceDrop(dayElement, experienceId) {
    try {
      const itineraryId = dayElement.dataset.itineraryId;
      const dayIndex = parseInt(dayElement.dataset.dayIndex);
      
      // Get experience data
      const experience = await window.ExploreXDatabase.getExperience(experienceId);
      if (!experience) {
        throw new Error('Experience not found');
      }

      // Add to itinerary
      const itinerary = this.itineraryManager.getItinerary(itineraryId);
      if (itinerary) {
        itinerary.addExperienceToDay(dayIndex, experience);
        this.refreshItineraryView(itinerary);
        this.showNotification('Experience added to itinerary!', 'success');
      }
      
    } catch (error) {
      console.error('Failed to add experience to itinerary:', error);
      this.showNotification('Failed to add experience. Please try again.', 'error');
    }
  }

  /**
   * Switch between different views
   */
  switchView(viewType) {
    this.currentView = viewType;
    
    // Update active button
    document.querySelectorAll('.view-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewType}"]`).classList.add('active');
    
    // Update view content
    this.refreshCurrentView();
  }

  /**
   * Refresh current view
   */
  refreshCurrentView() {
    const viewContainer = document.getElementById('itinerary-view');
    if (!viewContainer) return;

    switch (this.currentView) {
      case 'list':
        this.renderListView(viewContainer);
        break;
      case 'calendar':
        this.renderCalendarView(viewContainer);
        break;
      case 'timeline':
        this.renderTimelineView(viewContainer);
        break;
    }
  }

  /**
   * Render list view
   */
  renderListView(container) {
    const itineraries = this.itineraryManager.getAllItineraries();
    
    container.innerHTML = `
      <div class="itinerary-list-view">
        ${itineraries.length === 0 ? 
          '<div class="empty-state">No itineraries yet. Create your first space adventure!</div>' :
          itineraries.map(itinerary => this.renderItineraryCard(itinerary)).join('')
        }
      </div>
    `;
  }

  /**
   * Render itinerary card
   */
  renderItineraryCard(itinerary) {
    const totalExperiences = itinerary.getTotalExperiences();
    const duration = itinerary.getDuration();
    
    return `
      <div class="itinerary-card" data-itinerary-id="${itinerary.id}">
        <div class="itinerary-card-header">
          <h3 class="itinerary-name">${itinerary.name}</h3>
          <div class="itinerary-actions">
            <button class="action-button" onclick="this.editItinerary('${itinerary.id}')">
              <span class="action-icon">✏️</span>
            </button>
            <button class="action-button" onclick="this.shareItinerary('${itinerary.id}')">
              <span class="action-icon">🔗</span>
            </button>
            <button class="action-button" onclick="this.deleteItinerary('${itinerary.id}')">
              <span class="action-icon">🗑️</span>
            </button>
          </div>
        </div>
        
        <div class="itinerary-card-content">
          <p class="itinerary-description">${itinerary.description || 'No description'}</p>
          
          <div class="itinerary-stats">
            <div class="stat">
              <span class="stat-icon">📅</span>
              <span class="stat-text">${duration} days</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🎯</span>
              <span class="stat-text">${totalExperiences} experiences</span>
            </div>
            <div class="stat">
              <span class="stat-icon">📍</span>
              <span class="stat-text">${itinerary.location || 'Multiple locations'}</span>
            </div>
          </div>
          
          <div class="itinerary-preview">
            ${itinerary.days.slice(0, 3).map(day => `
              <div class="day-preview">
                <div class="day-date">${this.formatDate(day.date)}</div>
                <div class="day-experiences">${day.experiences.length} experiences</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="itinerary-card-footer">
          <button class="view-itinerary-button" onclick="this.viewItinerary('${itinerary.id}')">
            View Details
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render calendar view
   */
  renderCalendarView(container) {
    container.innerHTML = `
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="calendar-nav" onclick="this.navigateCalendar(-1)">‹</button>
          <h3 class="calendar-title" id="calendar-title">Loading...</h3>
          <button class="calendar-nav" onclick="this.navigateCalendar(1)">›</button>
        </div>
        <div class="calendar-grid" id="calendar-grid">
          <!-- Calendar will be rendered here -->
        </div>
      </div>
    `;
    
    this.renderCalendarGrid();
  }

  /**
   * Render timeline view
   */
  renderTimelineView(container) {
    const itineraries = this.itineraryManager.getAllItineraries();
    
    container.innerHTML = `
      <div class="timeline-view">
        <div class="timeline-container">
          ${itineraries.map(itinerary => this.renderItineraryTimeline(itinerary)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Show itinerary section
   */
  show() {
    const section = document.getElementById('itinerary-section');
    if (section) {
      section.style.display = 'block';
      this.refreshItineraryList();
      this.refreshCurrentView();
    }
  }

  /**
   * Hide itinerary section
   */
  hide() {
    const section = document.getElementById('itinerary-section');
    if (section) {
      section.style.display = 'none';
    }
  }

  /**
   * Refresh itinerary list
   */
  refreshItineraryList() {
    const listContainer = document.getElementById('itinerary-list');
    if (!listContainer) return;

    const itineraries = this.itineraryManager.getAllItineraries();
    
    listContainer.innerHTML = itineraries.length === 0 ? 
      '<div class="empty-itinerary-list">No itineraries yet</div>' :
      itineraries.map(itinerary => `
        <div class="itinerary-list-item ${itinerary.id === this.currentItineraryId ? 'active' : ''}" 
             data-itinerary-id="${itinerary.id}" onclick="this.selectItinerary('${itinerary.id}')">
          <div class="itinerary-item-name">${itinerary.name}</div>
          <div class="itinerary-item-dates">${this.formatDateRange(itinerary.startDate, itinerary.endDate)}</div>
        </div>
      `).join('');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  /**
   * Format date range
   */
  formatDateRange(startDate, endDate) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    return `${start} - ${end}`;
  }
}

// =============================================================================
// ITINERARY STYLES
// =============================================================================

class ItineraryStyles {
  /**
   * Inject itinerary styles
   */
  static inject() {
    if (document.getElementById('itinerary-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'itinerary-styles';
    styles.textContent = `
      /* Itinerary Section */
      .itinerary-section {
        padding: 2rem 0;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
        min-height: 100vh;
      }

      .itinerary-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      /* Header */
      .itinerary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #333;
      }

      .itinerary-title-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .itinerary-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #fff;
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
      }

      .create-itinerary-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .create-itinerary-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      }

      /* View Toggle */
      .view-toggle {
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 0.25rem;
      }

      .view-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: transparent;
        color: #ccc;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .view-button.active {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }

      /* Content Layout */
      .itinerary-content {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 2rem;
        height: calc(100vh - 200px);
      }

      .itinerary-sidebar {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 1.5rem;
        overflow-y: auto;
      }

      .itinerary-main {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 1.5rem;
        overflow-y: auto;
      }

      /* Itinerary Cards */
      .itinerary-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      }

      .itinerary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        border-color: rgba(102, 126, 234, 0.5);
      }

      .itinerary-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .itinerary-name {
        color: #fff;
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .itinerary-actions {
        display: flex;
        gap: 0.5rem;
      }

      .action-button {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 6px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .action-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      /* Modal Styles */
      .itinerary-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .itinerary-modal {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .modal-title {
        color: #fff;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .modal-close {
        background: none;
        border: none;
        color: #ccc;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
      }

      .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* Form Styles */
      .itinerary-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group label {
        color: #ccc;
        font-weight: 500;
      }

      .form-group input,
      .form-group textarea {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 0.75rem;
        color: #fff;
        font-size: 1rem;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .cancel-button {
        background: rgba(255, 255, 255, 0.1);
        color: #ccc;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .create-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .create-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      }

      /* Notification Styles */
      .notification {
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease;
      }

      .notification-success {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      }

      .notification-error {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      }

      .notification-info {
        background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .itinerary-content {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .itinerary-header {
          flex-direction: column;
          gap: 1rem;
          align-items: stretch;
        }

        .itinerary-title-section {
          justify-content: center;
        }

        .view-toggle {
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXItineraryUI = {
  ItineraryUI,
  ItineraryStyles
};

// Auto-inject styles
ItineraryStyles.inject();

console.log('🎨 ExploreX Itinerary UI loaded');