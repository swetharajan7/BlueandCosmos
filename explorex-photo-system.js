/**
 * ExploreX Photo Management & Moderation System
 * 
 * Advanced photo handling system featuring:
 * - Photo upload with compression and optimization
 * - Automatic content moderation and spam detection
 * - Image processing and thumbnail generation
 * - User-generated content management
 * - Photo galleries and collections
 */

// =============================================================================
// PHOTO MANAGER
// =============================================================================

class PhotoManager {
  constructor() {
    this.photos = new Map();
    this.photosByExperience = new Map();
    this.photosByUser = new Map();
    this.uploadQueue = [];
    this.isProcessing = false;
    
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      thumbnailSizes: [150, 300, 600],
      compressionQuality: 0.8,
      maxDimensions: { width: 2048, height: 2048 }
    };
  }

  async initialize() {
    console.log('📸 Initializing Photo Manager...');
    await this.loadExistingPhotos();
    this.setupImageProcessing();
  }

  /**
   * Upload photo with processing
   */
  async uploadPhoto(userId, experienceId, file, metadata = {}) {
    try {
      console.log(`📤 Processing photo upload: ${file.name}`);
      
      // Validate file
      this.validateFile(file);
      
      // Generate photo ID
      const photoId = this.generatePhotoId();
      
      // Process image
      const processedImages = await this.processImage(file);
      
      // Create photo record
      const photo = {
        id: photoId,
        userId,
        experienceId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        dimensions: processedImages.dimensions,
        urls: processedImages.urls,
        thumbnails: processedImages.thumbnails,
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
          deviceInfo: this.getDeviceInfo(),
          location: metadata.location || null,
          caption: metadata.caption || '',
          tags: metadata.tags || []
        },
        status: 'pending', // pending, approved, rejected
        moderationScore: 0,
        views: 0,
        likes: 0,
        reports: 0
      };
      
      // Store photo
      this.photos.set(photoId, photo);
      
      // Index by experience
      if (!this.photosByExperience.has(experienceId)) {
        this.photosByExperience.set(experienceId, []);
      }
      this.photosByExperience.get(experienceId).push(photoId);
      
      // Index by user
      if (!this.photosByUser.has(userId)) {
        this.photosByUser.set(userId, []);
      }
      this.photosByUser.get(userId).push(photoId);
      
      await this.savePhoto(photo);
      
      console.log(`✅ Photo uploaded successfully: ${photoId}`);
      return photo;
      
    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Process image - resize, compress, generate thumbnails
   */
  async processImage(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate dimensions
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            this.config.maxDimensions
          );
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress main image
          ctx.drawImage(img, 0, 0, width, height);
          const mainImageUrl = canvas.toDataURL('image/jpeg', this.config.compressionQuality);
          
          // Generate thumbnails
          const thumbnails = {};
          for (const size of this.config.thumbnailSizes) {
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            
            const thumbDimensions = this.calculateDimensions(width, height, { width: size, height: size });
            thumbCanvas.width = thumbDimensions.width;
            thumbCanvas.height = thumbDimensions.height;
            
            thumbCtx.drawImage(img, 0, 0, thumbDimensions.width, thumbDimensions.height);
            thumbnails[size] = thumbCanvas.toDataURL('image/jpeg', 0.7);
          }
          
          resolve({
            dimensions: { width, height },
            urls: {
              original: mainImageUrl,
              compressed: mainImageUrl
            },
            thumbnails
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate optimal dimensions
   */
  calculateDimensions(originalWidth, originalHeight, maxDimensions) {
    const { width: maxWidth, height: maxHeight } = maxDimensions;
    
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    if (aspectRatio > 1) {
      // Landscape
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalWidth, maxWidth) / aspectRatio
      };
    } else {
      // Portrait or square
      return {
        width: Math.min(originalHeight, maxHeight) * aspectRatio,
        height: Math.min(originalHeight, maxHeight)
      };
    }
  }

  /**
   * Get photos for experience
   */
  async getExperiencePhotos(experienceId, options = {}) {
    const photoIds = this.photosByExperience.get(experienceId) || [];
    const photos = photoIds.map(id => this.photos.get(id)).filter(Boolean);
    
    // Filter by status
    let filteredPhotos = photos;
    if (options.status) {
      filteredPhotos = filteredPhotos.filter(p => p.status === options.status);
    } else {
      // Default to approved photos only
      filteredPhotos = filteredPhotos.filter(p => p.status === 'approved');
    }
    
    // Sort by upload date (newest first)
    filteredPhotos.sort((a, b) => 
      new Date(b.metadata.uploadedAt) - new Date(a.metadata.uploadedAt)
    );
    
    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    return filteredPhotos.slice(offset, offset + limit);
  }

  /**
   * Get photos by user
   */
  async getUserPhotos(userId, options = {}) {
    const photoIds = this.photosByUser.get(userId) || [];
    const photos = photoIds.map(id => this.photos.get(id)).filter(Boolean);
    
    return photos.sort((a, b) => 
      new Date(b.metadata.uploadedAt) - new Date(a.metadata.uploadedAt)
    );
  }

  /**
   * Like photo
   */
  async likePhoto(photoId, userId) {
    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    // Check if user already liked
    if (photo.likedBy?.includes(userId)) {
      throw new Error('Photo already liked by user');
    }
    
    // Add like
    photo.likes = (photo.likes || 0) + 1;
    photo.likedBy = photo.likedBy || [];
    photo.likedBy.push(userId);
    
    await this.savePhoto(photo);
    
    return photo;
  }

  /**
   * Report photo
   */
  async reportPhoto(photoId, userId, reason, details = '') {
    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    // Add report
    photo.reports = (photo.reports || 0) + 1;
    photo.reportedBy = photo.reportedBy || [];
    photo.reportedBy.push({
      userId,
      reason,
      details,
      timestamp: new Date()
    });
    
    // Auto-hide if too many reports
    if (photo.reports >= 5) {
      photo.status = 'under_review';
    }
    
    await this.savePhoto(photo);
    
    return photo;
  }

  /**
   * Approve photo
   */
  async approvePhoto(photoId, moderationScore = 1) {
    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    photo.status = 'approved';
    photo.moderationScore = moderationScore;
    photo.approvedAt = new Date();
    
    await this.savePhoto(photo);
    
    return photo;
  }

  /**
   * Remove photo
   */
  async removePhoto(photoId) {
    const photo = this.photos.get(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    // Remove from indexes
    const experiencePhotos = this.photosByExperience.get(photo.experienceId) || [];
    const updatedExperiencePhotos = experiencePhotos.filter(id => id !== photoId);
    this.photosByExperience.set(photo.experienceId, updatedExperiencePhotos);
    
    const userPhotos = this.photosByUser.get(photo.userId) || [];
    const updatedUserPhotos = userPhotos.filter(id => id !== photoId);
    this.photosByUser.set(photo.userId, updatedUserPhotos);
    
    // Remove photo
    this.photos.delete(photoId);
    
    await this.savePhotos();
    
    console.log(`🗑️ Photo removed: ${photoId}`);
  }

  /**
   * Validate file
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds ${this.config.maxFileSize / (1024 * 1024)}MB limit`);
    }
    
    if (!this.config.allowedTypes.includes(file.type)) {
      throw new Error('File type not supported. Use JPEG, PNG, or WebP');
    }
  }

  /**
   * Generate photo ID
   */
  generatePhotoId() {
    return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get device info
   */
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date()
    };
  }

  /**
   * Setup image processing
   */
  setupImageProcessing() {
    // Setup canvas and WebGL if available for better performance
    this.canvasSupported = !!document.createElement('canvas').getContext;
    this.webglSupported = !!document.createElement('canvas').getContext('webgl');
    
    console.log(`🎨 Image processing setup: Canvas=${this.canvasSupported}, WebGL=${this.webglSupported}`);
  }

  /**
   * Load existing photos
   */
  async loadExistingPhotos() {
    try {
      const stored = localStorage.getItem('explorex-photos');
      if (stored) {
        const photosData = JSON.parse(stored);
        
        for (const photo of photosData) {
          this.photos.set(photo.id, photo);
          
          // Rebuild indexes
          if (!this.photosByExperience.has(photo.experienceId)) {
            this.photosByExperience.set(photo.experienceId, []);
          }
          this.photosByExperience.get(photo.experienceId).push(photo.id);
          
          if (!this.photosByUser.has(photo.userId)) {
            this.photosByUser.set(photo.userId, []);
          }
          this.photosByUser.get(photo.userId).push(photo.id);
        }
        
        console.log(`📸 Loaded ${photosData.length} existing photos`);
      }
    } catch (error) {
      console.warn('Failed to load existing photos:', error);
    }
  }

  /**
   * Save photo
   */
  async savePhoto(photo) {
    try {
      await this.savePhotos();
    } catch (error) {
      console.error('Failed to save photo:', error);
    }
  }

  /**
   * Save all photos
   */
  async savePhotos() {
    try {
      const allPhotos = Array.from(this.photos.values());
      localStorage.setItem('explorex-photos', JSON.stringify(allPhotos));
    } catch (error) {
      console.error('Failed to save photos:', error);
    }
  }
}

