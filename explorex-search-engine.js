/**
 * ExploreX Advanced Search and Filtering Engine
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive search and filtering capabilities including:
 * - Advanced multi-criteria search with real-time filtering
 * - Intelligent ranking and relevance scoring
 * - Filter management with URL state persistence
 * - Search suggestions and autocomplete
 * - Performance optimization with debouncing and caching
 */

// =============================================================================
// SEARCH ENGINE CONFIGURATION
// =============================================================================

const SearchConfig = {
  // Search behavior
  minSearchLength: 2,
  maxSuggestions: 10,
  debounceDelay: 300,
  
  // Filtering options
  defaultRadius: 50, // miles
  maxRadius: 500,
  priceRanges: [
    { label: 'Free', min: 0, max: 0 },
    { label: 'Under $20', min: 0, max: 20 },
    { label: '$20 - $50', min: 20, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: 'Over $100', min: 100, max: 999999 }
  ],
  
  // Sorting options
  sortOptions: [
    { value: 'relevance', label: 'Most Relevant', icon: '🎯' },
    { value: 'distance', label: 'Nearest First', icon: '📍' },
    { value: 'rating', label: 'Highest Rated', icon: '⭐' },
    { value: 'price', label: 'Lowest Price', icon: '💰' },
    { value: 'name', label: 'Alphabetical', icon: '🔤' },
    { value: 'newest', label: 'Recently Added', icon: '🆕' }
  ],
  
  // Filter categories
  experienceTypes: [
    { value: 'observatory', label: 'Observatories', icon: '🔭', color: '#3b82f6' },
    { value: 'planetarium', label: 'Planetariums', icon: '🌌', color: '#8b5cf6' },
    { value: 'space_center', label: 'Space Centers', icon: '🚀', color: '#ef4444' },
    { value: 'space_museum', label: 'Space Museums', icon: '🏛️', color: '#f59e0b' },
    { value: 'science_center', label: 'Science Centers', icon: '🔬', color: '#10b981' },
    { value: 'astronomy_lab', label: 'Astronomy Labs', icon: '🧪', color: '#06b6d4' },
    { value: 'stargazing_site', label: 'Stargazing Sites', icon: '✨', color: '#84cc16' }
  ]
};

// =============================================================================
// SEARCH ENGINE CLASS
// =============================================================================

class SearchEngine {
  constructor(database) {
    this.database = database;
    this.currentFilters = this.getDefaultFilters();
    this.searchHistory = [];
    this.searchCache = new Map();
    this.isSearching = false;
    this.lastSearchTime = 0;
  }

  // ===========================================================================
  // SEARCH FUNCTIONALITY
  // ===========================================================================

