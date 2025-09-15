/**
 * ExploreX Social Features & Review System
 * 
 * Comprehensive social platform for space enthusiasts featuring:
 * - User review and rating system with moderation
 * - Photo upload and user-generated content management
 * - Social sharing for experiences and itineraries
 * - Community features for astronomy enthusiasts
 * - Real-time notifications and activity feeds
 */

// =============================================================================
// SOCIAL SYSTEM MANAGER
// =============================================================================

class SocialSystemManager {
  constructor() {
    this.reviewManager = new ReviewManager();
    this.photoManager = new PhotoManager();
    this.socialSharingManager = new SocialSharingManager();
    this.communityManager = new CommunityManager();
    this.notificationManager = new NotificationManager();
    this.moderationEngine = new ModerationEngine();
    
    this.isInitialized = false;
    this.currentUser = null;
  }

  /**
   * Initialize social system
   */
  async initialize() {
    try {
      console.log('👥 Initializing Social System...');
      
      // Initialize all components
      await this.reviewManager.initialize();
      await this.photoManager.initialize();
      await this.socialSharingManager.initialize();
      await this.communityManager.initialize();
      await this.notificationManager.initialize();
      await this.moderationEngine.initialize();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load current user
      this.currentUser = this.getCurrentUser();
      
      this.isInitialized = true;
      console.log('✅ Social System initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Social System:', error);
      throw error;
    }
  }

  /**
   * Submit review for experience
   */
  async submitReview(experienceId, reviewData) {
    if (!this.currentUser) {
      throw new Error('User must be logged in to submit reviews');
    }

    try {
      console.log(`📝 Submitting review for experience: ${experienceId}`);
      
      // Validate review data
      this.validateReviewData(reviewData);
      
      // Check for spam and inappropriate content
      const moderationResult = await this.moderationEngine.moderateReview(reviewData);
      
      if (!moderationResult.approved) {
        throw new Error(`Review rejected: ${moderationResult.reason}`);
      }
      
      // Submit review
      const review = await this.reviewManager.submitReview(
        this.currentUser.id,
        experienceId,
        {
          ...reviewData,
          moderationScore: moderationResult.score,
          timestamp: new Date()
        }
      );
      
      // Update experience rating
      await this.updateExperienceRating(experienceId);
      
      // Send notifications
      await this.notificationManager.notifyReviewSubmitted(review);
      
      // Update user's social score
      await this.updateUserSocialScore(this.currentUser.id, 'review_submitted');
      
      console.log(`✅ Review submitted successfully: ${review.id}`);
      return review;
      
    } catch (error) {
      console.error('❌ Failed to submit review:', error);
      throw error;
    }
  }

  /**
   * Upload photo for experience
   */
  async uploadPhoto(experienceId, photoFile, metadata = {}) {
    if (!this.currentUser) {
      throw new Error('User must be logged in to upload photos');
    }

    try {
      console.log(`📸 Uploading photo for experience: ${experienceId}`);
      
      // Validate photo
      this.validatePhotoFile(photoFile);
      
      // Process and upload photo
      const photo = await this.photoManager.uploadPhoto(
        this.currentUser.id,
        experienceId,
        photoFile,
        {
          ...metadata,
          timestamp: new Date(),
          originalName: photoFile.name
        }
      );
      
      // Moderate photo content
      const moderationResult = await this.moderationEngine.moderatePhoto(photo);
      
      if (!moderationResult.approved) {
        await this.photoManager.removePhoto(photo.id);
        throw new Error(`Photo rejected: ${moderationResult.reason}`);
      }
      
      // Update photo status
      await this.photoManager.approvePhoto(photo.id, moderationResult.score);
      
      // Send notifications
      await this.notificationManager.notifyPhotoUploaded(photo);
      
      // Update user's social score
      await this.updateUserSocialScore(this.currentUser.id, 'photo_uploaded');
      
      console.log(`✅ Photo uploaded successfully: ${photo.id}`);
      return photo;
      
    } catch (error) {
      console.error('❌ Failed to upload photo:', error);
      throw error;
    }
  }

