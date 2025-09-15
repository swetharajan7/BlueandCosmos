/**
 * ExploreX User Interface Components
 * Space Travel Experience Recommendation System
 * 
 * This module provides user interface components for:
 * - Authentication forms (login, register, password reset)
 * - User profile management interface
 * - Preferences and settings panels
 * - Saved experiences and favorites management
 * - User dashboard and account overview
 */

// =============================================================================
// USER UI MANAGER CLASS
// =============================================================================

class ExploreXUserUI {
  constructor(userAccountManager) {
    this.userManager = userAccountManager;
    this.currentModal = null;
    this.isInitialized = false;
  }

  /**
   * Initialize user UI components
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🎨 Initializing ExploreX User UI...');
      
      // Create user navigation
      this.createUserNavigation();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update UI based on authentication state
      this.updateAuthenticationUI();
      
      this.isInitialized = true;
      console.log('✅ User UI initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize User UI:', error);
      throw error;
    }
  }

  /**
   * Create user navigation in header
   */
  createUserNavigation() {
    const header = document.querySelector('header') || document.querySelector('.header');
    if (!header) return;
    
    // Find or create navigation container
    let nav = header.querySelector('.user-navigation');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'user-navigation';
      header.appendChild(nav);
    }
    
    nav.innerHTML = `
      <div class="user-nav-content">
        <!-- Authenticated user menu -->
        <div class="user-menu authenticated" id="user-menu-authenticated" style="display: none;">
          <div class="user-profile-summary">
            <img class="user-avatar" id="user-avatar" src="" alt="User Avatar">
            <div class="user-info">
              <div class="user-name" id="user-name"></div>
              <div class="user-status" id="user-status"></div>
            </div>
          </div>
          
          <div class="user-menu-dropdown">
            <button class="user-menu-toggle" id="user-menu-toggle">
              <span class="menu-icon">⚙️</span>
            </button>
            
            <div class="user-dropdown-menu" id="user-dropdown-menu" style="display: none;">
              <a href="#" class="dropdown-item" onclick="this.showUserProfile()">
                <span class="item-icon">👤</span>
                <span class="item-text">Profile</span>
              </a>
              <a href="#" class="dropdown-item" onclick="this.showUserPreferences()">
                <span class="item-icon">⚙️</span>
                <span class="item-text">Preferences</span>
              </a>
              <a href="#" class="dropdown-item" onclick="this.showSavedExperiences()">
                <span class="item-icon">❤️</span>
                <span class="item-text">Saved Experiences</span>
              </a>
              <a href="#" class="dropdown-item" onclick="this.showUserDashboard()">
                <span class="item-icon">📊</span>
                <span class="item-text">Dashboard</span>
              </a>
              <div class="dropdown-divider"></div>
              <a href="#" class="dropdown-item" onclick="this.handleLogout()">
                <span class="item-icon">🚪</span>
                <span class="item-text">Logout</span>
              </a>
            </div>
          </div>
        </div>
        
        <!-- Guest user menu -->
        <div class="user-menu guest" id="user-menu-guest">
          <button class="auth-button login-button" onclick="this.showLoginModal()">
            <span class="button-icon">🔐</span>
            <span class="button-text">Login</span>
          </button>
          <button class="auth-button register-button" onclick="this.showRegisterModal()">
            <span class="button-icon">📝</span>
            <span class="button-text">Sign Up</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for user authentication events
    document.addEventListener('userLoggedIn', this.handleUserLoggedIn.bind(this));
    document.addEventListener('userLoggedOut', this.handleUserLoggedOut.bind(this));
    document.addEventListener('userProfileUpdated', this.handleUserProfileUpdated.bind(this));
    
    // Listen for clicks outside dropdown to close it
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    
    // Listen for user menu toggle
    document.addEventListener('click', (e) => {
      if (e.target.matches('#user-menu-toggle')) {
        this.toggleUserDropdown();
      }
    });
  }

  // ===========================================================================
  // AUTHENTICATION MODALS
  // ===========================================================================

  /**
   * Show login modal
   */
  showLoginModal() {
    const modal = this.createAuthModal('login');
    this.currentModal = modal;
    document.body.appendChild(modal);
    
    // Focus on email input
    setTimeout(() => {
      const emailInput = modal.querySelector('#login-email');
      if (emailInput) emailInput.focus();
    }, 100);
  }

  /**
   * Show register modal
   */
  showRegisterModal() {
    const modal = this.createAuthModal('register');
    this.currentModal = modal;
    document.body.appendChild(modal);
    
    // Focus on first name input
    setTimeout(() => {
      const firstNameInput = modal.querySelector('#register-firstName');
      if (firstNameInput) firstNameInput.focus();
    }, 100);
  }

  /**
   * Show password reset modal
   */
  showPasswordResetModal() {
    const modal = this.createAuthModal('reset');
    this.currentModal = modal;
    document.body.appendChild(modal);
    
    // Focus on email input
    setTimeout(() => {
      const emailInput = modal.querySelector('#reset-email');
      if (emailInput) emailInput.focus();
    }, 100);
  }

  /**
   * Create authentication modal
   */
  createAuthModal(type) {
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h2 class="auth-modal-title">${this.getModalTitle(type)}</h2>
          <button class="auth-modal-close" onclick="this.closeAuthModal()">×</button>
        </div>
        
        <div class="auth-modal-body">
          ${this.getModalContent(type)}
        </div>
        
        <div class="auth-modal-footer">
          ${this.getModalFooter(type)}
        </div>
      </div>
    `;
    
