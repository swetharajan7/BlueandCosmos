/**
 * ExploreX Community & Social Sharing System
 * 
 * Advanced community features for space enthusiasts:
 * - Community groups and forums for astronomy discussions
 * - Social sharing across multiple platforms
 * - Activity feeds and user interactions
 * - Event organization and meetups
 * - Real-time notifications and messaging
 */

// =============================================================================
// COMMUNITY MANAGER
// =============================================================================

class CommunityManager {
  constructor() {
    this.groups = new Map();
    this.memberships = new Map();
    this.activities = [];
    this.forums = new Map();
    this.events = new Map();
    
    this.activityTypes = {
      'review_posted': { icon: '⭐', points: 10 },
      'photo_uploaded': { icon: '📸', points: 5 },
      'group_joined': { icon: '👥', points: 2 },
      'event_created': { icon: '📅', points: 15 },
      'comment_posted': { icon: '💬', points: 3 },
      'experience_shared': { icon: '🔗', points: 5 }
    };
  }

  async initialize() {
    console.log('👥 Initializing Community Manager...');
    await this.loadCommunityData();
    await this.createDefaultGroups();
  }

  /**
   * Create community group
   */
  async createGroup(creatorId, groupData) {
    try {
      const groupId = this.generateGroupId();
      
      const group = {
        id: groupId,
        name: groupData.name,
        description: groupData.description,
        category: groupData.category || 'general',
        privacy: groupData.privacy || 'public', // public, private, invite-only
        creatorId,
        moderators: [creatorId],
        memberCount: 1,
        createdAt: new Date(),
        avatar: groupData.avatar || null,
        banner: groupData.banner || null,
        rules: groupData.rules || [],
        tags: groupData.tags || [],
        location: groupData.location || null,
        isActive: true
      };
      
      // Store group
      this.groups.set(groupId, group);
      
      // Add creator as first member
      await this.joinGroup(creatorId, groupId);
      
      // Log activity
      await this.logActivity(creatorId, 'group_created', {
        groupId,
        groupName: group.name
      });
      
      await this.saveGroups();
      
      console.log(`✅ Group created: ${group.name} (${groupId})`);
      return group;
      
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Join community group
   */
  async joinGroup(userId, groupId) {
    try {
      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Check if already a member
      const userMemberships = this.memberships.get(userId) || [];
      if (userMemberships.some(m => m.groupId === groupId)) {
        throw new Error('User already a member of this group');
      }
      
      // Check privacy settings
      if (group.privacy === 'private' || group.privacy === 'invite-only') {
        // In production, this would check for invitations
        console.log('⚠️ Group requires invitation or approval');
      }
      
      const membership = {
        userId,
        groupId,
        role: 'member', // member, moderator, admin
        joinedAt: new Date(),
        isActive: true,
        notifications: true
      };
      
      // Add membership
      if (!this.memberships.has(userId)) {
        this.memberships.set(userId, []);
      }
      this.memberships.get(userId).push(membership);
      
      // Update group member count
      group.memberCount++;
      
      // Log activity
      await this.logActivity(userId, 'group_joined', {
        groupId,
        groupName: group.name
      });
      
      await this.saveGroups();
      await this.saveMemberships();
      
      console.log(`✅ User ${userId} joined group: ${group.name}`);
      return membership;
      
    } catch (error) {
      console.error('❌ Failed to join group:', error);
      throw error;
    }
  }

  /**
   * Leave community group
   */
  async leaveGroup(userId, groupId) {
    try {
      const userMemberships = this.memberships.get(userId) || [];
      const membershipIndex = userMemberships.findIndex(m => m.groupId === groupId);
      
      if (membershipIndex === -1) {
        throw new Error('User is not a member of this group');
      }
      
      // Remove membership
      userMemberships.splice(membershipIndex, 1);
      
      // Update group member count
      const group = this.groups.get(groupId);
      if (group) {
        group.memberCount--;
      }
      
      await this.saveGroups();
      await this.saveMemberships();
      
      console.log(`✅ User ${userId} left group: ${groupId}`);
      
    } catch (error) {
      console.error('❌ Failed to leave group:', error);
      throw error;
    }
  }

  /**
   * Get user's groups
   */
  getUserGroups(userId) {
    const userMemberships = this.memberships.get(userId) || [];
    return userMemberships
      .filter(m => m.isActive)
      .map(m => ({
        ...this.groups.get(m.groupId),
        membership: m
      }))
      .filter(g => g.id); // Filter out deleted groups
  }

  /**
   * Get group members
   */
  getGroupMembers(groupId, options = {}) {
    const members = [];
    
    for (const [userId, memberships] of this.memberships) {
      const membership = memberships.find(m => m.groupId === groupId && m.isActive);
      if (membership) {
        members.push({
          userId,
          ...membership
        });
      }
    }
    
    // Sort by join date
    members.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
    
    return members;
  }

  /**
   * Create forum post
   */
  async createForumPost(userId, groupId, postData) {
    try {
      const postId = this.generatePostId();
      
      const post = {
        id: postId,
        userId,
        groupId,
        title: postData.title,
        content: postData.content,
        category: postData.category || 'general',
        tags: postData.tags || [],
        attachments: postData.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        replies: 0,
        isPinned: false,
        isLocked: false,
        status: 'active'
      };
      
      // Store post
      if (!this.forums.has(groupId)) {
        this.forums.set(groupId, []);
      }
      this.forums.get(groupId).push(post);
      
      // Log activity
      await this.logActivity(userId, 'forum_post_created', {
        postId,
        groupId,
        title: post.title
      });
      
      await this.saveForums();
      
      console.log(`✅ Forum post created: ${post.title}`);
      return post;
      
    } catch (error) {
      console.error('❌ Failed to create forum post:', error);
      throw error;
    }
  }

  /**
   * Create community event
   */
  async createEvent(userId, eventData) {
    try {
      const eventId = this.generateEventId();
      
      const event = {
        id: eventId,
        organizerId: userId,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category || 'stargazing',
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        location: eventData.location,
        venue: eventData.venue || null,
        maxAttendees: eventData.maxAttendees || null,
        attendees: [],
        waitlist: [],
        tags: eventData.tags || [],
        requirements: eventData.requirements || [],
        equipment: eventData.equipment || [],
        difficulty: eventData.difficulty || 'beginner',
        cost: eventData.cost || 0,
        isPublic: eventData.isPublic !== false,
        createdAt: new Date(),
        status: 'upcoming' // upcoming, ongoing, completed, cancelled
      };
      
      // Store event
      this.events.set(eventId, event);
      
      // Log activity
      await this.logActivity(userId, 'event_created', {
        eventId,
        title: event.title,
        startDate: event.startDate
      });
      
      await this.saveEvents();
      
      console.log(`✅ Event created: ${event.title}`);
      return event;
      
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Join event
   */
  async joinEvent(userId, eventId) {
    try {
      const event = this.events.get(eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      // Check if already attending
      if (event.attendees.includes(userId)) {
        throw new Error('User already attending this event');
      }
      
      // Check capacity
      if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
        // Add to waitlist
        if (!event.waitlist.includes(userId)) {
          event.waitlist.push(userId);
          console.log(`📋 User ${userId} added to waitlist for event: ${event.title}`);
        }
        return { status: 'waitlisted' };
      }
      
      // Add attendee
      event.attendees.push(userId);
      
      // Log activity
      await this.logActivity(userId, 'event_joined', {
        eventId,
        title: event.title
      });
      
      await this.saveEvents();
      
      console.log(`✅ User ${userId} joined event: ${event.title}`);
      return { status: 'confirmed' };
      
    } catch (error) {
      console.error('❌ Failed to join event:', error);
      throw error;
    }
  }

  /**
   * Get user activity feed
   */
  async getUserActivityFeed(userId, options = {}) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Get user's groups
    const userGroups = this.getUserGroups(userId);
    const groupIds = userGroups.map(g => g.id);
    
    // Filter activities
    let relevantActivities = this.activities.filter(activity => {
      // Include user's own activities
      if (activity.userId === userId) return true;
      
      // Include activities from user's groups
      if (activity.data?.groupId && groupIds.includes(activity.data.groupId)) return true;
      
      // Include public activities
      if (activity.isPublic) return true;
      
      return false;
    });
    
    // Sort by timestamp (newest first)
    relevantActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    return relevantActivities.slice(offset, offset + limit);
  }

  /**
   * Log user activity
   */
  async logActivity(userId, activityType, data = {}) {
    const activity = {
      id: this.generateActivityId(),
      userId,
      type: activityType,
      data,
      timestamp: new Date(),
      isPublic: data.isPublic !== false
    };
    
    this.activities.push(activity);
    
    // Keep only recent activities (last 1000)
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }
    
    await this.saveActivities();
  }

  /**
   * Get popular groups
   */
  getPopularGroups(limit = 10) {
    return Array.from(this.groups.values())
      .filter(group => group.isActive)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, limit);
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(limit = 10) {
    const now = new Date();
    
    return Array.from(this.events.values())
      .filter(event => event.startDate > now && event.status === 'upcoming')
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, limit);
  }

  /**
   * Search groups
   */
  searchGroups(query, options = {}) {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.groups.values())
      .filter(group => {
        if (!group.isActive) return false;
        
        // Search in name and description
        const nameMatch = group.name.toLowerCase().includes(searchTerm);
        const descMatch = group.description.toLowerCase().includes(searchTerm);
        const tagMatch = group.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        return nameMatch || descMatch || tagMatch;
      })
      .sort((a, b) => b.memberCount - a.memberCount);
  }

