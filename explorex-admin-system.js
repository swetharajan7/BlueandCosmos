/**
 * ExploreX Admin Dashboard & Content Management System
 * 
 * Comprehensive admin platform featuring:
 * - Admin interface for managing experiences and events
 * - Content moderation tools for reviews and photos
 * - Analytics dashboard for business metrics
 * - User management and support tools
 * - System configuration and feature flag management
 * - Real-time monitoring and alerts
 */

// =============================================================================
// ADMIN DASHBOARD MANAGER
// =============================================================================

class AdminDashboardManager {
  constructor() {
    this.config = {
      enableAdminMode: false,
      enableContentModeration: true,
      enableUserManagement: true,
      enableSystemConfig: true,
      enableAnalytics: true,
      enableRealTimeMonitoring: true,
      
      // Admin permissions
      permissions: {
        manageExperiences: ['admin', 'content_manager'],
        moderateContent: ['admin', 'moderator', 'content_manager'],
        manageUsers: ['admin', 'user_manager'],
        viewAnalytics: ['admin', 'analyst', 'content_manager'],
        systemConfig: ['admin'],
        supportTools: ['admin', 'support', 'moderator']
      },
      
      // Content moderation settings
      moderation: {
        autoModerationEnabled: true,
        requireApproval: true,
        flagThreshold: 3,
        spamDetection: true,
        profanityFilter: true
      },
      
      // System monitoring
      monitoring: {
        alertThresholds: {
          errorRate: 0.05, // 5%
          responseTime: 2000, // 2 seconds
          memoryUsage: 0.8, // 80%
          diskSpace: 0.9 // 90%
        },
        checkInterval: 60000 // 1 minute
      }
    };
    
    this.currentAdmin = null;
    this.adminSessions = new Map();
    this.contentQueue = [];
    this.systemAlerts = [];
    this.auditLog = [];
    this.isInitialized = false;
  }

