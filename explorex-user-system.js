/**
 * ExploreX User Account System
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive user account management including:
 * - User registration and authentication system
 * - User preference settings for experience types and budget
 * - Saved experiences and favorites functionality
 * - User profile management with accessibility needs
 * - Notification settings for events and recommendations
 */

// =============================================================================
// USER SYSTEM CONFIGURATION
// =============================================================================

const UserSystemConfig = {
  // Authentication settings
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    requireEmailVerification: true
  },
  
  // User preferences
  preferences: {
    experienceTypes: [
      { id: 'observatory', label: 'Observatories', icon: '🔭' },
      { id: 'planetarium', label: 'Planetariums', icon: '🌌' },
      { id: 'space_center', label: 'Space Centers', icon: '🚀' },
      { id: 'space_museum', label: 'Space Museums', icon: '🏛️' },
      { id: 'science_center', label: 'Science Centers', icon: '🔬' },
      { id: 'stargazing_site', label: 'Stargazing Sites', icon: '✨' }
    ],
    
    budgetRanges: [
      { id: 'free', label: 'Free Only', min: 0, max: 0 },
      { id: 'low', label: 'Budget ($1-25)', min: 1, max: 25 },
      { id: 'medium', label: 'Moderate ($26-75)', min: 26, max: 75 },
      { id: 'high', label: 'Premium ($76-150)', min: 76, max: 150 },
      { id: 'luxury', label: 'Luxury ($150+)', min: 150, max: Infinity }
    ],
    
    accessibilityNeeds: [
      { id: 'wheelchair', label: 'Wheelchair Accessible', icon: '♿' },
      { id: 'hearing', label: 'Hearing Impaired Support', icon: '🦻' },
      { id: 'visual', label: 'Visual Impaired Support', icon: '👁️' },
      { id: 'cognitive', label: 'Cognitive Support', icon: '🧠' },
      { id: 'mobility', label: 'Mobility Assistance', icon: '🦽' }
    ],
    
    notificationTypes: [
      { id: 'new_experiences', label: 'New Experiences', description: 'Notify about new attractions in your area' },
      { id: 'events', label: 'Events & Workshops', description: 'Astronomy events and educational workshops' },
      { id: 'weather', label: 'Weather Alerts', description: 'Optimal viewing conditions and weather updates' },
      { id: 'recommendations', label: 'Personalized Recommendations', description: 'Curated suggestions based on your interests' },
      { id: 'favorites', label: 'Favorites Updates', description: 'Updates about your saved experiences' }
    ]
  },
  
  // Storage keys
  storage: {
    userProfile: 'explorex_user_profile',
    userPreferences: 'explorex_user_preferences',
    savedExperiences: 'explorex_saved_experiences',
    searchHistory: 'explorex_search_history',
    authToken: 'explorex_auth_token'
  }
};

// =============================================================================
// USER ACCOUNT MANAGER CLASS
// =============================================================================