    // Setup modal event listeners
    this.setupModalEventListeners(modal, type);
    
    return modal;
  }

  /**
   * Get modal title based on type
   */
  getModalTitle(type) {
    const titles = {
      login: '🔐 Welcome Back',
      register: '📝 Join ExploreX',
      reset: '🔄 Reset Password'
    };
    return titles[type] || 'Authentication';
  }

  /**
   * Get modal content based on type
   */
  getModalContent(type) {
    switch (type) {
      case 'login':
        return this.createLoginForm();
      case 'register':
        return this.createRegisterForm();
      case 'reset':
        return this.createPasswordResetForm();
      default:
        return '';
    }
  }

  /**
   * Get modal footer based on type
   */
  getModalFooter(type) {
    switch (type) {
      case 'login':
        return `
          <div class="auth-footer-links">
            <a href="#" onclick="this.showPasswordResetModal()" class="auth-link">Forgot Password?</a>
            <span class="auth-separator">•</span>
            <a href="#" onclick="this.showRegisterModal()" class="auth-link">Create Account</a>
          </div>
        `;
      case 'register':
        return `
          <div class="auth-footer-links">
            <span class="auth-text">Already have an account?</span>
            <a href="#" onclick="this.showLoginModal()" class="auth-link">Sign In</a>
          </div>
        `;
      case 'reset':
        return `
          <div class="auth-footer-links">
            <a href="#" onclick="this.showLoginModal()" class="auth-link">Back to Login</a>
          </div>
        `;
      default:
        return '';
    }
  }

  /**
   * Create login form
   */
  createLoginForm() {
    return `
      <form class="auth-form login-form" id="login-form">
        <div class="form-error" style="display: none;"></div>
        
        <div class="form-group">
          <label for="login-email" class="form-label">Email Address</label>
          <input type="email" id="login-email" name="email" class="form-input" 
                 placeholder="Enter your email" required>
        </div>
        
        <div class="form-group">
          <label for="login-password" class="form-label">Password</label>
          <input type="password" id="login-password" name="password" class="form-input" 
                 placeholder="Enter your password" required>
        </div>
        
        <div class="form-group form-checkbox-group">
          <label class="form-checkbox-label">
            <input type="checkbox" name="rememberMe" class="form-checkbox">
            <span class="checkbox-text">Remember me</span>
          </label>
        </div>
        
        <button type="submit" class="auth-submit-button">
          <span class="button-icon">🔐</span>
          <span class="button-text">Sign In</span>
        </button>
      </form>
    `;
  }

  /**
   * Create register form
   */
  createRegisterForm() {
    return `
      <form class="auth-form register-form" id="register-form">
        <div class="form-error" style="display: none;"></div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="register-firstName" class="form-label">First Name</label>
            <input type="text" id="register-firstName" name="firstName" class="form-input" 
                   placeholder="First name" required>
          </div>
          <div class="form-group">
            <label for="register-lastName" class="form-label">Last Name</label>
            <input type="text" id="register-lastName" name="lastName" class="form-input" 
                   placeholder="Last name" required>
          </div>
        </div>
        
        <div class="form-group">
          <label for="register-email" class="form-label">Email Address</label>
          <input type="email" id="register-email" name="email" class="form-input" 
                 placeholder="Enter your email" required>
        </div>
        
        <div class="form-group">
          <label for="register-password" class="form-label">Password</label>
          <input type="password" id="register-password" name="password" class="form-input" 
                 placeholder="Create a password" required minlength="8">
          <div class="form-help">Password must be at least 8 characters long</div>
        </div>
        
        <div class="form-group">
          <label for="register-dateOfBirth" class="form-label">Date of Birth</label>
          <input type="date" id="register-dateOfBirth" name="dateOfBirth" class="form-input" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Accessibility Needs (Optional)</label>
          <div class="checkbox-group">
            ${this.userManager.config.preferences.accessibilityNeeds.map(need => `
              <label class="form-checkbox-label">
                <input type="checkbox" name="accessibility" value="${need.id}" class="form-checkbox">
                <span class="checkbox-text">${need.icon} ${need.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group form-checkbox-group">
          <label class="form-checkbox-label">
            <input type="checkbox" name="agreeToTerms" class="form-checkbox" required>
            <span class="checkbox-text">I agree to the <a href="#" class="auth-link">Terms of Service</a> and <a href="#" class="auth-link">Privacy Policy</a></span>
          </label>
        </div>
        
        <button type="submit" class="auth-submit-button">
          <span class="button-icon">📝</span>
          <span class="button-text">Create Account</span>
        </button>
      </form>
    `;
  }

  /**
   * Create password reset form
   */
  createPasswordResetForm() {
    return `
      <form class="auth-form reset-form" id="reset-form">
        <div class="form-error" style="display: none;"></div>
        <div class="form-success" style="display: none;"></div>
        
        <div class="form-description">
          <p>Enter your email address and we'll send you instructions to reset your password.</p>
        </div>
        
        <div class="form-group">
          <label for="reset-email" class="form-label">Email Address</label>
          <input type="email" id="reset-email" name="email" class="form-input" 
                 placeholder="Enter your email" required>
        </div>
        
        <button type="submit" class="auth-submit-button">
          <span class="button-icon">📧</span>
          <span class="button-text">Send Reset Instructions</span>
        </button>
      </form>
    `;
  }

  // ===========================================================================
  // USER PROFILE AND PREFERENCES
  // ===========================================================================

  /**
   * Show user profile modal
   */
  showUserProfile() {
    if (!this.userManager.isAuthenticated) return;
    
    const modal = this.createUserModal('profile');
    this.currentModal = modal;
    document.body.appendChild(modal);
  }

  /**
   * Show user preferences modal
   */
  showUserPreferences() {
    if (!this.userManager.isAuthenticated) return;
    
    const modal = this.createUserModal('preferences');
    this.currentModal = modal;
    document.body.appendChild(modal);
  }

  /**
   * Show saved experiences modal
   */
  showSavedExperiences() {
    if (!this.userManager.isAuthenticated) return;
    
    const modal = this.createUserModal('saved');
    this.currentModal = modal;
    document.body.appendChild(modal);
  }

  /**
   * Show user dashboard modal
   */
  showUserDashboard() {
    if (!this.userManager.isAuthenticated) return;
    
    const modal = this.createUserModal('dashboard');
    this.currentModal = modal;
    document.body.appendChild(modal);
  }

  /**
   * Create user modal
   */
  createUserModal(type) {
    const modal = document.createElement('div');
    modal.className = 'user-modal-overlay';
    
    modal.innerHTML = `
      <div class="user-modal">
        <div class="user-modal-header">
          <h2 class="user-modal-title">${this.getUserModalTitle(type)}</h2>
          <button class="user-modal-close" onclick="this.closeUserModal()">×</button>
        </div>
        
        <div class="user-modal-body">
          ${this.getUserModalContent(type)}
        </div>
      </div>
    `;
    
    // Setup modal event listeners
    this.setupUserModalEventListeners(modal, type);
    
    return modal;
  }

  /**
   * Get user modal title
   */
  getUserModalTitle(type) {
    const titles = {
      profile: '👤 User Profile',
      preferences: '⚙️ Preferences & Settings',
      saved: '❤️ Saved Experiences',
      dashboard: '📊 User Dashboard'
    };
    return titles[type] || 'User Account';
  }

  /**
   * Get user modal content
   */
  getUserModalContent(type) {
    switch (type) {
      case 'profile':
        return this.createProfileContent();
      case 'preferences':
        return this.createPreferencesContent();
      case 'saved':
        return this.createSavedExperiencesContent();
      case 'dashboard':
        return this.createDashboardContent();
      default:
        return '';
    }
  }

  /**
   * Create profile content
   */
  createProfileContent() {
    const user = this.userManager.currentUser;
    if (!user) return '';
    
    return `
      <div class="profile-content">
        <div class="profile-avatar-section">
          <div class="avatar-container">
            <img class="profile-avatar" src="${user.avatar}" alt="Profile Avatar">
            <button class="avatar-upload-button" onclick="this.handleAvatarUpload()">
              <span class="upload-icon">📷</span>
            </button>
          </div>
          <input type="file" id="avatar-upload" accept="image/*" style="display: none;" onchange="this.handleAvatarChange(event)">
        </div>
        
        <form class="profile-form" id="profile-form">
          <div class="form-error" style="display: none;"></div>
          <div class="form-success" style="display: none;"></div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="profile-firstName" class="form-label">First Name</label>
              <input type="text" id="profile-firstName" name="firstName" class="form-input" 
                     value="${user.firstName}" required>
            </div>
            <div class="form-group">
              <label for="profile-lastName" class="form-label">Last Name</label>
              <input type="text" id="profile-lastName" name="lastName" class="form-input" 
                     value="${user.lastName}" required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="profile-email" class="form-label">Email Address</label>
            <input type="email" id="profile-email" name="email" class="form-input" 
                   value="${user.email}" required>
          </div>
          
          <div class="form-group">
            <label for="profile-dateOfBirth" class="form-label">Date of Birth</label>
            <input type="date" id="profile-dateOfBirth" name="dateOfBirth" class="form-input" 
                   value="${user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''}">
          </div>
          
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-label">Member Since</span>
              <span class="stat-value">${new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Last Login</span>
              <span class="stat-value">${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Saved Experiences</span>
              <span class="stat-value">${this.userManager.getSavedExperiences().length}</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="form-submit-button">
              <span class="button-icon">💾</span>
              <span class="button-text">Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Create preferences content
   */
  createPreferencesContent() {
    const preferences = this.userManager.getUserPreferences();
    
    return `
      <div class="preferences-content">
        <form class="preferences-form" id="preferences-form">
          <div class="form-error" style="display: none;"></div>
          <div class="form-success" style="display: none;"></div>
          
          <div class="preferences-section">
            <h3 class="section-title">
              <span class="title-icon">🎯</span>
              <span class="title-text">Experience Preferences</span>
            </h3>
            
            <div class="form-group">
              <label class="form-label">Preferred Experience Types</label>
              <div class="checkbox-grid">
                ${this.userManager.config.preferences.experienceTypes.map(type => `
                  <label class="form-checkbox-label">
                    <input type="checkbox" name="experienceTypes" value="${type.id}" class="form-checkbox"
                           ${preferences.experienceTypes.includes(type.id) ? 'checked' : ''}>
                    <span class="checkbox-text">${type.icon} ${type.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="form-group">
              <label for="budgetRange" class="form-label">Budget Range</label>
              <select id="budgetRange" name="budgetRange" class="form-select">
                ${this.userManager.config.preferences.budgetRanges.map(range => `
                  <option value="${range.id}" ${preferences.budgetRange === range.id ? 'selected' : ''}>
                    ${range.label}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="maxDistance" class="form-label">Maximum Distance (miles)</label>
              <input type="range" id="maxDistance" name="maxDistance" class="form-range" 
                     min="5" max="500" step="5" value="${preferences.maxDistance}">
              <div class="range-value">${preferences.maxDistance} miles</div>
            </div>
          </div>
          
          <div class="preferences-section">
            <h3 class="section-title">
              <span class="title-icon">♿</span>
              <span class="title-text">Accessibility Needs</span>
            </h3>
            
            <div class="checkbox-grid">
              ${this.userManager.config.preferences.accessibilityNeeds.map(need => `
                <label class="form-checkbox-label">
                  <input type="checkbox" name="accessibility" value="${need.id}" class="form-checkbox"
                         ${preferences.accessibility.includes(need.id) ? 'checked' : ''}>
                  <span class="checkbox-text">${need.icon} ${need.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <div class="preferences-section">
            <h3 class="section-title">
              <span class="title-icon">🔔</span>
              <span class="title-text">Notification Preferences</span>
            </h3>
            
            <div class="notification-list">
              ${this.userManager.config.preferences.notificationTypes.map(type => `
                <div class="notification-item">
                  <label class="notification-label">
                    <input type="checkbox" name="notifications.${type.id}" class="form-checkbox"
                           ${preferences.notifications[type.id] ? 'checked' : ''}>
                    <div class="notification-content">
                      <div class="notification-title">${type.label}</div>
                      <div class="notification-description">${type.description}</div>
                    </div>
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="form-submit-button">
              <span class="button-icon">💾</span>
              <span class="button-text">Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Create saved experiences content
   */
  createSavedExperiencesContent() {
    const savedExperiences = this.userManager.getSavedExperiences();
    
    if (savedExperiences.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">❤️</div>
          <h3 class="empty-title">No Saved Experiences</h3>
          <p class="empty-description">
            Start exploring and save your favorite space experiences to see them here.
          </p>
        </div>
      `;
    }
    
    return `
      <div class="saved-experiences-content">
        <div class="saved-experiences-header">
          <div class="saved-count">${savedExperiences.length} saved experience${savedExperiences.length !== 1 ? 's' : ''}</div>
          <div class="saved-actions">
            <button class="action-button" onclick="this.exportSavedExperiences()">
              <span class="button-icon">📤</span>
              <span class="button-text">Export</span>
            </button>
          </div>
        </div>
        
        <div class="saved-experiences-list">
          ${savedExperiences.map(saved => this.createSavedExperienceCard(saved)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Create saved experience card
   */
  createSavedExperienceCard(savedExperience) {
    const data = savedExperience.data;
    if (!data) return '';
    
    return `
      <div class="saved-experience-card" data-experience-id="${savedExperience.id}">
        <div class="saved-card-content">
          <div class="saved-card-header">
            <h4 class="saved-card-title">${data.name}</h4>
            <div class="saved-card-actions">
              <button class="card-action-button" onclick="this.viewExperience('${savedExperience.id}')" title="View Details">
                <span class="action-icon">👁️</span>
              </button>
              <button class="card-action-button" onclick="this.unsaveExperience('${savedExperience.id}')" title="Remove from Saved">
                <span class="action-icon">🗑️</span>
              </button>
            </div>
          </div>
          
          <div class="saved-card-details">
            <div class="saved-detail">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${window.ExploreXUtils.StringUtils.toTitleCase(data.type.replace(/_/g, ' '))}</span>
            </div>
            <div class="saved-detail">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${data.address.city}, ${data.address.state}</span>
            </div>
            <div class="saved-detail">
              <span class="detail-label">Saved:</span>
              <span class="detail-value">${new Date(savedExperience.savedAt).toLocaleDateString()}</span>
            </div>
            ${savedExperience.visited ? `
              <div class="saved-detail">
                <span class="detail-label">Visited:</span>
                <span class="detail-value">✅ ${new Date(savedExperience.visitDate).toLocaleDateString()}</span>
              </div>
            ` : ''}
          </div>
          
          ${savedExperience.notes ? `
            <div class="saved-card-notes">
              <div class="notes-label">Notes:</div>
              <div class="notes-content">${savedExperience.notes}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Create dashboard content
   */
  createDashboardContent() {
    const user = this.userManager.currentUser;
    const savedExperiences = this.userManager.getSavedExperiences();
    const preferences = this.userManager.getUserPreferences();
    
    return `
      <div class="dashboard-content">
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-icon">❤️</div>
            <div class="stat-info">
              <div class="stat-number">${savedExperiences.length}</div>
              <div class="stat-label">Saved Experiences</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-number">${savedExperiences.filter(exp => exp.visited).length}</div>
              <div class="stat-label">Visited</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
              <div class="stat-number">${preferences.experienceTypes.length}</div>
              <div class="stat-label">Preferred Types</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <div class="stat-number">${Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))}</div>
              <div class="stat-label">Days as Member</div>
            </div>
          </div>
        </div>
        
        <div class="dashboard-sections">
          <div class="dashboard-section">
            <h3 class="section-title">Recent Activity</h3>
            <div class="activity-list">
              ${this.createRecentActivityList()}
            </div>
          </div>
          
          <div class="dashboard-section">
            <h3 class="section-title">Recommendations</h3>
            <div class="recommendations-list">
              ${this.createRecommendationsList()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create recent activity list
   */
  createRecentActivityList() {
    const savedExperiences = this.userManager.getSavedExperiences();
    const recentActivity = savedExperiences
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .slice(0, 5);
    
    if (recentActivity.length === 0) {
      return '<div class="empty-activity">No recent activity</div>';
    }
    
    return recentActivity.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">❤️</div>
        <div class="activity-content">
          <div class="activity-text">Saved ${activity.data?.name || 'an experience'}</div>
          <div class="activity-time">${window.ExploreXUtils.DateUtils.timeAgo(new Date(activity.savedAt))}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Create recommendations list
   */
  createRecommendationsList() {
    // Mock recommendations based on user preferences
    const preferences = this.userManager.getUserPreferences();
    
    return `
      <div class="recommendation-item">
        <div class="recommendation-icon">🔭</div>
        <div class="recommendation-content">
          <div class="recommendation-text">Explore more ${preferences.experienceTypes[0]} experiences</div>
          <div class="recommendation-action">
            <button class="recommendation-button" onclick="this.searchByType('${preferences.experienceTypes[0]}')">
              Search Now
            </button>
          </div>
        </div>
      </div>
      
      <div class="recommendation-item">
        <div class="recommendation-icon">🌟</div>
        <div class="recommendation-content">
          <div class="recommendation-text">Complete your profile for better recommendations</div>
          <div class="recommendation-action">
            <button class="recommendation-button" onclick="this.showUserProfile()">
              Update Profile
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle user logged in
   */
  handleUserLoggedIn(event) {
    this.updateAuthenticationUI();
    this.closeAuthModal();
    
    // Show welcome message
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.success(`Welcome back, ${event.detail.user.firstName}!`);
    }
  }

  /**
   * Handle user logged out
   */
  handleUserLoggedOut(event) {
    this.updateAuthenticationUI();
    this.closeUserModal();
    
    // Show goodbye message
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.info('You have been logged out successfully');
    }
  }

  /**
   * Handle user profile updated
   */
  handleUserProfileUpdated(event) {
    this.updateUserDisplay();
    
    // Show success message
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.success('Profile updated successfully!');
    }
  }

  /**
   * Handle document click (for closing dropdowns)
   */
  handleDocumentClick(event) {
    const dropdown = document.getElementById('user-dropdown-menu');
    const toggle = document.getElementById('user-menu-toggle');
    
    if (dropdown && toggle && !toggle.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = 'none';
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    await this.userManager.logoutUser();
  }

  // ===========================================================================
  // UI UPDATE METHODS
  // ===========================================================================

  /**
   * Update authentication UI based on login state
   */
  updateAuthenticationUI() {
    const authenticatedMenu = document.getElementById('user-menu-authenticated');
    const guestMenu = document.getElementById('user-menu-guest');
    
    if (this.userManager.isAuthenticated) {
      if (authenticatedMenu) authenticatedMenu.style.display = 'flex';
      if (guestMenu) guestMenu.style.display = 'none';
      this.updateUserDisplay();
    } else {
      if (authenticatedMenu) authenticatedMenu.style.display = 'none';
      if (guestMenu) guestMenu.style.display = 'flex';
    }
  }

  /**
   * Update user display information
   */
  updateUserDisplay() {
    if (!this.userManager.isAuthenticated || !this.userManager.currentUser) return;
    
    const user = this.userManager.currentUser;
    
    // Update avatar
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.src = user.avatar;
    
    // Update name
    const userName = document.getElementById('user-name');
    if (userName) userName.textContent = `${user.firstName} ${user.lastName}`;
    
    // Update status
    const userStatus = document.getElementById('user-status');
    if (userStatus) {
      const savedCount = this.userManager.getSavedExperiences().length;
      userStatus.textContent = `${savedCount} saved experience${savedCount !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Toggle user dropdown menu
   */
  toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
      const isVisible = dropdown.style.display !== 'none';
      dropdown.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Close authentication modal
   */
  closeAuthModal() {
    if (this.currentModal && this.currentModal.classList.contains('auth-modal-overlay')) {
      document.body.removeChild(this.currentModal);
      this.currentModal = null;
    }
  }

  /**
   * Close user modal
   */
  closeUserModal() {
    if (this.currentModal && this.currentModal.classList.contains('user-modal-overlay')) {
      document.body.removeChild(this.currentModal);
      this.currentModal = null;
    }
  }

  // ===========================================================================
  // MODAL EVENT LISTENERS
  // ===========================================================================

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners(modal, type) {
    // Close modal on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeAuthModal();
      }
    });
    
    // Close modal on close button click
    const closeButton = modal.querySelector('.auth-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeAuthModal();
      });
    }
    
    // Handle form submission
    const form = modal.querySelector('.auth-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAuthFormSubmission(form, type);
      });
    }
  }

  /**
   * Setup user modal event listeners
   */
  setupUserModalEventListeners(modal, type) {
    // Close modal on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeUserModal();
      }
    });
    
    // Close modal on close button click
    const closeButton = modal.querySelector('.user-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeUserModal();
      });
    }
    
    // Handle form submission
    const form = modal.querySelector('form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUserFormSubmission(form, type);
      });
    }
    
    // Setup range input updates
    const rangeInputs = modal.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const valueDisplay = e.target.parentNode.querySelector('.range-value');
        if (valueDisplay) {
          valueDisplay.textContent = `${e.target.value} miles`;
        }
      });
    });
  }

  /**
   * Handle authentication form submission
   */
  async handleAuthFormSubmission(form, type) {
    const submitButton = form.querySelector('.auth-submit-button');
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.innerHTML = '<span class="button-icon">⏳</span><span class="button-text">Processing...</span>';
    submitButton.disabled = true;
    
    try {
      // The actual form handling is done by the UserAccountManager
      // This just provides UI feedback
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      // Restore button state
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  }

  /**
   * Handle user form submission
   */
  async handleUserFormSubmission(form, type) {
    const submitButton = form.querySelector('.form-submit-button');
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.innerHTML = '<span class="button-icon">⏳</span><span class="button-text">Saving...</span>';
    submitButton.disabled = true;
    
    try {
      // The actual form handling is done by the UserAccountManager
      // This just provides UI feedback
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      this.showFormSuccess(form, 'Changes saved successfully!');
      
    } catch (error) {
      console.error('Form submission error:', error);
      this.showFormError(form, 'Failed to save changes. Please try again.');
    } finally {
      // Restore button state
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  }

  /**
   * Show form error
   */
  showFormError(form, message) {
    let errorElement = form.querySelector('.form-error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
   * Show form success
   */
  showFormSuccess(form, message) {
    let successElement = form.querySelector('.form-success');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 3000);
    }
  }

  // ===========================================================================
  // GLOBAL METHODS (for onclick handlers)
  // ===========================================================================

  /**
   * Make methods available globally for onclick handlers
   */
  makeGlobalMethods() {
    window.showLoginModal = () => this.showLoginModal();
    window.showRegisterModal = () => this.showRegisterModal();
    window.showPasswordResetModal = () => this.showPasswordResetModal();
    window.showUserProfile = () => this.showUserProfile();
    window.showUserPreferences = () => this.showUserPreferences();
    window.showSavedExperiences = () => this.showSavedExperiences();
    window.showUserDashboard = () => this.showUserDashboard();
    window.closeAuthModal = () => this.closeAuthModal();
    window.closeUserModal = () => this.closeUserModal();
    window.handleLogout = () => this.handleLogout();
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXUserUI = ExploreXUserUI;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎨 ExploreX User UI components loaded');
});