  /**
   * Share experience or itinerary
   */
  async shareContent(contentType, contentId, shareOptions = {}) {
    if (!this.currentUser) {
      throw new Error('User must be logged in to share content');
    }

    try {
      console.log(`🔗 Sharing ${contentType}: ${contentId}`);
      
      const shareResult = await this.socialSharingManager.shareContent(
        this.currentUser.id,
        contentType,
        contentId,
        shareOptions
      );
      
      // Track sharing analytics
      await this.trackSharingEvent(contentType, contentId, shareOptions.platform);
      
      // Update user's social score
      await this.updateUserSocialScore(this.currentUser.id, 'content_shared');
      
      console.log(`✅ Content shared successfully`);
      return shareResult;
      
    } catch (error) {
      console.error('❌ Failed to share content:', error);
      throw error;
    }
  }

  /**
   * Join community group
   */
  async joinCommunityGroup(groupId) {
    if (!this.currentUser) {
      throw new Error('User must be logged in to join groups');
    }

    try {
      console.log(`👥 Joining community group: ${groupId}`);
      
      const membership = await this.communityManager.joinGroup(
        this.currentUser.id,
        groupId
      );
      
      // Send welcome notification
      await this.notificationManager.notifyGroupJoined(membership);
      
      // Update user's social score
      await this.updateUserSocialScore(this.currentUser.id, 'group_joined');
      
      console.log(`✅ Successfully joined group: ${groupId}`);
      return membership;
      
    } catch (error) {
      console.error('❌ Failed to join group:', error);
      throw error;
    }
  }

  /**
   * Get user's social activity feed
   */
  async getUserActivityFeed(userId, options = {}) {
    try {
      const activities = await this.communityManager.getUserActivityFeed(userId, options);
      
      // Enrich activities with additional data
      const enrichedActivities = await Promise.all(
        activities.map(activity => this.enrichActivity(activity))
      );
      
      return enrichedActivities;
      
    } catch (error) {
      console.error('❌ Failed to get activity feed:', error);
      return [];
    }
  }

  /**
   * Get reviews for experience
   */
  async getExperienceReviews(experienceId, options = {}) {
    try {
      const reviews = await this.reviewManager.getExperienceReviews(experienceId, options);
      
      // Filter out moderated reviews
      const approvedReviews = reviews.filter(review => review.status === 'approved');
      
      // Enrich with user data
      const enrichedReviews = await Promise.all(
        approvedReviews.map(review => this.enrichReview(review))
      );
      
      return enrichedReviews;
      
    } catch (error) {
      console.error('❌ Failed to get reviews:', error);
      return [];
    }
  }

  /**
   * Get photos for experience
   */
  async getExperiencePhotos(experienceId, options = {}) {
    try {
      const photos = await this.photoManager.getExperiencePhotos(experienceId, options);
      
      // Filter approved photos only
      const approvedPhotos = photos.filter(photo => photo.status === 'approved');
      
      return approvedPhotos;
      
    } catch (error) {
      console.error('❌ Failed to get photos:', error);
      return [];
    }
  }

  /**
   * Report inappropriate content
   */
  async reportContent(contentType, contentId, reason, details = '') {
    if (!this.currentUser) {
      throw new Error('User must be logged in to report content');
    }

    try {
      console.log(`🚨 Reporting ${contentType}: ${contentId}`);
      
      const report = await this.moderationEngine.reportContent(
        this.currentUser.id,
        contentType,
        contentId,
        reason,
        details
      );
      
      // Notify moderators
      await this.notificationManager.notifyContentReported(report);
      
      console.log(`✅ Content reported successfully: ${report.id}`);
      return report;
      
    } catch (error) {
      console.error('❌ Failed to report content:', error);
      throw error;
    }
  }

  /**
   * Validate review data
   */
  validateReviewData(reviewData) {
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    if (!reviewData.title || reviewData.title.trim().length < 5) {
      throw new Error('Review title must be at least 5 characters');
    }
    
    if (!reviewData.content || reviewData.content.trim().length < 20) {
      throw new Error('Review content must be at least 20 characters');
    }
    
    if (reviewData.content.length > 2000) {
      throw new Error('Review content must be less than 2000 characters');
    }
  }