// =============================================================================
// MODERATION ENGINE
// =============================================================================

class ModerationEngine {
  constructor() {
    this.moderationRules = new Map();
    this.bannedWords = new Set();
    this.suspiciousPatterns = [];
    this.userReputationScores = new Map();
  }

  async initialize() {
    console.log('🛡️ Initializing Moderation Engine...');
    await this.loadModerationRules();
    await this.loadBannedWords();
    this.setupPatternDetection();
  }

  /**
   * Moderate review content
   */
  async moderateReview(reviewData) {
    try {
      let score = 1.0; // Start with perfect score
      const issues = [];
      
      // Check for banned words
      const bannedWordCheck = this.checkBannedWords(reviewData.content + ' ' + reviewData.title);
      if (bannedWordCheck.found) {
        score -= 0.5;
        issues.push(`Contains inappropriate language: ${bannedWordCheck.words.join(', ')}`);
      }
      
      // Check for spam patterns
      const spamCheck = this.checkSpamPatterns(reviewData.content);
      if (spamCheck.isSpam) {
        score -= 0.4;
        issues.push(`Spam detected: ${spamCheck.reason}`);
      }
      
      // Check user reputation
      const userReputation = this.getUserReputation(reviewData.userId);
      if (userReputation < 0.5) {
        score -= 0.2;
        issues.push('Low user reputation');
      }
      
      // Check content quality
      const qualityCheck = this.checkContentQuality(reviewData.content);
      if (qualityCheck.score < 0.6) {
        score -= 0.3;
        issues.push(`Low content quality: ${qualityCheck.reason}`);
      }
      
      // Determine approval
      const approved = score >= 0.6;
      
      return {
        approved,
        score: Math.max(0, score),
        issues,
        reason: approved ? 'Content approved' : `Content rejected: ${issues.join(', ')}`
      };
      
    } catch (error) {
      console.error('❌ Review moderation failed:', error);
      return {
        approved: false,
        score: 0,
        issues: ['Moderation system error'],
        reason: 'System error during moderation'
      };
    }
  }