class UserAccountManager {
  constructor(config = {}) {
    this.config = { ...UserSystemConfig, ...config };
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authToken = null;
    this.loginAttempts = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the user account system
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('👤 Initializing ExploreX User Account System...');
      
      // Load existing session
      await this.loadExistingSession();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI components
      this.initializeUserUI();
      
      this.isInitialized = true;
      console.log('✅ User Account System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize User Account System:', error);
      throw error;
    }
  }

  /**
   * Load existing user session
   */
  async loadExistingSession() {
    try {
      const authToken = window.ExploreXUtils.StorageUtils.getItem(this.config.storage.authToken);
      
      if (authToken && this.isValidToken(authToken)) {
        this.authToken = authToken;
        
        // Load user profile
        const userProfile = window.ExploreXUtils.StorageUtils.getItem(this.config.storage.userProfile);
        if (userProfile) {
          this.currentUser = userProfile;
          this.isAuthenticated = true;
          
          console.log(`👤 Restored session for user: ${this.currentUser.email}`);
          
          // Dispatch login event
          this.dispatchUserEvent('userLoggedIn', { user: this.currentUser });
        }
      }
    } catch (error) {
      console.warn('Failed to load existing session:', error);
      this.clearSession();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for form submissions
    document.addEventListener('submit', this.handleFormSubmission.bind(this));
    
    // Listen for logout requests
    document.addEventListener('userLogout', this.handleLogout.bind(this));
    
    // Listen for preference changes
    document.addEventListener('userPreferenceChange', this.handlePreferenceChange.bind(this));
  }

  // ===========================================================================
  // AUTHENTICATION METHODS
  // ===========================================================================

  /**
   * Register a new user
   */
  async registerUser(userData) {
    try {
      console.log('📝 Registering new user:', userData.email);
      
      // Validate user data
      this.validateUserData(userData);
      
      // Check if user already exists
      if (await this.userExists(userData.email)) {
        throw new Error('User with this email already exists');
      }
      
      // Create user profile
      const userProfile = {
        id: this.generateUserId(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        dateOfBirth: userData.dateOfBirth,
        location: userData.location,
        createdAt: new Date(),
        lastLoginAt: null,
        isEmailVerified: false,
        preferences: this.getDefaultPreferences(),
        accessibility: userData.accessibility || [],
        avatar: this.generateAvatarUrl(userData.email)
      };
      
      // Hash password (in production, this would be done server-side)
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Save user (mock implementation)
      await this.saveUser(userProfile, hashedPassword);
      
      // Send verification email (mock)
      await this.sendVerificationEmail(userProfile.email);
      
      console.log('✅ User registered successfully');
      
      return {
        success: true,
        user: userProfile,
        message: 'Registration successful! Please check your email for verification.'
      };
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login user
   */
  async loginUser(email, password, rememberMe = false) {
    try {
      console.log('🔐 Attempting login for:', email);
      
      // Check login attempts
      if (this.isAccountLocked(email)) {
        throw new Error('Account temporarily locked due to too many failed attempts');
      }
      
      // Validate credentials (mock implementation)
      const user = await this.validateCredentials(email, password);
      
      if (!user) {
        this.recordFailedAttempt(email);
        throw new Error('Invalid email or password');
      }
      
      // Check email verification
      if (this.config.auth.requireEmailVerification && !user.isEmailVerified) {
        throw new Error('Please verify your email address before logging in');
      }
      
      // Clear failed attempts
      this.loginAttempts.delete(email);
      
      // Update user login time
      user.lastLoginAt = new Date();
      
      // Generate auth token
      this.authToken = this.generateAuthToken(user);
      
      // Set current user
      this.currentUser = user;
      this.isAuthenticated = true;
      
      // Save session
      this.saveSession(rememberMe);
      
      console.log('✅ Login successful');
      
      // Dispatch login event
      this.dispatchUserEvent('userLoggedIn', { user: this.currentUser });
      
      return {
        success: true,
        user: this.currentUser,
        token: this.authToken
      };
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout user
   */
  async logoutUser() {
    try {
      console.log('👋 Logging out user');
      
      // Dispatch logout event
      this.dispatchUserEvent('userLoggedOut', { user: this.currentUser });
      
      // Clear session
      this.clearSession();
      
      console.log('✅ Logout successful');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email) {
    try {
      console.log('🔄 Password reset requested for:', email);
      
      // Check if user exists
      if (!(await this.userExists(email))) {
        throw new Error('No account found with this email address');
      }
      
      // Generate reset token
      const resetToken = this.generateResetToken();
      
      // Save reset token (mock)
      await this.saveResetToken(email, resetToken);
      
      // Send reset email (mock)
      await this.sendPasswordResetEmail(email, resetToken);
      
      console.log('✅ Password reset email sent');
      
      return {
        success: true,
        message: 'Password reset instructions sent to your email'
      };
      
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===========================================================================
  // USER PREFERENCES MANAGEMENT
  // ===========================================================================

  /**
   * Get user preferences
   */
  getUserPreferences() {
    if (!this.isAuthenticated) {
      return this.getDefaultPreferences();
    }
    
    const preferences = window.ExploreXUtils.StorageUtils.getItem(this.config.storage.userPreferences);
    return preferences || this.getDefaultPreferences();
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('User must be logged in to update preferences');
      }
      
      console.log('⚙️ Updating user preferences');
      
      // Validate preferences
      this.validatePreferences(preferences);
      
      // Merge with existing preferences
      const currentPreferences = this.getUserPreferences();
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      // Save preferences
      window.ExploreXUtils.StorageUtils.setItem(this.config.storage.userPreferences, updatedPreferences);
      
      // Update user profile
      if (this.currentUser) {
        this.currentUser.preferences = updatedPreferences;
        this.saveUserProfile();
      }
      
      // Dispatch preference change event
      this.dispatchUserEvent('userPreferencesUpdated', { preferences: updatedPreferences });
      
      console.log('✅ Preferences updated successfully');
      
      return {
        success: true,
        preferences: updatedPreferences
      };
      
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get default preferences
   */
  getDefaultPreferences() {
    return {
      experienceTypes: ['observatory', 'planetarium', 'space_center'],
      budgetRange: 'medium',
      maxDistance: 50, // miles
      accessibility: [],
      notifications: {
        new_experiences: true,
        events: true,
        weather: false,
        recommendations: true,
        favorites: true
      },
      privacy: {
        shareLocation: true,
        shareActivity: false,
        publicProfile: false
      },
      display: {
        theme: 'auto', // auto, light, dark
        units: 'imperial', // imperial, metric
        language: 'en'
      }
    };
  }

  // ===========================================================================
  // SAVED EXPERIENCES MANAGEMENT
  // ===========================================================================

  /**
   * Save experience to favorites
   */
  async saveExperience(experienceId, experienceData = null) {
    try {
      console.log('💾 Saving experience to favorites:', experienceId);
      
      const savedExperiences = this.getSavedExperiences();
      
      // Check if already saved
      if (savedExperiences.some(exp => exp.id === experienceId)) {
        throw new Error('Experience already saved to favorites');
      }
      
      // Create saved experience entry
      const savedExperience = {
        id: experienceId,
        savedAt: new Date(),
        notes: '',
        tags: [],
        visited: false,
        rating: null,
        visitDate: null,
        data: experienceData // Cache experience data
      };
      
      savedExperiences.push(savedExperience);
      
      // Save to storage
      window.ExploreXUtils.StorageUtils.setItem(this.config.storage.savedExperiences, savedExperiences);
      
      // Dispatch event
      this.dispatchUserEvent('experienceSaved', { 
        experienceId, 
        savedExperience,
        totalSaved: savedExperiences.length 
      });
      
      console.log('✅ Experience saved successfully');
      
      return {
        success: true,
        savedExperience
      };
      
    } catch (error) {
      console.error('❌ Failed to save experience:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove experience from favorites
   */
  async unsaveExperience(experienceId) {
    try {
      console.log('🗑️ Removing experience from favorites:', experienceId);
      
      const savedExperiences = this.getSavedExperiences();
      const updatedExperiences = savedExperiences.filter(exp => exp.id !== experienceId);
      
      if (savedExperiences.length === updatedExperiences.length) {
        throw new Error('Experience not found in favorites');
      }
      
      // Save to storage
      window.ExploreXUtils.StorageUtils.setItem(this.config.storage.savedExperiences, updatedExperiences);
      
      // Dispatch event
      this.dispatchUserEvent('experienceUnsaved', { 
        experienceId,
        totalSaved: updatedExperiences.length 
      });
      
      console.log('✅ Experience removed successfully');
      
      return {
        success: true
      };
      
    } catch (error) {
      console.error('❌ Failed to remove experience:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get saved experiences
   */
  getSavedExperiences() {
    const saved = window.ExploreXUtils.StorageUtils.getItem(this.config.storage.savedExperiences);
    return saved || [];
  }

  /**
   * Check if experience is saved
   */
  isExperienceSaved(experienceId) {
    const savedExperiences = this.getSavedExperiences();
    return savedExperiences.some(exp => exp.id === experienceId);
  }

  /**
   * Update saved experience
   */
  async updateSavedExperience(experienceId, updates) {
    try {
      const savedExperiences = this.getSavedExperiences();
      const experienceIndex = savedExperiences.findIndex(exp => exp.id === experienceId);
      
      if (experienceIndex === -1) {
        throw new Error('Experience not found in favorites');
      }
      
      // Update experience
      savedExperiences[experienceIndex] = {
        ...savedExperiences[experienceIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      // Save to storage
      window.ExploreXUtils.StorageUtils.setItem(this.config.storage.savedExperiences, savedExperiences);
      
      // Dispatch event
      this.dispatchUserEvent('savedExperienceUpdated', { 
        experienceId,
        updates,
        savedExperience: savedExperiences[experienceIndex]
      });
      
      return {
        success: true,
        savedExperience: savedExperiences[experienceIndex]
      };
      
    } catch (error) {
      console.error('❌ Failed to update saved experience:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===========================================================================
  // USER PROFILE MANAGEMENT
  // ===========================================================================

  /**
   * Update user profile
   */
  async updateUserProfile(profileData) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('User must be logged in to update profile');
      }
      
      console.log('👤 Updating user profile');
      
      // Validate profile data
      this.validateProfileData(profileData);
      
      // Update current user
      this.currentUser = {
        ...this.currentUser,
        ...profileData,
        updatedAt: new Date()
      };
      
      // Save profile
      this.saveUserProfile();
      
      // Dispatch event
      this.dispatchUserEvent('userProfileUpdated', { user: this.currentUser });
      
      console.log('✅ Profile updated successfully');
      
      return {
        success: true,
        user: this.currentUser
      };
      
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('User must be logged in to upload avatar');
      }
      
      console.log('📸 Uploading user avatar');
      
      // Validate file
      this.validateAvatarFile(file);
      
      // Convert to base64 (mock implementation)
      const avatarUrl = await this.convertFileToBase64(file);
      
      // Update user profile
      this.currentUser.avatar = avatarUrl;
      this.currentUser.updatedAt = new Date();
      
      // Save profile
      this.saveUserProfile();
      
      // Dispatch event
      this.dispatchUserEvent('userAvatarUpdated', { 
        user: this.currentUser,
        avatarUrl 
      });
      
      console.log('✅ Avatar uploaded successfully');
      
      return {
        success: true,
        avatarUrl
      };
      
    } catch (error) {
      console.error('❌ Failed to upload avatar:', error);
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
   * Validate user data
   */
  validateUserData(userData) {
    const required = ['email', 'password', 'firstName', 'lastName'];
    
    for (const field of required) {
      if (!userData[field] || userData[field].trim() === '') {
        throw new Error(`${field} is required`);
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    // Validate password strength
    if (userData.password.length < this.config.auth.passwordMinLength) {
      throw new Error(`Password must be at least ${this.config.auth.passwordMinLength} characters long`);
    }
    
    // Validate age (must be 13+)
    if (userData.dateOfBirth) {
      const age = this.calculateAge(new Date(userData.dateOfBirth));
      if (age < 13) {
        throw new Error('Users must be at least 13 years old');
      }
    }
  }

  /**
   * Validate preferences
   */
  validatePreferences(preferences) {
    // Validate experience types
    if (preferences.experienceTypes) {
      const validTypes = this.config.preferences.experienceTypes.map(t => t.id);
      const invalidTypes = preferences.experienceTypes.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid experience types: ${invalidTypes.join(', ')}`);
      }
    }
    
    // Validate budget range
    if (preferences.budgetRange) {
      const validRanges = this.config.preferences.budgetRanges.map(r => r.id);
      if (!validRanges.includes(preferences.budgetRange)) {
        throw new Error('Invalid budget range');
      }
    }
    
    // Validate distance
    if (preferences.maxDistance && (preferences.maxDistance < 1 || preferences.maxDistance > 1000)) {
      throw new Error('Max distance must be between 1 and 1000 miles');
    }
  }

  /**
   * Validate profile data
   */
  validateProfileData(profileData) {
    // Validate email if provided
    if (profileData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        throw new Error('Invalid email format');
      }
    }
    
    // Validate names
    if (profileData.firstName && profileData.firstName.trim().length < 1) {
      throw new Error('First name cannot be empty');
    }
    
    if (profileData.lastName && profileData.lastName.trim().length < 1) {
      throw new Error('Last name cannot be empty');
    }
  }

  /**
   * Validate avatar file
   */
  validateAvatarFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      throw new Error('Avatar file must be smaller than 5MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Avatar must be a JPEG, PNG, GIF, or WebP image');
    }
  }

  /**
   * Generate user ID
   */
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate auth token
   */
  generateAuthToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.config.auth.sessionTimeout
    };
    
    // In production, this would be a proper JWT token
    return btoa(JSON.stringify(payload));
  }

  /**
   * Generate reset token
   */
  generateResetToken() {
    return Math.random().toString(36).substr(2, 32);
  }

  /**
   * Generate avatar URL
   */
  generateAvatarUrl(email) {
    // Generate a simple avatar based on email hash
    const hash = window.ExploreXUtils.StringUtils.hashCode(email);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const color = colors[Math.abs(hash) % colors.length];
    
    const initials = email.substring(0, 2).toUpperCase();
    
    // Create SVG avatar
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="${color}"/>
        <text x="50" y="60" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
              text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Hash password (mock implementation)
   */
  async hashPassword(password) {
    // In production, use proper password hashing (bcrypt, scrypt, etc.)
    return btoa(password + 'salt_' + Date.now());
  }

  /**
   * Validate credentials (mock implementation)
   */
  async validateCredentials(email, password) {
    // Mock user database lookup
    const mockUsers = window.ExploreXUtils.StorageUtils.getItem('mock_users') || [];
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) return null;
    
    // Mock password verification
    const hashedPassword = await this.hashPassword(password);
    // In production, compare with stored hash properly
    
    return user; // Simplified for demo
  }

  /**
   * Check if user exists
   */
  async userExists(email) {
    const mockUsers = window.ExploreXUtils.StorageUtils.getItem('mock_users') || [];
    return mockUsers.some(u => u.email === email);
  }

  /**
   * Save user (mock implementation)
   */
  async saveUser(userProfile, hashedPassword) {
    const mockUsers = window.ExploreXUtils.StorageUtils.getItem('mock_users') || [];
    mockUsers.push({
      ...userProfile,
      password: hashedPassword
    });
    window.ExploreXUtils.StorageUtils.setItem('mock_users', mockUsers);
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Convert file to base64
   */
  async convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if token is valid
   */
  isValidToken(token) {
    try {
      const payload = JSON.parse(atob(token));
      return payload.expiresAt > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(email) {
    const attempts = this.loginAttempts.get(email);
    if (!attempts) return false;
    
    return attempts.count >= this.config.auth.maxLoginAttempts &&
           (Date.now() - attempts.lastAttempt) < this.config.auth.lockoutDuration;
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(email) {
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);
  }

  /**
   * Save user session
   */
  saveSession(rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(this.config.storage.authToken, this.authToken);
    storage.setItem(this.config.storage.userProfile, JSON.stringify(this.currentUser));
  }

  /**
   * Save user profile
   */
  saveUserProfile() {
    window.ExploreXUtils.StorageUtils.setItem(this.config.storage.userProfile, this.currentUser);
  }

  /**
   * Clear user session
   */
  clearSession() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authToken = null;
    
    // Clear from both storages
    localStorage.removeItem(this.config.storage.authToken);
    localStorage.removeItem(this.config.storage.userProfile);
    sessionStorage.removeItem(this.config.storage.authToken);
    sessionStorage.removeItem(this.config.storage.userProfile);
  }

  /**
   * Dispatch user event
   */
  dispatchUserEvent(eventType, detail) {
    document.dispatchEvent(new CustomEvent(eventType, {
      bubbles: true,
      detail
    }));
  }

  /**
   * Handle form submission
   */
  handleFormSubmission(event) {
    const form = event.target;
    
    if (form.matches('.login-form')) {
      event.preventDefault();
      this.handleLoginForm(form);
    } else if (form.matches('.register-form')) {
      event.preventDefault();
      this.handleRegisterForm(form);
    } else if (form.matches('.preferences-form')) {
      event.preventDefault();
      this.handlePreferencesForm(form);
    }
  }

  /**
   * Handle login form
   */
  async handleLoginForm(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe') === 'on';
    
    const result = await this.loginUser(email, password, rememberMe);
    
    if (result.success) {
      // Close login modal or redirect
      this.closeAuthModal();
    } else {
      // Show error message
      this.showFormError(form, result.error);
    }
  }

  /**
   * Handle register form
   */
  async handleRegisterForm(form) {
    const formData = new FormData(form);
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      dateOfBirth: formData.get('dateOfBirth'),
      location: formData.get('location'),
      accessibility: formData.getAll('accessibility')
    };
    
    const result = await this.registerUser(userData);
    
    if (result.success) {
      // Show success message and switch to login
      this.showRegistrationSuccess(result.message);
    } else {
      // Show error message
      this.showFormError(form, result.error);
    }
  }

  /**
   * Handle preferences form
   */
  async handlePreferencesForm(form) {
    const formData = new FormData(form);
    const preferences = {
      experienceTypes: formData.getAll('experienceTypes'),
      budgetRange: formData.get('budgetRange'),
      maxDistance: parseInt(formData.get('maxDistance')),
      accessibility: formData.getAll('accessibility'),
      notifications: {
        new_experiences: formData.get('notifications.new_experiences') === 'on',
        events: formData.get('notifications.events') === 'on',
        weather: formData.get('notifications.weather') === 'on',
        recommendations: formData.get('notifications.recommendations') === 'on',
        favorites: formData.get('notifications.favorites') === 'on'
      }
    };
    
    const result = await this.updateUserPreferences(preferences);
    
    if (result.success) {
      // Show success message
      this.showPreferencesSuccess();
    } else {
      // Show error message
      this.showFormError(form, result.error);
    }
  }

  /**
   * Handle logout
   */
  async handleLogout(event) {
    await this.logoutUser();
  }

  /**
   * Handle preference change
   */
  handlePreferenceChange(event) {
    const { preference, value } = event.detail;
    
    const currentPreferences = this.getUserPreferences();
    const updatedPreferences = {
      ...currentPreferences,
      [preference]: value
    };
    
    this.updateUserPreferences(updatedPreferences);
  }

  // ===========================================================================
  // UI HELPER METHODS
  // ===========================================================================

  /**
   * Initialize user UI components
   */
  initializeUserUI() {
    // These methods would create the actual UI components
    // For now, they're placeholders
  }

  /**
   * Close authentication modal
   */
  closeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Show form error
   */
  showFormError(form, message) {
    let errorElement = form.querySelector('.form-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      form.insertBefore(errorElement, form.firstChild);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  /**
   * Show registration success
   */
  showRegistrationSuccess(message) {
    // Show success message and switch to login form
    console.log('Registration success:', message);
  }

  /**
   * Show preferences success
   */
  showPreferencesSuccess() {
    // Show success message for preferences update
    console.log('Preferences updated successfully');
  }

  /**
   * Send verification email (mock)
   */
  async sendVerificationEmail(email) {
    console.log(`📧 Verification email sent to: ${email}`);
    // Mock implementation
    return Promise.resolve();
  }

  /**
   * Send password reset email (mock)
   */
  async sendPasswordResetEmail(email, token) {
    console.log(`🔄 Password reset email sent to: ${email}`);
    // Mock implementation
    return Promise.resolve();
  }

  /**
   * Save reset token (mock)
   */
  async saveResetToken(email, token) {
    // Mock implementation
    const resetTokens = window.ExploreXUtils.StorageUtils.getItem('reset_tokens') || {};
    resetTokens[email] = {
      token,
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    };
    window.ExploreXUtils.StorageUtils.setItem('reset_tokens', resetTokens);
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXUserSystem = {
  UserAccountManager,
  UserSystemConfig
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('👤 ExploreX User Account System loaded');
});