  /**
   * Validate photo file
   */
  validatePhotoFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File must be JPEG, PNG, or WebP format');
    }
  }

  /**
   * Update experience rating based on reviews
   */
  async updateExperienceRating(experienceId) {
    try {
      const reviews = await this.reviewManager.getExperienceReviews(experienceId);
      const approvedReviews = reviews.filter(r => r.status === 'approved');
      
      if (approvedReviews.length === 0) return;
      
      const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / approvedReviews.length;
      
      // Update experience in database
      await window.ExploreXDatabase.updateExperience(experienceId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: approvedReviews.length
      });
      
      console.log(`📊 Updated rating for ${experienceId}: ${averageRating.toFixed(1)}`);
      
    } catch (error) {
      console.error('❌ Failed to update experience rating:', error);
    }
  }

  /**
   * Update user's social score
   */
  async updateUserSocialScore(userId, action) {
    try {
      const scoreIncrements = {
        'review_submitted': 10,
        'photo_uploaded': 5,
        'content_shared': 3,
        'group_joined': 2,
        'helpful_vote': 1
      };
      
      const increment = scoreIncrements[action] || 0;
      
      if (increment > 0) {
        await window.ExploreXUser.updateUserScore(userId, increment);
        console.log(`⭐ Updated social score for ${userId}: +${increment}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to update social score:', error);
    }
  }

  /**
   * Enrich activity with additional data
   */
  async enrichActivity(activity) {
    try {
      // Add user information
      const user = await window.ExploreXUser.getUser(activity.userId);
      
      // Add experience information if applicable
      let experience = null;
      if (activity.experienceId) {
        experience = await window.ExploreXDatabase.getExperience(activity.experienceId);
      }
      
      return {
        ...activity,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          socialScore: user.socialScore
        } : null,
        experience: experience ? {
          id: experience.id,
          name: experience.name,
          type: experience.type
        } : null
      };
      
    } catch (error) {
      console.error('❌ Failed to enrich activity:', error);
      return activity;
    }
  }

  /**
   * Enrich review with user data
   */
  async enrichReview(review) {
    try {
      const user = await window.ExploreXUser.getUser(review.userId);
      
      return {
        ...review,
        user: user ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          reviewCount: user.reviewCount || 0,
          socialScore: user.socialScore || 0
        } : null
      };
      
    } catch (error) {
      console.error('❌ Failed to enrich review:', error);
      return review;
    }
  }

  /**
   * Track sharing event for analytics
   */
  async trackSharingEvent(contentType, contentId, platform) {
    try {
      const event = {
        type: 'content_shared',
        contentType,
        contentId,
        platform,
        userId: this.currentUser?.id,
        timestamp: new Date()
      };
      
      // Store analytics event
      await window.ExploreXAnalytics?.trackEvent(event);
      
    } catch (error) {
      console.error('❌ Failed to track sharing event:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for review submissions
    document.addEventListener('review-submitted', (event) => {
      this.handleReviewSubmitted(event.detail);
    });
    
    // Listen for photo uploads
    document.addEventListener('photo-uploaded', (event) => {
      this.handlePhotoUploaded(event.detail);
    });
    
    // Listen for content sharing
    document.addEventListener('content-shared', (event) => {
      this.handleContentShared(event.detail);
    });
  }

  /**
   * Handle review submitted event
   */
  handleReviewSubmitted(reviewData) {
    console.log('📝 Review submitted event received:', reviewData);
    // Additional processing if needed
  }

  /**
   * Handle photo uploaded event
   */
  handlePhotoUploaded(photoData) {
    console.log('📸 Photo uploaded event received:', photoData);
    // Additional processing if needed
  }

  /**
   * Handle content shared event
   */
  handleContentShared(shareData) {
    console.log('🔗 Content shared event received:', shareData);
    // Additional processing if needed
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return window.ExploreXUser?.getCurrentUser() || null;
  }
}

// =============================================================================
// REVIEW MANAGER
// =============================================================================

class ReviewManager {
  constructor() {
    this.reviews = new Map();
    this.reviewsByExperience = new Map();
    this.reviewsByUser = new Map();
  }

  async initialize() {
    console.log('📝 Initializing Review Manager...');
    await this.loadExistingReviews();
  }

  async submitReview(userId, experienceId, reviewData) {
    const reviewId = this.generateReviewId();
    
    const review = {
      id: reviewId,
      userId,
      experienceId,
      rating: reviewData.rating,
      title: reviewData.title,
      content: reviewData.content,
      photos: reviewData.photos || [],
      visitDate: reviewData.visitDate,
      tags: reviewData.tags || [],
      helpfulVotes: 0,
      status: 'pending', // pending, approved, rejected
      moderationScore: reviewData.moderationScore || 0,
      timestamp: reviewData.timestamp,
      lastModified: new Date()
    };
    
    // Store review
    this.reviews.set(reviewId, review);
    
    // Index by experience
    if (!this.reviewsByExperience.has(experienceId)) {
      this.reviewsByExperience.set(experienceId, []);
    }
    this.reviewsByExperience.get(experienceId).push(reviewId);
    
    // Index by user
    if (!this.reviewsByUser.has(userId)) {
      this.reviewsByUser.set(userId, []);
    }
    this.reviewsByUser.get(userId).push(reviewId);
    
    // Auto-approve if moderation score is high
    if (review.moderationScore > 0.8) {
      review.status = 'approved';
    }
    
    await this.saveReview(review);
    
    return review;
  }

  async getExperienceReviews(experienceId, options = {}) {
    const reviewIds = this.reviewsByExperience.get(experienceId) || [];
    const reviews = reviewIds.map(id => this.reviews.get(id)).filter(Boolean);
    
    // Apply filters
    let filteredReviews = reviews;
    
    if (options.status) {
      filteredReviews = filteredReviews.filter(r => r.status === options.status);
    }
    
    if (options.minRating) {
      filteredReviews = filteredReviews.filter(r => r.rating >= options.minRating);
    }
    
    // Sort reviews
    const sortBy = options.sortBy || 'timestamp';
    filteredReviews.sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else if (sortBy === 'helpful') {
        return b.helpfulVotes - a.helpfulVotes;
      } else {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });
    
    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    return filteredReviews.slice(offset, offset + limit);
  }

  async getUserReviews(userId, options = {}) {
    const reviewIds = this.reviewsByUser.get(userId) || [];
    const reviews = reviewIds.map(id => this.reviews.get(id)).filter(Boolean);
    
    return reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async voteHelpful(reviewId, userId) {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }
    
    // Check if user already voted
    if (review.helpfulVoters?.includes(userId)) {
      throw new Error('User already voted on this review');
    }
    
    // Add vote
    review.helpfulVotes = (review.helpfulVotes || 0) + 1;
    review.helpfulVoters = review.helpfulVoters || [];
    review.helpfulVoters.push(userId);
    
    await this.saveReview(review);
    
    return review;
  }

  async moderateReview(reviewId, action, reason = '') {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }
    
    review.status = action; // approved, rejected
    review.moderationReason = reason;
    review.moderatedAt = new Date();
    
    await this.saveReview(review);
    
    return review;
  }

  generateReviewId() {
    return 'review_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async loadExistingReviews() {
    try {
      const stored = localStorage.getItem('explorex-reviews');
      if (stored) {
        const reviewsData = JSON.parse(stored);
        
        for (const review of reviewsData) {
          this.reviews.set(review.id, review);
          
          // Rebuild indexes
          if (!this.reviewsByExperience.has(review.experienceId)) {
            this.reviewsByExperience.set(review.experienceId, []);
          }
          this.reviewsByExperience.get(review.experienceId).push(review.id);
          
          if (!this.reviewsByUser.has(review.userId)) {
            this.reviewsByUser.set(review.userId, []);
          }
          this.reviewsByUser.get(review.userId).push(review.id);
        }
      }
    } catch (error) {
      console.warn('Failed to load existing reviews:', error);
    }
  }

  async saveReview(review) {
    try {
      // Save to localStorage (in production, this would be a database)
      const allReviews = Array.from(this.reviews.values());
      localStorage.setItem('explorex-reviews', JSON.stringify(allReviews));
    } catch (error) {
      console.error('Failed to save review:', error);
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXSocial = {
  SocialSystemManager,
  ReviewManager
};

console.log('👥 ExploreX Social System loaded');