  /**
   * Initialize admin dashboard
   */
  async initialize() {
    try {
      console.log('👑 Initializing Admin Dashboard...');
      
      // Check admin authentication
      await this.checkAdminAuth();
      
      // Initialize content management
      this.initializeContentManagement();
      
      // Initialize user management
      this.initializeUserManagement();
      
      // Initialize analytics dashboard
      this.initializeAnalyticsDashboard();
      
      // Initialize system monitoring
      this.initializeSystemMonitoring();
      
      // Setup admin UI
      this.setupAdminUI();
      
      // Start real-time updates
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }
      
      this.isInitialized = true;
      console.log('✅ Admin Dashboard initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Admin Dashboard:', error);
      throw error;
    }
  }

  /**
   * Check admin authentication
   */
  async checkAdminAuth() {
    // Check for admin session
    const adminToken = localStorage.getItem('explorex-admin-token');
    
    if (adminToken) {
      try {
        // Validate admin token (in production, this would be server-side)
        const adminData = JSON.parse(atob(adminToken.split('.')[1]));
        
        if (adminData.role && this.isAdminRole(adminData.role)) {
          this.currentAdmin = adminData;
          this.config.enableAdminMode = true;
          
          this.logAdminAction('admin_login', {
            adminId: adminData.id,
            role: adminData.role,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.warn('Invalid admin token:', error);
        localStorage.removeItem('explorex-admin-token');
      }
    }
  }

  /**
   * Admin login
   */
  async adminLogin(credentials) {
    try {
      // In production, this would authenticate with server
      const { username, password } = credentials;
      
      // Demo admin credentials
      const adminAccounts = {
        'admin@explorex.com': { 
          password: 'admin123', 
          role: 'admin', 
          name: 'System Administrator',
          permissions: ['all']
        },
        'moderator@explorex.com': { 
          password: 'mod123', 
          role: 'moderator', 
          name: 'Content Moderator',
          permissions: ['moderateContent', 'supportTools']
        },
        'analyst@explorex.com': { 
          password: 'analyst123', 
          role: 'analyst', 
          name: 'Data Analyst',
          permissions: ['viewAnalytics']
        }
      };
      
      const account = adminAccounts[username];
      
      if (account && account.password === password) {
        // Create admin session
        const adminData = {
          id: 'admin_' + Date.now(),
          email: username,
          role: account.role,
          name: account.name,
          permissions: account.permissions,
          loginTime: Date.now()
        };
        
        // Create JWT-like token (simplified for demo)
        const token = btoa(JSON.stringify({ header: 'demo' })) + '.' + 
                     btoa(JSON.stringify(adminData)) + '.' + 
                     btoa('signature');
        
        localStorage.setItem('explorex-admin-token', token);
        this.currentAdmin = adminData;
        this.config.enableAdminMode = true;
        
        this.logAdminAction('admin_login', {
          adminId: adminData.id,
          role: adminData.role
        });
        
        return { success: true, admin: adminData };
      } else {
        throw new Error('Invalid credentials');
      }
      
    } catch (error) {
      this.logAdminAction('admin_login_failed', {
        username,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Admin logout
   */
  adminLogout() {
    if (this.currentAdmin) {
      this.logAdminAction('admin_logout', {
        adminId: this.currentAdmin.id,
        sessionDuration: Date.now() - this.currentAdmin.loginTime
      });
    }
    
    localStorage.removeItem('explorex-admin-token');
    this.currentAdmin = null;
    this.config.enableAdminMode = false;
    
    // Hide admin UI
    this.hideAdminUI();
  }

  /**
   * Initialize content management
   */
  initializeContentManagement() {
    this.contentManager = {
      // Experience management
      getExperiences: (filters = {}) => {
        // Get experiences from database with admin filters
        const database = window.ExploreXDatabase?.ExperienceDatabase;
        if (database) {
          const db = new database();
          return db.getAllExperiences(filters);
        }
        return [];
      },
      
      createExperience: (experienceData) => {
        this.logAdminAction('experience_created', {
          experienceId: experienceData.id,
          name: experienceData.name,
          adminId: this.currentAdmin?.id
        });
        
        // In production, this would save to database
        return { success: true, id: 'exp_' + Date.now() };
      },
      
      updateExperience: (experienceId, updates) => {
        this.logAdminAction('experience_updated', {
          experienceId,
          updates: Object.keys(updates),
          adminId: this.currentAdmin?.id
        });
        
        return { success: true };
      },
      
      deleteExperience: (experienceId) => {
        this.logAdminAction('experience_deleted', {
          experienceId,
          adminId: this.currentAdmin?.id
        });
        
        return { success: true };
      },
      
      // Content moderation
      getPendingContent: () => {
        return this.contentQueue.filter(item => item.status === 'pending');
      },
      
      approveContent: (contentId) => {
        const content = this.contentQueue.find(item => item.id === contentId);
        if (content) {
          content.status = 'approved';
          content.moderatedBy = this.currentAdmin?.id;
          content.moderatedAt = Date.now();
          
          this.logAdminAction('content_approved', {
            contentId,
            contentType: content.type,
            adminId: this.currentAdmin?.id
          });
        }
        
        return { success: true };
      },
      
      rejectContent: (contentId, reason) => {
        const content = this.contentQueue.find(item => item.id === contentId);
        if (content) {
          content.status = 'rejected';
          content.rejectionReason = reason;
          content.moderatedBy = this.currentAdmin?.id;
          content.moderatedAt = Date.now();
          
          this.logAdminAction('content_rejected', {
            contentId,
            contentType: content.type,
            reason,
            adminId: this.currentAdmin?.id
          });
        }
        
        return { success: true };
      },
      
      flagContent: (contentId, reason, reportedBy) => {
        const content = this.contentQueue.find(item => item.id === contentId);
        if (content) {
          if (!content.flags) content.flags = [];
          
          content.flags.push({
            reason,
            reportedBy,
            timestamp: Date.now()
          });
          
          // Auto-moderate if threshold reached
          if (content.flags.length >= this.config.moderation.flagThreshold) {
            content.status = 'flagged';
            
            this.logAdminAction('content_auto_flagged', {
              contentId,
              flagCount: content.flags.length,
              reasons: content.flags.map(f => f.reason)
            });
          }
        }
        
        return { success: true };
      }
    };
  }

  /**
   * Initialize user management
   */
  initializeUserManagement() {
    this.userManager = {
      getUsers: (filters = {}) => {
        // Get users with admin filters
        const users = JSON.parse(localStorage.getItem('explorex-users') || '[]');
        
        let filteredUsers = users;
        
        if (filters.role) {
          filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }
        
        if (filters.status) {
          filteredUsers = filteredUsers.filter(user => user.status === filters.status);
        }
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(user => 
            user.email.toLowerCase().includes(search) ||
            user.name.toLowerCase().includes(search)
          );
        }
        
        return filteredUsers;
      },
      
      getUserDetails: (userId) => {
        const users = JSON.parse(localStorage.getItem('explorex-users') || '[]');
        return users.find(user => user.id === userId);
      },
      
      updateUser: (userId, updates) => {
        const users = JSON.parse(localStorage.getItem('explorex-users') || '[]');
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...updates };
          localStorage.setItem('explorex-users', JSON.stringify(users));
          
          this.logAdminAction('user_updated', {
            userId,
            updates: Object.keys(updates),
            adminId: this.currentAdmin?.id
          });
          
          return { success: true };
        }
        
        return { success: false, error: 'User not found' };
      },
      
      suspendUser: (userId, reason, duration) => {
        const users = JSON.parse(localStorage.getItem('explorex-users') || '[]');
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
          users[userIndex].status = 'suspended';
          users[userIndex].suspensionReason = reason;
          users[userIndex].suspensionExpiry = Date.now() + duration;
          users[userIndex].suspendedBy = this.currentAdmin?.id;
          
          localStorage.setItem('explorex-users', JSON.stringify(users));
          
          this.logAdminAction('user_suspended', {
            userId,
            reason,
            duration,
            adminId: this.currentAdmin?.id
          });
          
          return { success: true };
        }
        
        return { success: false, error: 'User not found' };
      },
      
      deleteUser: (userId) => {
        const users = JSON.parse(localStorage.getItem('explorex-users') || '[]');
        const filteredUsers = users.filter(user => user.id !== userId);
        
        localStorage.setItem('explorex-users', JSON.stringify(filteredUsers));
        
        this.logAdminAction('user_deleted', {
          userId,
          adminId: this.currentAdmin?.id
        });
        
        return { success: true };
      },
      
      getUserActivity: (userId) => {
        // Get user activity from audit log
        return this.auditLog.filter(entry => 
          entry.data.userId === userId || entry.data.adminId === userId
        );
      }
    };
  }

  /**
   * Initialize analytics dashboard
   */
  initializeAnalyticsDashboard() {
    this.analyticsManager = {
      getOverviewMetrics: () => {
        // Get metrics from analytics system
        const analytics = window.ExploreXAnalytics?.AnalyticsManager;
        if (analytics) {
          return analytics.prototype.getAnalyticsDashboard?.('30d') || {};
        }
        
        // Fallback demo data
        return {
          totalUsers: 1250,
          activeUsers: 890,
          totalExperiences: 156,
          totalReviews: 2340,
          averageRating: 4.3,
          conversionRate: 12.5,
          revenue: 45600,
          growth: {
            users: 15.2,
            experiences: 8.7,
            reviews: 23.1,
            revenue: 18.9
          }
        };
      },
      
      getUserMetrics: () => {
        return {
          newUsers: 45,
          returningUsers: 234,
          userRetention: 68.5,
          averageSessionDuration: 420, // seconds
          bounceRate: 32.1,
          topLocations: [
            { location: 'Los Angeles, CA', users: 156 },
            { location: 'New York, NY', users: 134 },
            { location: 'San Francisco, CA', users: 98 }
          ]
        };
      },
      
      getContentMetrics: () => {
        return {
          totalExperiences: 156,
          pendingApproval: 12,
          totalReviews: 2340,
          averageRating: 4.3,
          flaggedContent: 8,
          topExperiences: [
            { name: 'Griffith Observatory', views: 1250, rating: 4.8 },
            { name: 'Hayden Planetarium', views: 980, rating: 4.6 },
            { name: 'Kennedy Space Center', views: 876, rating: 4.9 }
          ]
        };
      },
      
      getSystemMetrics: () => {
        return {
          uptime: 99.8,
          responseTime: 245, // ms
          errorRate: 0.02,
          memoryUsage: 65.4,
          diskUsage: 42.1,
          activeConnections: 234,
          apiCalls: 15670,
          cacheHitRate: 87.3
        };
      }
    };
  }

  /**
   * Initialize system monitoring
   */
  initializeSystemMonitoring() {
    this.systemMonitor = {
      checkSystemHealth: () => {
        const metrics = this.analyticsManager.getSystemMetrics();
        const alerts = [];
        
        // Check thresholds
        if (metrics.errorRate > this.config.monitoring.alertThresholds.errorRate) {
          alerts.push({
            type: 'error_rate',
            severity: 'high',
            message: `Error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds threshold`,
            value: metrics.errorRate,
            threshold: this.config.monitoring.alertThresholds.errorRate
          });
        }
        
        if (metrics.responseTime > this.config.monitoring.alertThresholds.responseTime) {
          alerts.push({
            type: 'response_time',
            severity: 'medium',
            message: `Response time (${metrics.responseTime}ms) exceeds threshold`,
            value: metrics.responseTime,
            threshold: this.config.monitoring.alertThresholds.responseTime
          });
        }
        
        if (metrics.memoryUsage > this.config.monitoring.alertThresholds.memoryUsage * 100) {
          alerts.push({
            type: 'memory_usage',
            severity: 'high',
            message: `Memory usage (${metrics.memoryUsage}%) exceeds threshold`,
            value: metrics.memoryUsage,
            threshold: this.config.monitoring.alertThresholds.memoryUsage * 100
          });
        }
        
        return {
          status: alerts.length === 0 ? 'healthy' : 'warning',
          alerts,
          metrics
        };
      },
      
      getRecentAlerts: () => {
        return this.systemAlerts.slice(-20); // Last 20 alerts
      },
      
      createAlert: (type, severity, message, data = {}) => {
        const alert = {
          id: 'alert_' + Date.now(),
          type,
          severity,
          message,
          data,
          timestamp: Date.now(),
          acknowledged: false
        };
        
        this.systemAlerts.push(alert);
        
        // Keep only recent alerts
        if (this.systemAlerts.length > 100) {
          this.systemAlerts = this.systemAlerts.slice(-100);
        }
        
        this.logAdminAction('system_alert_created', {
          alertId: alert.id,
          type,
          severity,
          message
        });
        
        return alert;
      },
      
      acknowledgeAlert: (alertId) => {
        const alert = this.systemAlerts.find(a => a.id === alertId);
        if (alert) {
          alert.acknowledged = true;
          alert.acknowledgedBy = this.currentAdmin?.id;
          alert.acknowledgedAt = Date.now();
          
          this.logAdminAction('alert_acknowledged', {
            alertId,
            adminId: this.currentAdmin?.id
          });
        }
      }
    };
  }

  /**
   * Setup admin UI
   */
  setupAdminUI() {
    if (!this.config.enableAdminMode) return;
    
    // Create admin toolbar
    this.createAdminToolbar();
    
    // Setup admin keyboard shortcuts
    this.setupAdminKeyboardShortcuts();
  }

  /**
   * Create admin toolbar
   */
  createAdminToolbar() {
    // Remove existing toolbar
    const existingToolbar = document.getElementById('admin-toolbar');
    if (existingToolbar) {
      existingToolbar.remove();
    }
    
    const toolbar = document.createElement('div');
    toolbar.id = 'admin-toolbar';
    toolbar.className = 'admin-toolbar';
    
    toolbar.innerHTML = `
      <div class="admin-toolbar-content">
        <div class="admin-toolbar-left">
          <span class="admin-badge">👑 ADMIN</span>
          <span class="admin-user">${this.currentAdmin?.name || 'Administrator'}</span>
        </div>
        
        <div class="admin-toolbar-center">
          <button class="admin-btn" onclick="window.ExploreXAdmin.showDashboard()">
            📊 Dashboard
          </button>
          <button class="admin-btn" onclick="window.ExploreXAdmin.showContentManager()">
            📝 Content
          </button>
          <button class="admin-btn" onclick="window.ExploreXAdmin.showUserManager()">
            👥 Users
          </button>
          <button class="admin-btn" onclick="window.ExploreXAdmin.showSystemMonitor()">
            🔧 System
          </button>
        </div>
        
        <div class="admin-toolbar-right">
          <button class="admin-btn admin-btn-danger" onclick="window.ExploreXAdmin.adminLogout()">
            🚪 Logout
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(toolbar);
  }

  /**
   * Setup admin keyboard shortcuts
   */
  setupAdminKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (!this.config.enableAdminMode) return;
      
      // Admin shortcuts (Ctrl+Alt+Key)
      if (event.ctrlKey && event.altKey) {
        switch (event.key) {
          case 'd':
            event.preventDefault();
            this.showDashboard();
            break;
          case 'c':
            event.preventDefault();
            this.showContentManager();
            break;
          case 'u':
            event.preventDefault();
            this.showUserManager();
            break;
          case 's':
            event.preventDefault();
            this.showSystemMonitor();
            break;
        }
      }
    });
  }

  /**
   * Show admin dashboard
   */
  showDashboard() {
    if (!this.hasPermission('viewAnalytics')) {
      this.showAccessDenied();
      return;
    }
    
    this.createAdminModal('Admin Dashboard', this.generateDashboardContent());
  }

  /**
   * Show content manager
   */
  showContentManager() {
    if (!this.hasPermission('moderateContent')) {
      this.showAccessDenied();
      return;
    }
    
    this.createAdminModal('Content Management', this.generateContentManagerContent());
  }

  /**
   * Show user manager
   */
  showUserManager() {
    if (!this.hasPermission('manageUsers')) {
      this.showAccessDenied();
      return;
    }
    
    this.createAdminModal('User Management', this.generateUserManagerContent());
  }

  /**
   * Show system monitor
   */
  showSystemMonitor() {
    if (!this.hasPermission('systemConfig')) {
      this.showAccessDenied();
      return;
    }
    
    this.createAdminModal('System Monitor', this.generateSystemMonitorContent());
  }

  /**
   * Generate dashboard content
   */
  generateDashboardContent() {
    const metrics = this.analyticsManager.getOverviewMetrics();
    const userMetrics = this.analyticsManager.getUserMetrics();
    const contentMetrics = this.analyticsManager.getContentMetrics();
    
    return `
      <div class="admin-dashboard">
        <div class="admin-metrics-grid">
          <div class="admin-metric-card">
            <h3>📊 Overview</h3>
            <div class="metric-item">
              <span>Total Users:</span>
              <span class="metric-value">${metrics.totalUsers}</span>
            </div>
            <div class="metric-item">
              <span>Active Users:</span>
              <span class="metric-value">${metrics.activeUsers}</span>
            </div>
            <div class="metric-item">
              <span>Total Experiences:</span>
              <span class="metric-value">${metrics.totalExperiences}</span>
            </div>
            <div class="metric-item">
              <span>Conversion Rate:</span>
              <span class="metric-value">${metrics.conversionRate}%</span>
            </div>
          </div>
          
          <div class="admin-metric-card">
            <h3>👥 User Metrics</h3>
            <div class="metric-item">
              <span>New Users:</span>
              <span class="metric-value">${userMetrics.newUsers}</span>
            </div>
            <div class="metric-item">
              <span>Retention Rate:</span>
              <span class="metric-value">${userMetrics.userRetention}%</span>
            </div>
            <div class="metric-item">
              <span>Avg Session:</span>
              <span class="metric-value">${Math.round(userMetrics.averageSessionDuration / 60)}m</span>
            </div>
            <div class="metric-item">
              <span>Bounce Rate:</span>
              <span class="metric-value">${userMetrics.bounceRate}%</span>
            </div>
          </div>
          
          <div class="admin-metric-card">
            <h3>📝 Content Metrics</h3>
            <div class="metric-item">
              <span>Total Reviews:</span>
              <span class="metric-value">${contentMetrics.totalReviews}</span>
            </div>
            <div class="metric-item">
              <span>Average Rating:</span>
              <span class="metric-value">${contentMetrics.averageRating}</span>
            </div>
            <div class="metric-item">
              <span>Pending Approval:</span>
              <span class="metric-value">${contentMetrics.pendingApproval}</span>
            </div>
            <div class="metric-item">
              <span>Flagged Content:</span>
              <span class="metric-value">${contentMetrics.flaggedContent}</span>
            </div>
          </div>
        </div>
        
        <div class="admin-actions">
          <button class="admin-action-btn" onclick="window.ExploreXAdmin.exportAnalytics()">
            📥 Export Analytics
          </button>
          <button class="admin-action-btn" onclick="window.ExploreXAdmin.generateReport()">
            📋 Generate Report
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Generate content manager content
   */
  generateContentManagerContent() {
    const pendingContent = this.contentManager.getPendingContent();
    
    return `
      <div class="admin-content-manager">
        <div class="admin-tabs">
          <button class="admin-tab active" onclick="window.ExploreXAdmin.showContentTab('pending')">
            Pending Approval (${pendingContent.length})
          </button>
          <button class="admin-tab" onclick="window.ExploreXAdmin.showContentTab('experiences')">
            Experiences
          </button>
          <button class="admin-tab" onclick="window.ExploreXAdmin.showContentTab('reviews')">
            Reviews
          </button>
        </div>
        
        <div class="admin-tab-content" id="admin-content-tab">
          <div class="pending-content">
            <h3>Pending Content Approval</h3>
            ${pendingContent.length === 0 ? 
              '<p>No content pending approval</p>' :
              pendingContent.map(content => `
                <div class="content-item">
                  <div class="content-info">
                    <h4>${content.title || content.type}</h4>
                    <p>Type: ${content.type} | Submitted: ${new Date(content.submittedAt).toLocaleDateString()}</p>
                    <p>Author: ${content.authorName}</p>
                  </div>
                  <div class="content-actions">
                    <button class="admin-btn admin-btn-success" onclick="window.ExploreXAdmin.approveContent('${content.id}')">
                      ✅ Approve
                    </button>
                    <button class="admin-btn admin-btn-danger" onclick="window.ExploreXAdmin.rejectContent('${content.id}')">
                      ❌ Reject
                    </button>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate user manager content
   */
  generateUserManagerContent() {
    const users = this.userManager.getUsers();
    
    return `
      <div class="admin-user-manager">
        <div class="user-search">
          <input type="text" placeholder="Search users..." id="user-search" 
                 onkeyup="window.ExploreXAdmin.searchUsers(this.value)">
          <select id="user-filter" onchange="window.ExploreXAdmin.filterUsers(this.value)">
            <option value="">All Users</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        
        <div class="users-list" id="users-list">
          ${users.slice(0, 10).map(user => `
            <div class="user-item">
              <div class="user-info">
                <h4>${user.name || user.email}</h4>
                <p>Email: ${user.email}</p>
                <p>Role: ${user.role || 'user'} | Status: ${user.status || 'active'}</p>
                <p>Joined: ${new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
              </div>
              <div class="user-actions">
                <button class="admin-btn" onclick="window.ExploreXAdmin.viewUserDetails('${user.id}')">
                  👁️ View
                </button>
                <button class="admin-btn admin-btn-warning" onclick="window.ExploreXAdmin.suspendUser('${user.id}')">
                  ⏸️ Suspend
                </button>
                <button class="admin-btn admin-btn-danger" onclick="window.ExploreXAdmin.deleteUser('${user.id}')">
                  🗑️ Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate system monitor content
   */
  generateSystemMonitorContent() {
    const systemHealth = this.systemMonitor.checkSystemHealth();
    const recentAlerts = this.systemMonitor.getRecentAlerts();
    
    return `
      <div class="admin-system-monitor">
        <div class="system-status">
          <h3>System Health: <span class="status-${systemHealth.status}">${systemHealth.status.toUpperCase()}</span></h3>
          
          <div class="system-metrics">
            <div class="metric-item">
              <span>Uptime:</span>
              <span class="metric-value">${systemHealth.metrics.uptime}%</span>
            </div>
            <div class="metric-item">
              <span>Response Time:</span>
              <span class="metric-value">${systemHealth.metrics.responseTime}ms</span>
            </div>
            <div class="metric-item">
              <span>Error Rate:</span>
              <span class="metric-value">${(systemHealth.metrics.errorRate * 100).toFixed(2)}%</span>
            </div>
            <div class="metric-item">
              <span>Memory Usage:</span>
              <span class="metric-value">${systemHealth.metrics.memoryUsage}%</span>
            </div>
          </div>
        </div>
        
        <div class="system-alerts">
          <h3>Recent Alerts (${recentAlerts.length})</h3>
          ${recentAlerts.length === 0 ? 
            '<p>No recent alerts</p>' :
            recentAlerts.slice(-5).map(alert => `
              <div class="alert-item alert-${alert.severity}">
                <div class="alert-info">
                  <h4>${alert.type.replace(/_/g, ' ').toUpperCase()}</h4>
                  <p>${alert.message}</p>
                  <small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
                <div class="alert-actions">
                  ${!alert.acknowledged ? `
                    <button class="admin-btn" onclick="window.ExploreXAdmin.acknowledgeAlert('${alert.id}')">
                      ✅ Acknowledge
                    </button>
                  ` : '<span class="acknowledged">✅ Acknowledged</span>'}
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }

  /**
   * Utility methods
   */
  isAdminRole(role) {
    return ['admin', 'moderator', 'content_manager', 'user_manager', 'analyst', 'support'].includes(role);
  }

  hasPermission(permission) {
    if (!this.currentAdmin) return false;
    
    const userPermissions = this.config.permissions[permission] || [];
    return userPermissions.includes(this.currentAdmin.role) || 
           this.currentAdmin.permissions?.includes('all') ||
           this.currentAdmin.permissions?.includes(permission);
  }

  logAdminAction(action, data = {}) {
    const logEntry = {
      id: 'log_' + Date.now(),
      action,
      data: {
        ...data,
        timestamp: Date.now(),
        adminId: this.currentAdmin?.id,
        adminRole: this.currentAdmin?.role
      }
    };
    
    this.auditLog.push(logEntry);
    
    // Keep only recent log entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
    
    console.log('📋 Admin Action:', logEntry);
  }

  createAdminModal(title, content) {
    // Remove existing modal
    const existingModal = document.getElementById('admin-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'admin-modal';
    
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="admin-modal-header">
          <h2>${title}</h2>
          <button class="admin-modal-close" onclick="this.closest('.admin-modal').remove()">×</button>
        </div>
        <div class="admin-modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  showAccessDenied() {
    this.createAdminModal('Access Denied', `
      <div class="access-denied">
        <h3>🚫 Access Denied</h3>
        <p>You don't have permission to access this feature.</p>
        <p>Current role: ${this.currentAdmin?.role || 'Unknown'}</p>
      </div>
    `);
  }

  hideAdminUI() {
    const toolbar = document.getElementById('admin-toolbar');
    if (toolbar) {
      toolbar.remove();
    }
    
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.remove();
    }
  }

  startRealTimeMonitoring() {
    setInterval(() => {
      if (this.config.enableAdminMode) {
        const systemHealth = this.systemMonitor.checkSystemHealth();
        
        // Create alerts for new issues
        systemHealth.alerts.forEach(alert => {
          const existingAlert = this.systemAlerts.find(a => 
            a.type === alert.type && !a.acknowledged
          );
          
          if (!existingAlert) {
            this.systemMonitor.createAlert(
              alert.type,
              alert.severity,
              alert.message,
              alert
            );
          }
        });
      }
    }, this.config.monitoring.checkInterval);
  }

  // Placeholder methods for UI interactions
  approveContent(contentId) { return this.contentManager.approveContent(contentId); }
  rejectContent(contentId) { return this.contentManager.rejectContent(contentId, 'Admin rejection'); }
  suspendUser(userId) { return this.userManager.suspendUser(userId, 'Admin action', 7 * 24 * 60 * 60 * 1000); }
  deleteUser(userId) { return this.userManager.deleteUser(userId); }
  acknowledgeAlert(alertId) { return this.systemMonitor.acknowledgeAlert(alertId); }
  exportAnalytics() { console.log('Exporting analytics...'); }
  generateReport() { console.log('Generating report...'); }
  searchUsers(query) { console.log('Searching users:', query); }
  filterUsers(filter) { console.log('Filtering users:', filter); }
  viewUserDetails(userId) { console.log('Viewing user:', userId); }
  showContentTab(tab) { console.log('Showing content tab:', tab); }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXAdmin = new AdminDashboardManager();

console.log('👑 ExploreX Admin Dashboard System loaded');