  /**
   * Moderate photo content
   */
  async moderatePhoto(photo) {
    try {
      let score = 1.0;
      const issues = [];
      
      // Check file properties
      if (photo.fileSize > 8 * 1024 * 1024) { // 8MB
        score -= 0.1;
        issues.push('Large file size');
      }
      
      // Check user reputation
      const userReputation = this.getUserReputation(photo.userId);
      if (userReputation < 0.5) {
        score -= 0.2;
        issues.push('Low user reputation');
      }
      
      // Check metadata for suspicious patterns
      if (photo.metadata.caption) {
        const captionCheck = this.checkBannedWords(photo.metadata.caption);
        if (captionCheck.found) {
          score -= 0.3;
          issues.push('Inappropriate caption');
        }
      }
      
      // Simple image analysis (in production, would use AI services)
      const imageAnalysis = await this.analyzeImage(photo);
      if (imageAnalysis.inappropriate) {
        score -= 0.6;
        issues.push('Inappropriate image content detected');
      }
      
      const approved = score >= 0.7;
      
      return {
        approved,
        score: Math.max(0, score),
        issues,
        reason: approved ? 'Photo approved' : `Photo rejected: ${issues.join(', ')}`
      };
      
    } catch (error) {
      console.error('❌ Photo moderation failed:', error);
      return {
        approved: false,
        score: 0,
        issues: ['Moderation system error'],
        reason: 'System error during moderation'
      };
    }
  }

  /**
   * Report content
   */
  async reportContent(reporterId, contentType, contentId, reason, details) {
    const reportId = this.generateReportId();
    
    const report = {
      id: reportId,
      reporterId,
      contentType,
      contentId,
      reason,
      details,
      timestamp: new Date(),
      status: 'pending', // pending, reviewed, resolved
      priority: this.calculateReportPriority(reason)
    };
    
    // Store report
    await this.saveReport(report);
    
    // Update user reputation if multiple reports
    await this.updateUserReputationFromReports(contentId);
    
    return report;
  }