  /**
   * Perform comprehensive search with filters
   */
  async search(query = '', filters = {}) {
    const searchId = Date.now();
    this.lastSearchTime = searchId;
    this.isSearching = true;

    try {
      // Merge with current filters
      const searchFilters = { ...this.currentFilters, ...filters };
      
      // Create search criteria
      const criteria = this.buildSearchCriteria(query, searchFilters);
      
      // Check cache first
      const cacheKey = this.getCacheKey(criteria);
      if (this.searchCache.has(cacheKey)) {
        const cachedResult = this.searchCache.get(cacheKey);
        this.isSearching = false;
        return cachedResult;
      }

      // Perform database search
      const searchResult = this.database.searchExperiences(criteria);
      
      // Add search metadata
      const enhancedResult = {
        ...searchResult,
        query,
        filters: searchFilters,
        searchId,
        timestamp: new Date(),
        executionTime: Date.now() - searchId
      };

      // Cache result
      this.cacheSearchResult(cacheKey, enhancedResult);
      
      // Add to search history
      this.addToSearchHistory(query, searchFilters, enhancedResult.total);
      
      // Only return if this is still the latest search
      if (searchId === this.lastSearchTime) {
        this.isSearching = false;
        return enhancedResult;
      }
      
      return null; // Superseded by newer search
      
    } catch (error) {
      this.isSearching = false;
      throw error;
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query) {
    if (!query || query.length < SearchConfig.minSearchLength) {
      return this.getPopularSearches();
    }

    const suggestions = [];
    const queryLower = query.toLowerCase();

    // Get all experiences for suggestion matching
    const allExperiences = this.database.getAllExperiences();

    // Experience name suggestions
    const nameMatches = allExperiences
      .filter(exp => exp.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .map(exp => ({
        type: 'experience',
        text: exp.name,
        subtitle: `${exp.address.city}, ${exp.address.state}`,
        icon: this.getTypeIcon(exp.type),
        experienceId: exp.id
      }));

    suggestions.push(...nameMatches);

    // Location suggestions
    const locationMatches = [...new Set(
      allExperiences
        .filter(exp => 
          exp.address.city.toLowerCase().includes(queryLower) ||
          exp.address.state.toLowerCase().includes(queryLower)
        )
        .map(exp => `${exp.address.city}, ${exp.address.state}`)
    )]
      .slice(0, 3)
      .map(location => ({
        type: 'location',
        text: location,
        subtitle: 'Search by location',
        icon: '📍'
      }));

    suggestions.push(...locationMatches);

    // Tag suggestions
    const tagMatches = [...new Set(
      allExperiences
        .flatMap(exp => exp.tags)
        .filter(tag => tag.toLowerCase().includes(queryLower))
    )]
      .slice(0, 3)
      .map(tag => ({
        type: 'tag',
        text: tag,
        subtitle: 'Search by category',
        icon: '🏷️'
      }));

    suggestions.push(...tagMatches);

    return suggestions.slice(0, SearchConfig.maxSuggestions);
  }

  /**
   * Get popular searches
   */
  getPopularSearches() {
    return [
      { type: 'popular', text: 'Free admission', subtitle: 'No cost experiences', icon: '🆓' },
      { type: 'popular', text: 'California', subtitle: 'West Coast attractions', icon: '🌴' },
      { type: 'popular', text: 'NASA', subtitle: 'Space agency facilities', icon: '🚀' },
      { type: 'popular', text: 'Planetarium', subtitle: 'Immersive space shows', icon: '🌌' },
      { type: 'popular', text: 'Observatory', subtitle: 'Telescope viewing', icon: '🔭' }
    ];
  }

  // ===========================================================================
  // FILTER MANAGEMENT
  // ===========================================================================

  /**
   * Update search filters
   */
  updateFilters(newFilters) {
    this.currentFilters = { ...this.currentFilters, ...newFilters };
    this.clearSearchCache(); // Clear cache when filters change
    return this.currentFilters;
  }

  /**
   * Reset filters to defaults
   */
  resetFilters() {
    this.currentFilters = this.getDefaultFilters();
    this.clearSearchCache();
    return this.currentFilters;
  }

  /**
   * Get current filters
   */
  getCurrentFilters() {
    return { ...this.currentFilters };
  }

  /**
   * Get default filter configuration
   */
  getDefaultFilters() {
    return {
      types: [],
      location: null,
      radius: SearchConfig.defaultRadius,
      minRating: 0,
      maxPrice: null,
      priceRange: null,
      accessibility: [],
      featured: null,
      verified: null,
      freeOnly: false,
      sortBy: 'relevance',
      sortOrder: 'desc'
    };
  }

  /**
   * Get available filter options
   */
  getFilterOptions() {
    const stats = this.database.getStatistics();
    
    return {
      types: SearchConfig.experienceTypes.map(type => ({
        ...type,
        count: stats.byType[type.value] || 0
      })),
      
      priceRanges: SearchConfig.priceRanges,
      
      ratings: [
        { value: 4.5, label: '4.5+ Stars', icon: '⭐' },
        { value: 4.0, label: '4.0+ Stars', icon: '⭐' },
        { value: 3.5, label: '3.5+ Stars', icon: '⭐' },
        { value: 3.0, label: '3.0+ Stars', icon: '⭐' }
      ],
      
      accessibility: [
        { value: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: '♿' },
        { value: 'hearing_impaired_support', label: 'Hearing Support', icon: '🦻' },
        { value: 'visual_impaired_support', label: 'Visual Support', icon: '👁️' },
        { value: 'sign_language', label: 'Sign Language', icon: '🤟' }
      ],
      
      sortOptions: SearchConfig.sortOptions
    };
  }

  // ===========================================================================
  // SEARCH CRITERIA BUILDING
  // ===========================================================================

  /**
   * Build search criteria from query and filters
   */
  buildSearchCriteria(query, filters) {
    const criteria = new window.ExploreXModels.SearchCriteria({
      searchText: query,
      location: filters.location,
      maxDistance: filters.radius,
      types: filters.types.length > 0 ? filters.types : undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      maxPrice: filters.maxPrice,
      accessibilityRequirements: filters.accessibility.length > 0 ? filters.accessibility : undefined,
      featured: filters.featured,
      verified: filters.verified,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: 50 // Reasonable limit for UI performance
    });

    // Handle price range filter
    if (filters.priceRange) {
      const range = SearchConfig.priceRanges.find(r => r.label === filters.priceRange);
      if (range) {
        criteria.maxPrice = range.max === 999999 ? undefined : range.max;
        if (range.min > 0) {
          criteria.minPrice = range.min;
        }
      }
    }

    // Handle free-only filter
    if (filters.freeOnly) {
      criteria.maxPrice = 0;
    }

    return criteria;
  }

  // ===========================================================================
  // CACHING AND PERFORMANCE
  // ===========================================================================

  /**
   * Generate cache key for search criteria
   */
  getCacheKey(criteria) {
    return JSON.stringify({
      searchText: criteria.searchText,
      location: criteria.location ? `${criteria.location.latitude},${criteria.location.longitude}` : null,
      maxDistance: criteria.maxDistance,
      types: criteria.types,
      minRating: criteria.minRating,
      maxPrice: criteria.maxPrice,
      accessibility: criteria.accessibilityRequirements,
      sortBy: criteria.sortBy,
      sortOrder: criteria.sortOrder
    });
  }

  /**
   * Cache search result
   */
  cacheSearchResult(key, result) {
    // Limit cache size
    if (this.searchCache.size >= 50) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    
    this.searchCache.set(key, result);
  }

  /**
   * Clear search cache
   */
  clearSearchCache() {
    this.searchCache.clear();
  }

  // ===========================================================================
  // SEARCH HISTORY AND ANALYTICS
  // ===========================================================================

  /**
   * Add search to history
   */
  addToSearchHistory(query, filters, resultCount) {
    const historyEntry = {
      query,
      filters: { ...filters },
      resultCount,
      timestamp: new Date(),
      id: Date.now()
    };

    this.searchHistory.unshift(historyEntry);
    
    // Keep only last 20 searches
    if (this.searchHistory.length > 20) {
      this.searchHistory = this.searchHistory.slice(0, 20);
    }

    // Save to localStorage
    try {
      window.ExploreXUtils.StorageUtils.setItem('search_history', this.searchHistory, 24);
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  /**
   * Get search history
   */
  getSearchHistory() {
    return [...this.searchHistory];
  }

  /**
   * Load search history from storage
   */
  loadSearchHistory() {
    try {
      const history = window.ExploreXUtils.StorageUtils.getItem('search_history');
      if (history && Array.isArray(history)) {
        this.searchHistory = history;
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }

  /**
   * Clear search history
   */
  clearSearchHistory() {
    this.searchHistory = [];
    window.ExploreXUtils.StorageUtils.removeItem('search_history');
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get icon for experience type
   */
  getTypeIcon(type) {
    const typeConfig = SearchConfig.experienceTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : '📍';
  }

  /**
   * Get color for experience type
   */
  getTypeColor(type) {
    const typeConfig = SearchConfig.experienceTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.color : '#6b7280';
  }

  /**
   * Format search result summary
   */
  formatResultSummary(result) {
    const { total, query, filters } = result;
    
    let summary = `Found ${total} experience${total !== 1 ? 's' : ''}`;
    
    if (query) {
      summary += ` for "${query}"`;
    }
    
    if (filters.location) {
      summary += ` near your location`;
    }
    
    if (filters.types.length > 0) {
      const typeLabels = filters.types.map(type => {
        const config = SearchConfig.experienceTypes.find(t => t.value === type);
        return config ? config.label.toLowerCase() : type;
      });
      summary += ` in ${typeLabels.join(', ')}`;
    }
    
    return summary;
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics() {
    const history = this.getSearchHistory();
    
    return {
      totalSearches: history.length,
      averageResults: history.length > 0 ? 
        Math.round(history.reduce((sum, search) => sum + search.resultCount, 0) / history.length) : 0,
      popularQueries: this.getPopularQueries(history),
      popularFilters: this.getPopularFilters(history),
      recentSearches: history.slice(0, 5)
    };
  }

  /**
   * Get popular search queries
   */
  getPopularQueries(history) {
    const queryCount = {};
    
    history.forEach(search => {
      if (search.query && search.query.trim()) {
        const query = search.query.toLowerCase().trim();
        queryCount[query] = (queryCount[query] || 0) + 1;
      }
    });
    
    return Object.entries(queryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));
  }

  /**
   * Get popular filter combinations
   */
  getPopularFilters(history) {
    const filterCount = {};
    
    history.forEach(search => {
      if (search.filters.types.length > 0) {
        search.filters.types.forEach(type => {
          filterCount[type] = (filterCount[type] || 0) + 1;
        });
      }
    });
    
    return Object.entries(filterCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([filter, count]) => ({ filter, count }));
  }
}

// =============================================================================
// SEARCH UI CONTROLLER
// =============================================================================

class SearchUIController {
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
    this.searchInput = null;
    this.filtersContainer = null;
    this.resultsContainer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize search UI
   */
  initialize(searchInputId, filtersContainerId, resultsContainerId) {
    this.searchInput = document.getElementById(searchInputId);
    this.filtersContainer = document.getElementById(filtersContainerId);
    this.resultsContainer = document.getElementById(resultsContainerId);

    if (!this.searchInput) {
      console.error('Search input element not found');
      return false;
    }

    this.setupSearchInput();
    this.setupFilters();
    this.loadSearchHistory();
    
    this.isInitialized = true;
    return true;
  }

  /**
   * Setup search input with suggestions
   */
  setupSearchInput() {
    // Add search suggestions functionality
    const suggestionsContainer = this.createSuggestionsContainer();
    
    // Debounced search handler
    const debouncedSearch = window.ExploreXUtils.PerformanceUtils.debounce(
      this.handleSearchInput.bind(this),
      SearchConfig.debounceDelay
    );

    this.searchInput.addEventListener('input', debouncedSearch);
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
    this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
  }

  /**
   * Create suggestions dropdown container
   */
  createSuggestionsContainer() {
    const container = document.createElement('div');
    container.className = 'search-suggestions';
    container.style.display = 'none';
    
    this.searchInput.parentNode.insertBefore(container, this.searchInput.nextSibling);
    return container;
  }

  /**
   * Setup filter interface
   */
  setupFilters() {
    if (!this.filtersContainer) return;

    const filterOptions = this.searchEngine.getFilterOptions();
    this.renderFilters(filterOptions);
  }

  /**
   * Render filter interface
   */
  renderFilters(options) {
    // Implementation would create filter UI elements
    // This is a placeholder for the comprehensive filter interface
    console.log('Rendering filters with options:', options);
  }

  /**
   * Handle search input changes
   */
  async handleSearchInput(event) {
    const query = event.target.value.trim();
    
    if (query.length >= SearchConfig.minSearchLength) {
      const suggestions = await this.searchEngine.getSearchSuggestions(query);
      this.showSuggestions(suggestions);
    } else {
      this.hideSuggestions();
    }
  }

  /**
   * Handle search input focus
   */
  handleSearchFocus() {
    if (this.searchInput.value.trim().length === 0) {
      const popularSearches = this.searchEngine.getPopularSearches();
      this.showSuggestions(popularSearches);
    }
  }

  /**
   * Handle search input blur
   */
  handleSearchBlur() {
    // Delay hiding to allow for suggestion clicks
    setTimeout(() => {
      this.hideSuggestions();
    }, 150);
  }

  /**
   * Handle search input keydown
   */
  handleSearchKeydown(event) {
    // Handle arrow keys, enter, escape for suggestion navigation
    // Implementation would handle keyboard navigation
  }

  /**
   * Show search suggestions
   */
  showSuggestions(suggestions) {
    const container = this.searchInput.parentNode.querySelector('.search-suggestions');
    if (!container) return;

    container.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'search-suggestion-item';
      item.innerHTML = `
        <span class="suggestion-icon">${suggestion.icon}</span>
        <div class="suggestion-content">
          <div class="suggestion-text">${suggestion.text}</div>
          <div class="suggestion-subtitle">${suggestion.subtitle}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      container.appendChild(item);
    });

    container.style.display = 'block';
  }

  /**
   * Hide search suggestions
   */
  hideSuggestions() {
    const container = this.searchInput.parentNode.querySelector('.search-suggestions');
    if (container) {
      container.style.display = 'none';
    }
  }

  /**
   * Select a search suggestion
   */
  selectSuggestion(suggestion) {
    this.searchInput.value = suggestion.text;
    this.hideSuggestions();
    
    // Trigger search
    this.performSearch(suggestion.text);
  }

  /**
   * Perform search with current query and filters
   */
  async performSearch(query = null) {
    const searchQuery = query || this.searchInput.value.trim();
    const filters = this.searchEngine.getCurrentFilters();

    try {
      const result = await this.searchEngine.search(searchQuery, filters);
      if (result) {
        this.displaySearchResults(result);
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.displaySearchError(error);
    }
  }

  /**
   * Display search results
   */
  displaySearchResults(result) {
    if (!this.resultsContainer) return;

    // Implementation would render search results
    console.log('Displaying search results:', result);
  }

  /**
   * Display search error
   */
  displaySearchError(error) {
    if (!this.resultsContainer) return;

    this.resultsContainer.innerHTML = `
      <div class="search-error">
        <h3>Search Error</h3>
        <p>Unable to perform search. Please try again.</p>
      </div>
    `;
  }

  /**
   * Load search history
   */
  loadSearchHistory() {
    this.searchEngine.loadSearchHistory();
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

// Make search engine available globally
if (typeof window !== 'undefined') {
  window.ExploreXSearchEngine = {
    SearchEngine,
    SearchUIController,
    SearchConfig
  };
} else {
  module.exports = {
    SearchEngine,
    SearchUIController,
    SearchConfig
  };
}

console.log('✅ ExploreX Search Engine loaded successfully');