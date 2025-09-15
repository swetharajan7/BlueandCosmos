/**
 * ExploreX Analytics Dashboard
 * 
 * Interactive analytics dashboard featuring:
 * - Real-time metrics visualization
 * - Performance monitoring charts
 * - User behavior analytics
 * - Conversion funnel analysis
 * - System health monitoring
 */

// =============================================================================
// ANALYTICS DASHBOARD
// =============================================================================

class AnalyticsDashboard {
  constructor() {
    this.analyticsManager = null;
    this.performanceMonitor = null;
    this.charts = new Map();
    this.updateInterval = null;
    
    this.config = {
      updateInterval: 30000, // 30 seconds
      chartColors: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#4CAF50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196F3'
      },
      timeRanges: ['1h', '24h', '7d', '30d'],
      defaultTimeRange: '24h'
    };
    
    this.currentTimeRange = this.config.defaultTimeRange;
    this.isVisible = false;
  }

  /**
   * Initialize analytics dashboard
   */
  async initialize(analyticsManager, performanceMonitor) {
    try {
      console.log('📊 Initializing Analytics Dashboard...');
      
      this.analyticsManager = analyticsManager;
      this.performanceMonitor = performanceMonitor;
      
      // Create dashboard UI
      this.createDashboardUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start real-time updates
      this.startRealTimeUpdates();
      
      console.log('✅ Analytics Dashboard initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Analytics Dashboard:', error);
      throw error;
    }
  }

  /**
   * Create dashboard UI
   */
  createDashboardUI() {
    const dashboard = document.createElement('div');
    dashboard.id = 'analytics-dashboard';
    dashboard.className = 'analytics-dashboard hidden';
    
    dashboard.innerHTML = `
      <div class="dashboard-header">
        <div class="dashboard-title">
          <h2>📊 Analytics Dashboard</h2>
          <button class="dashboard-close" onclick="this.hideDashboard()">×</button>
        </div>
        
        <div class="dashboard-controls">
          <div class="time-range-selector">
            ${this.config.timeRanges.map(range => `
              <button class="time-range-btn ${range === this.currentTimeRange ? 'active' : ''}" 
                      data-range="${range}" onclick="this.setTimeRange('${range}')">
                ${range}
              </button>
            `).join('')}
          </div>
          
          <button class="refresh-btn" onclick="this.refreshDashboard()">
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="metrics-grid">
          <div class="metric-card" id="overview-metrics">
            <h3>📈 Overview</h3>
            <div class="metric-content" id="overview-content"></div>
          </div>
          
          <div class="metric-card" id="performance-metrics">
            <h3>⚡ Performance</h3>
            <div class="metric-content" id="performance-content"></div>
          </div>
          
          <div class="metric-card" id="user-engagement">
            <h3>👥 User Engagement</h3>
            <div class="metric-content" id="engagement-content"></div>
          </div>
          
          <div class="metric-card" id="conversion-metrics">
            <h3>🎯 Conversions</h3>
            <div class="metric-content" id="conversion-content"></div>
          </div>
        </div>
        
        <div class="charts-grid">
          <div class="chart-container">
            <h3>📊 Page Views Over Time</h3>
            <canvas id="pageviews-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>⚡ Performance Metrics</h3>
            <canvas id="performance-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>🔍 Search Analytics</h3>
            <canvas id="search-chart"></canvas>
          </div>
          
          <div class="chart-container">
            <h3>🚨 Error Analysis</h3>
            <canvas id="error-chart"></canvas>
          </div>
        </div>
        
        <div class="tables-grid">
          <div class="table-container">
            <h3>📄 Top Pages</h3>
            <div id="top-pages-table"></div>
          </div>
          
          <div class="table-container">
            <h3>🔍 Top Searches</h3>
            <div id="top-searches-table"></div>
          </div>
          
          <div class="table-container">
            <h3>🎯 Top Experiences</h3>
            <div id="top-experiences-table"></div>
          </div>
          
          <div class="table-container">
            <h3>⚠️ Recent Alerts</h3>
            <div id="alerts-table"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dashboard);
  }
}  
/**
   * Setup event listeners
   */
  setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setTimeRange(e.target.dataset.range);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        this.toggleDashboard();
      }
    });
  }

  /**
   * Show dashboard
   */
  showDashboard() {
    const dashboard = document.getElementById('analytics-dashboard');
    if (dashboard) {
      dashboard.classList.remove('hidden');
      this.isVisible = true;
      this.refreshDashboard();
    }
  }

  /**
   * Hide dashboard
   */
  hideDashboard() {
    const dashboard = document.getElementById('analytics-dashboard');
    if (dashboard) {
      dashboard.classList.add('hidden');
      this.isVisible = false;
    }
  }

  /**
   * Toggle dashboard visibility
   */
  toggleDashboard() {
    if (this.isVisible) {
      this.hideDashboard();
    } else {
      this.showDashboard();
    }
  }

  /**
   * Set time range
   */
  setTimeRange(range) {
    this.currentTimeRange = range;
    
    // Update active button
    document.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-range="${range}"]`).classList.add('active');
    
    // Refresh data
    this.refreshDashboard();
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard() {
    if (!this.isVisible || !this.analyticsManager) return;

    try {
      // Get analytics data
      const analyticsData = this.analyticsManager.getAnalyticsDashboard(this.currentTimeRange);
      const performanceData = this.performanceMonitor?.getPerformanceSummary();

      // Update metrics cards
      this.updateOverviewMetrics(analyticsData.overview);
      this.updatePerformanceMetrics(performanceData);
      this.updateEngagementMetrics(analyticsData.userEngagement);
      this.updateConversionMetrics(analyticsData.conversions);

      // Update charts
      this.updateCharts(analyticsData, performanceData);

      // Update tables
      this.updateTables(analyticsData, performanceData);

    } catch (error) {
      console.error('❌ Failed to refresh dashboard:', error);
    }
  }

  /**
   * Update overview metrics
   */
  updateOverviewMetrics(overview) {
    const content = document.getElementById('overview-content');
    if (!content || !overview) return;

    content.innerHTML = `
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">${overview.uniqueUsers || 0}</div>
          <div class="metric-label">Unique Users</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${overview.pageViews || 0}</div>
          <div class="metric-label">Page Views</div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">${overview.conversionRate || 0}%</div>
          <div class="metric-label">Conversion Rate</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${overview.avgSessionDuration || 0}s</div>
          <div class="metric-label">Avg Session</div>
        </div>
      </div>
    `;
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(performance) {
    const content = document.getElementById('performance-content');
    if (!content || !performance) return;

    const coreWebVitals = performance.coreWebVitals || {};
    
    content.innerHTML = `
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value ${this.getPerformanceClass('lcp', coreWebVitals.lcp)}">
            ${coreWebVitals.lcp ? Math.round(coreWebVitals.lcp) : '-'}ms
          </div>
          <div class="metric-label">LCP</div>
        </div>
        <div class="metric-item">
          <div class="metric-value ${this.getPerformanceClass('fid', coreWebVitals.fid)}">
            ${coreWebVitals.fid ? Math.round(coreWebVitals.fid) : '-'}ms
          </div>
          <div class="metric-label">FID</div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value ${this.getPerformanceClass('cls', coreWebVitals.cls)}">
            ${coreWebVitals.cls ? coreWebVitals.cls.toFixed(3) : '-'}
          </div>
          <div class="metric-label">CLS</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">
            ${performance.alerts?.length || 0}
          </div>
          <div class="metric-label">Alerts</div>
        </div>
      </div>
    `;
  }

  /**
   * Get performance class for color coding
   */
  getPerformanceClass(metric, value) {
    if (!value) return '';
    
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 }
    };
    
    const threshold = thresholds[metric];
    if (!threshold) return '';
    
    if (value <= threshold.good) return 'performance-good';
    if (value <= threshold.poor) return 'performance-needs-improvement';
    return 'performance-poor';
  }

  /**
   * Update engagement metrics
   */
  updateEngagementMetrics(engagement) {
    const content = document.getElementById('engagement-content');
    if (!content || !engagement) return;

    content.innerHTML = `
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">${engagement.totalSearches || 0}</div>
          <div class="metric-label">Searches</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${Math.round(engagement.avgSearchResults || 0)}</div>
          <div class="metric-label">Avg Results</div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">${engagement.experienceViews || 0}</div>
          <div class="metric-label">Experience Views</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">${engagement.socialShares || 0}</div>
          <div class="metric-label">Social Shares</div>
        </div>
      </div>
    `;
  }

  /**
   * Update conversion metrics
   */
  updateConversionMetrics(conversions) {
    const content = document.getElementById('conversion-content');
    if (!content) return;

    // Placeholder conversion data
    content.innerHTML = `
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">0</div>
          <div class="metric-label">Bookings</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">0</div>
          <div class="metric-label">Reviews</div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-item">
          <div class="metric-value">0</div>
          <div class="metric-label">Photos</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">0</div>
          <div class="metric-label">Shares</div>
        </div>
      </div>
    `;
  }

  /**
   * Update charts (simplified without chart library)
   */
  updateCharts(analyticsData, performanceData) {
    // In a real implementation, this would use Chart.js or similar
    console.log('📊 Updating charts with data:', { analyticsData, performanceData });
  }

  /**
   * Update tables
   */
  updateTables(analyticsData, performanceData) {
    // Update top pages table
    this.updateTopPagesTable(analyticsData.topPages || []);
    
    // Update top searches table
    this.updateTopSearchesTable(analyticsData.topSearches || []);
    
    // Update alerts table
    this.updateAlertsTable(performanceData?.alerts || []);
  }

  /**
   * Update top pages table
   */
  updateTopPagesTable(topPages) {
    const container = document.getElementById('top-pages-table');
    if (!container) return;

    if (topPages.length === 0) {
      container.innerHTML = '<p class="no-data">No page data available</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Page</th>
            <th>Views</th>
            <th>Unique Users</th>
          </tr>
        </thead>
        <tbody>
          ${topPages.slice(0, 5).map(page => `
            <tr>
              <td>${page.path}</td>
              <td>${page.views}</td>
              <td>${page.uniqueUsers}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Update top searches table
   */
  updateTopSearchesTable(topSearches) {
    const container = document.getElementById('top-searches-table');
    if (!container) return;

    if (topSearches.length === 0) {
      container.innerHTML = '<p class="no-data">No search data available</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Query</th>
            <th>Count</th>
            <th>Results</th>
          </tr>
        </thead>
        <tbody>
          ${topSearches.slice(0, 5).map(search => `
            <tr>
              <td>${search.query}</td>
              <td>${search.count}</td>
              <td>${search.avgResults}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Update alerts table
   */
  updateAlertsTable(alerts) {
    const container = document.getElementById('alerts-table');
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = '<p class="no-data">No recent alerts</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.slice(0, 5).map(alert => `
            <tr>
              <td>${alert.type}</td>
              <td><span class="severity-${alert.severity}">${alert.severity}</span></td>
              <td>${new Date(alert.timestamp).toLocaleTimeString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      if (this.isVisible) {
        this.refreshDashboard();
      }
    }, this.config.updateInterval);
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Cleanup dashboard
   */
  cleanup() {
    this.stopRealTimeUpdates();
    
    const dashboard = document.getElementById('analytics-dashboard');
    if (dashboard) {
      dashboard.remove();
    }
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXAnalyticsDashboard = {
  AnalyticsDashboard
};

console.log('📊 ExploreX Analytics Dashboard loaded');