  /**
   * Check for banned words
   */
  checkBannedWords(text) {
    const words = text.toLowerCase().split(/\s+/);
    const foundWords = words.filter(word => this.bannedWords.has(word));
    
    return {
      found: foundWords.length > 0,
      words: foundWords
    };
  }

  /**
   * Check for spam patterns
   */
  checkSpamPatterns(text) {
    // Check for excessive repetition
    const words = text.split(/\s+/);
    const wordCounts = new Map();
    
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    // Check if any word appears more than 30% of the time
    const totalWords = words.length;
    for (const [word, count] of wordCounts) {
      if (count / totalWords > 0.3 && totalWords > 10) {
        return {
          isSpam: true,
          reason: `Excessive repetition of word: ${word}`
        };
      }
    }
    
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(text)) {
        return {
          isSpam: true,
          reason: 'Matches suspicious pattern'
        };
      }
    }
    
    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      return {
        isSpam: true,
        reason: 'Excessive capitalization'
      };
    }
    
    return { isSpam: false };
  }

  /**
   * Check content quality
   */
  checkContentQuality(text) {
    let score = 1.0;
    const issues = [];
    
    // Check length
    if (text.length < 20) {
      score -= 0.3;
      issues.push('Too short');
    }
    
    // Check for meaningful content
    const meaningfulWords = text.split(/\s+/).filter(word => 
      word.length > 3 && !/^\d+$/.test(word)
    );
    
    if (meaningfulWords.length < 5) {
      score -= 0.4;
      issues.push('Lacks meaningful content');
    }
    
    // Check for proper sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2 && text.length > 50) {
      score -= 0.2;
      issues.push('Poor sentence structure');
    }
    
    return {
      score: Math.max(0, score),
      reason: issues.join(', ') || 'Good quality'
    };
  }

  /**
   * Get user reputation score
   */
  getUserReputation(userId) {
    return this.userReputationScores.get(userId) || 0.8; // Default good reputation
  }

  /**
   * Simple image analysis (placeholder for AI services)
   */
  async analyzeImage(photo) {
    // In production, this would use services like Google Vision API,
    // AWS Rekognition, or Azure Computer Vision
    
    // For now, return safe result
    return {
      inappropriate: false,
      confidence: 0.95,
      categories: ['space', 'astronomy', 'educational']
    };
  }

  /**
   * Calculate report priority
   */
  calculateReportPriority(reason) {
    const highPriorityReasons = ['harassment', 'hate_speech', 'violence', 'illegal_content'];
    const mediumPriorityReasons = ['spam', 'inappropriate_content', 'copyright'];
    
    if (highPriorityReasons.includes(reason)) return 'high';
    if (mediumPriorityReasons.includes(reason)) return 'medium';
    return 'low';
  }

  /**
   * Update user reputation from reports
   */
  async updateUserReputationFromReports(contentId) {
    // This would analyze report patterns and update user reputation
    // For now, just log the action
    console.log(`📊 Updating user reputation based on reports for content: ${contentId}`);
  }

  /**
   * Load moderation rules
   */
  async loadModerationRules() {
    // Load rules from configuration
    this.moderationRules.set('min_review_length', 20);
    this.moderationRules.set('max_review_length', 2000);
    this.moderationRules.set('min_user_reputation', 0.5);
    this.moderationRules.set('auto_approve_threshold', 0.8);
  }

  /**
   * Load banned words
   */
  async loadBannedWords() {
    // In production, this would load from a comprehensive database
    const bannedWordsList = [
      'spam', 'fake', 'scam', 'bot', 'advertisement',
      // Add more as needed
    ];
    
    for (const word of bannedWordsList) {
      this.bannedWords.add(word.toLowerCase());
    }
  }

  /**
   * Setup pattern detection
   */
  setupPatternDetection() {
    this.suspiciousPatterns = [
      /(.)\1{4,}/g, // Repeated characters
      /https?:\/\/[^\s]+/g, // URLs (might be spam)
      /\b\d{10,}\b/g, // Long numbers (phone numbers, etc.)
      /[A-Z]{5,}/g // Long sequences of capitals
    ];
  }

  /**
   * Generate report ID
   */
  generateReportId() {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save report
   */
  async saveReport(report) {
    try {
      const reports = JSON.parse(localStorage.getItem('explorex-reports') || '[]');
      reports.push(report);
      localStorage.setItem('explorex-reports', JSON.stringify(reports));
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXPhoto = {
  PhotoManager,
  ModerationEngine
};

console.log('📸 ExploreX Photo System loaded');