  /**
   * Create default groups
   */
  async createDefaultGroups() {
    const defaultGroups = [
      {
        name: 'Stargazing Enthusiasts',
        description: 'Share your stargazing experiences and discover the best viewing spots',
        category: 'stargazing',
        tags: ['stargazing', 'astronomy', 'telescopes']
      },
      {
        name: 'Space Photography',
        description: 'Showcase your astrophotography and learn new techniques',
        category: 'photography',
        tags: ['astrophotography', 'photography', 'space']
      },
      {
        name: 'Observatory Visitors',
        description: 'Connect with fellow observatory visitors and share recommendations',
        category: 'observatories',
        tags: ['observatories', 'planetariums', 'museums']
      },
      {
        name: 'Space News & Discoveries',
        description: 'Discuss the latest space news and scientific discoveries',
        category: 'news',
        tags: ['space-news', 'discoveries', 'science']
      }
    ];
    
    for (const groupData of defaultGroups) {
      if (!Array.from(this.groups.values()).some(g => g.name === groupData.name)) {
        await this.createGroup('system', groupData);
      }
    }
  }

  /**
   * Generate IDs
   */
  generateGroupId() {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generatePostId() {
    return 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateActivityId() {
    return 'activity_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Storage methods
   */
  async loadCommunityData() {
    try {
      // Load groups
      const groupsData = localStorage.getItem('explorex-groups');
      if (groupsData) {
        const groups = JSON.parse(groupsData);
        for (const group of groups) {
          this.groups.set(group.id, group);
        }
      }
      
      // Load memberships
      const membershipsData = localStorage.getItem('explorex-memberships');
      if (membershipsData) {
        const memberships = JSON.parse(membershipsData);
        for (const [userId, userMemberships] of Object.entries(memberships)) {
          this.memberships.set(userId, userMemberships);
        }
      }
      
      // Load activities
      const activitiesData = localStorage.getItem('explorex-activities');
      if (activitiesData) {
        this.activities = JSON.parse(activitiesData);
      }
      
      // Load events
      const eventsData = localStorage.getItem('explorex-events');
      if (eventsData) {
        const events = JSON.parse(eventsData);
        for (const event of events) {
          this.events.set(event.id, event);
        }
      }
      
      console.log(`👥 Loaded community data: ${this.groups.size} groups, ${this.activities.length} activities`);
      
    } catch (error) {
      console.warn('Failed to load community data:', error);
    }
  }

  async saveGroups() {
    try {
      const groups = Array.from(this.groups.values());
      localStorage.setItem('explorex-groups', JSON.stringify(groups));
    } catch (error) {
      console.error('Failed to save groups:', error);
    }
  }

  async saveMemberships() {
    try {
      const memberships = Object.fromEntries(this.memberships);
      localStorage.setItem('explorex-memberships', JSON.stringify(memberships));
    } catch (error) {
      console.error('Failed to save memberships:', error);
    }
  }

  async saveActivities() {
    try {
      localStorage.setItem('explorex-activities', JSON.stringify(this.activities));
    } catch (error) {
      console.error('Failed to save activities:', error);
    }
  }

  async saveEvents() {
    try {
      const events = Array.from(this.events.values());
      localStorage.setItem('explorex-events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to save events:', error);
    }
  }

  async saveForums() {
    try {
      const forums = Object.fromEntries(this.forums);
      localStorage.setItem('explorex-forums', JSON.stringify(forums));
    } catch (error) {
      console.error('Failed to save forums:', error);
    }
  }
}

// =============================================================================
// SOCIAL SHARING MANAGER
// =============================================================================

class SocialSharingManager {
  constructor() {
    this.shareHistory = [];
    this.platforms = {
      facebook: {
        name: 'Facebook',
        icon: '📘',
        baseUrl: 'https://www.facebook.com/sharer/sharer.php',
        params: ['u', 'quote']
      },
      twitter: {
        name: 'Twitter',
        icon: '🐦',
        baseUrl: 'https://twitter.com/intent/tweet',
        params: ['url', 'text', 'hashtags']
      },
      linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        baseUrl: 'https://www.linkedin.com/sharing/share-offsite/',
        params: ['url']
      },
      reddit: {
        name: 'Reddit',
        icon: '🔴',
        baseUrl: 'https://reddit.com/submit',
        params: ['url', 'title']
      },
      email: {
        name: 'Email',
        icon: '📧',
        baseUrl: 'mailto:',
        params: ['subject', 'body']
      }
    };
  }

  async initialize() {
    console.log('🔗 Initializing Social Sharing Manager...');
    await this.loadShareHistory();
  }

  /**
   * Share content to social platform
   */
  async shareContent(userId, contentType, contentId, options = {}) {
    try {
      const content = await this.getContentForSharing(contentType, contentId);
      const platform = options.platform || 'link';
      
      let shareResult;
      
      if (platform === 'link') {
        shareResult = await this.generateShareLink(content, options);
      } else if (this.platforms[platform]) {
        shareResult = await this.shareToSocialPlatform(platform, content, options);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Log share event
      await this.logShareEvent(userId, contentType, contentId, platform, shareResult);
      
      return shareResult;
      
    } catch (error) {
      console.error('❌ Failed to share content:', error);
      throw error;
    }
  }

  /**
   * Generate shareable link
   */
  async generateShareLink(content, options = {}) {
    const shareId = this.generateShareId();
    const baseUrl = window.location.origin;
    
    const shareData = {
      id: shareId,
      content,
      createdAt: new Date(),
      expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      accessCount: 0,
      isPublic: options.isPublic !== false
    };
    
    // Store share data
    await this.storeShareData(shareData);
    
    const shareUrl = `${baseUrl}/share/${shareId}`;
    
    return {
      shareId,
      url: shareUrl,
      qrCode: await this.generateQRCode(shareUrl),
      shortUrl: await this.generateShortUrl(shareUrl)
    };
  }

  /**
   * Share to social platform
   */
  async shareToSocialPlatform(platform, content, options = {}) {
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      throw new Error(`Platform ${platform} not supported`);
    }
    
    const shareUrl = await this.generateShareLink(content);
    const params = new URLSearchParams();
    
    // Build platform-specific parameters
    switch (platform) {
      case 'facebook':
        params.set('u', shareUrl.url);
        params.set('quote', content.description || content.title);
        break;
        
      case 'twitter':
        params.set('url', shareUrl.url);
        params.set('text', `${content.title} - Discover amazing space experiences!`);
        params.set('hashtags', 'ExploreX,Space,Astronomy');
        break;
        
      case 'linkedin':
        params.set('url', shareUrl.url);
        break;
        
      case 'reddit':
        params.set('url', shareUrl.url);
        params.set('title', content.title);
        break;
        
      case 'email':
        const subject = `Check out this space experience: ${content.title}`;
        const body = `I found this amazing space experience and thought you'd be interested!\n\n${content.title}\n${content.description}\n\nView more details: ${shareUrl.url}`;
        return {
          type: 'email',
          url: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        };
    }
    
    const fullUrl = `${platformConfig.baseUrl}?${params.toString()}`;
    
    return {
      type: 'social',
      platform,
      url: fullUrl,
      shareData: shareUrl
    };
  }

  /**
   * Get content for sharing
   */
  async getContentForSharing(contentType, contentId) {
    switch (contentType) {
      case 'experience':
        const experience = await window.ExploreXDatabase.getExperience(contentId);
        return {
          type: 'experience',
          id: contentId,
          title: experience?.name || 'Space Experience',
          description: experience?.description || 'Discover amazing space experiences',
          image: experience?.photos?.[0] || null,
          url: `/experience/${contentId}`
        };
        
      case 'itinerary':
        const itinerary = window.ExploreXItinerary?.getItinerary?.(contentId);
        return {
          type: 'itinerary',
          id: contentId,
          title: itinerary?.name || 'Space Travel Itinerary',
          description: itinerary?.description || 'Check out this amazing space travel plan',
          image: null,
          url: `/itinerary/${contentId}`
        };
        
      case 'review':
        const review = await this.getReview(contentId);
        return {
          type: 'review',
          id: contentId,
          title: `Review: ${review?.title || 'Space Experience'}`,
          description: review?.content?.substring(0, 200) + '...' || 'Read this space experience review',
          image: review?.photos?.[0] || null,
          url: `/review/${contentId}`
        };
        
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  /**
   * Generate QR code for sharing
   */
  async generateQRCode(url) {
    // In production, this would use a QR code library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  /**
   * Generate short URL
   */
  async generateShortUrl(url) {
    // In production, this would use a URL shortening service
    const shortId = Math.random().toString(36).substr(2, 8);
    return `${window.location.origin}/s/${shortId}`;
  }

  /**
   * Log share event
   */
  async logShareEvent(userId, contentType, contentId, platform, shareResult) {
    const shareEvent = {
      id: this.generateShareEventId(),
      userId,
      contentType,
      contentId,
      platform,
      shareId: shareResult.shareData?.shareId || shareResult.shareId,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };
    
    this.shareHistory.push(shareEvent);
    await this.saveShareHistory();
    
    console.log(`🔗 Share event logged: ${contentType}/${contentId} to ${platform}`);
  }

  /**
   * Get share analytics
   */
  getShareAnalytics(options = {}) {
    const { userId, contentType, platform, dateRange } = options;
    
    let filteredShares = this.shareHistory;
    
    if (userId) {
      filteredShares = filteredShares.filter(s => s.userId === userId);
    }
    
    if (contentType) {
      filteredShares = filteredShares.filter(s => s.contentType === contentType);
    }
    
    if (platform) {
      filteredShares = filteredShares.filter(s => s.platform === platform);
    }
    
    if (dateRange) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      filteredShares = filteredShares.filter(s => {
        const shareDate = new Date(s.timestamp);
        return shareDate >= start && shareDate <= end;
      });
    }
    
    // Calculate analytics
    const totalShares = filteredShares.length;
    const platformBreakdown = {};
    const contentTypeBreakdown = {};
    
    for (const share of filteredShares) {
      platformBreakdown[share.platform] = (platformBreakdown[share.platform] || 0) + 1;
      contentTypeBreakdown[share.contentType] = (contentTypeBreakdown[share.contentType] || 0) + 1;
    }
    
    return {
      totalShares,
      platformBreakdown,
      contentTypeBreakdown,
      recentShares: filteredShares.slice(-10)
    };
  }

  /**
   * Generate IDs
   */
  generateShareId() {
    return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateShareEventId() {
    return 'share_event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Storage methods
   */
  async storeShareData(shareData) {
    try {
      const shares = JSON.parse(localStorage.getItem('explorex-shares') || '[]');
      shares.push(shareData);
      localStorage.setItem('explorex-shares', JSON.stringify(shares));
    } catch (error) {
      console.error('Failed to store share data:', error);
    }
  }

  async loadShareHistory() {
    try {
      const history = localStorage.getItem('explorex-share-history');
      if (history) {
        this.shareHistory = JSON.parse(history);
      }
    } catch (error) {
      console.warn('Failed to load share history:', error);
    }
  }

  async saveShareHistory() {
    try {
      localStorage.setItem('explorex-share-history', JSON.stringify(this.shareHistory));
    } catch (error) {
      console.error('Failed to save share history:', error);
    }
  }

  async getReview(reviewId) {
    // This would fetch from the review system
    return null;
  }
}

// =============================================================================
// NOTIFICATION MANAGER
// =============================================================================

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.userPreferences = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    console.log('🔔 Initializing Notification Manager...');
    await this.loadNotifications();
    this.setupNotificationPermissions();
  }

  /**
   * Send notification
   */
  async sendNotification(userId, notificationData) {
    try {
      const notification = {
        id: this.generateNotificationId(),
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        timestamp: new Date(),
        isRead: false,
        priority: notificationData.priority || 'normal' // low, normal, high
      };
      
      this.notifications.push(notification);
      
      // Check user preferences
      const userPrefs = this.userPreferences.get(userId) || this.getDefaultPreferences();
      
      if (userPrefs[notification.type] !== false) {
        // Show browser notification if permitted
        if (userPrefs.browserNotifications && 'Notification' in window) {
          this.showBrowserNotification(notification);
        }
        
        // Show in-app notification
        this.showInAppNotification(notification);
      }
      
      await this.saveNotifications();
      
      return notification;
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
    }
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(notification) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }

  /**
   * Show in-app notification
   */
  showInAppNotification(notification) {
    // Create notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = 'explorex-notification';
    notificationEl.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
      </div>
      <button class="notification-close">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notificationEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notificationEl.parentNode) {
        notificationEl.parentNode.removeChild(notificationEl);
      }
    }, 5000);
    
    // Close button
    notificationEl.querySelector('.notification-close').addEventListener('click', () => {
      notificationEl.parentNode.removeChild(notificationEl);
    });
  }

  /**
   * Notification helper methods
   */
  async notifyReviewSubmitted(review) {
    return this.sendNotification(review.userId, {
      type: 'review_submitted',
      title: 'Review Submitted',
      message: 'Your review has been submitted and is being reviewed.',
      data: { reviewId: review.id }
    });
  }

  async notifyPhotoUploaded(photo) {
    return this.sendNotification(photo.userId, {
      type: 'photo_uploaded',
      title: 'Photo Uploaded',
      message: 'Your photo has been uploaded successfully.',
      data: { photoId: photo.id }
    });
  }

  async notifyGroupJoined(membership) {
    return this.sendNotification(membership.userId, {
      type: 'group_joined',
      title: 'Welcome to the Group',
      message: 'You have successfully joined the community group.',
      data: { groupId: membership.groupId }
    });
  }

  async notifyContentReported(report) {
    // Notify moderators
    const moderators = await this.getModerators();
    for (const moderator of moderators) {
      await this.sendNotification(moderator.id, {
        type: 'content_reported',
        title: 'Content Reported',
        message: `Content has been reported for: ${report.reason}`,
        data: { reportId: report.id },
        priority: 'high'
      });
    }
  }

  /**
   * Setup notification permissions
   */
  setupNotificationPermissions() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Get default notification preferences
   */
  getDefaultPreferences() {
    return {
      browserNotifications: true,
      review_submitted: true,
      photo_uploaded: true,
      group_joined: true,
      event_reminder: true,
      content_reported: false // Only for moderators
    };
  }

  /**
   * Get moderators (placeholder)
   */
  async getModerators() {
    return []; // Would fetch from user system
  }

  /**
   * Generate notification ID
   */
  generateNotificationId() {
    return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Storage methods
   */
  async loadNotifications() {
    try {
      const stored = localStorage.getItem('explorex-notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }
  }

  async saveNotifications() {
    try {
      // Keep only recent notifications (last 100)
      const recentNotifications = this.notifications.slice(-100);
      localStorage.setItem('explorex-notifications', JSON.stringify(recentNotifications));
      this.notifications = recentNotifications;
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXCommunity = {
  CommunityManager,
  SocialSharingManager,
  NotificationManager
};

console.log('👥 ExploreX Community System loaded');