/**
 * ExploreX Utility Functions and Data Validation
 * Space Travel Experience Recommendation System
 * 
 * This file contains utility functions, data validation,
 * and helper methods for the ExploreX application.
 */

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Geographic Utilities
 */
class GeoUtils {
  /**
   * Calculate distance between two geographic points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @param {string} unit - Unit of measurement ('miles' or 'km')
   * @returns {number} Distance in specified unit
   */
  static calculateDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
    const R = unit === 'miles' ? 3959 : 6371; // Earth's radius
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  static toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Get bounding box for a location with radius
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} radiusMiles - Radius in miles
   * @returns {object} Bounding box with north, south, east, west coordinates
   */
  static getBoundingBox(lat, lon, radiusMiles) {
    const latDelta = radiusMiles / 69; // Approximate miles per degree latitude
    const lonDelta = radiusMiles / (69 * Math.cos(this.toRadians(lat)));

    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lon + lonDelta,
      west: lon - lonDelta
    };
  }

  /**
   * Check if a point is within a bounding box
   */
  static isWithinBounds(lat, lon, bounds) {
    return lat >= bounds.south && lat <= bounds.north &&
           lon >= bounds.west && lon <= bounds.east;
  }

  /**
   * Format coordinates for display
   */
  static formatCoordinates(lat, lon, precision = 4) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lon).toFixed(precision)}°${lonDir}`;
  }
}

/**
 * Date and Time Utilities
 */
class DateUtils {
  /**
   * Check if a date is within a date range
   */
  static isWithinDateRange(date, startDate, endDate) {
    return date >= startDate && date <= endDate;
  }

  /**
   * Get date range for a number of days from a start date
   */
  static getDateRange(startDate, days) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days);
    return { startDate, endDate };
  }

  /**
   * Format date for display
   */
  static formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  /**
   * Get relative time string (e.g., "2 hours ago", "in 3 days")
   */
  static getRelativeTime(date) {
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (Math.abs(diffDays) >= 1) {
      return diffDays > 0 ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}` : 
                           `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffHours) >= 1) {
      return diffHours > 0 ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}` : 
                            `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffMinutes) >= 1) {
      return diffMinutes > 0 ? `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : 
                              `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
    } else {
      return 'now';
    }
  }

  /**
   * Check if date is today
   */
  static isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Check if date is this week
   */
  static isThisWeek(date) {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    return date >= startOfWeek && date <= endOfWeek;
  }
}

/**
 * String Utilities
 */
class StringUtils {
  /**
   * Truncate string to specified length with ellipsis
   */
  static truncate(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Convert string to title case
   */
  static toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Convert string to slug (URL-friendly)
   */
  static toSlug(str) {
    return str
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  /**
   * Escape HTML characters
   */
  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Remove HTML tags from string
   */
  static stripHtml(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  }

  /**
   * Highlight search terms in text
   */
  static highlightSearchTerms(text, searchTerms, className = 'highlight') {
    if (!searchTerms || searchTerms.length === 0) return text;
    
    const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, `<span class="${className}">$1</span>`);
    });
    
    return highlightedText;
  }
}

/**
 * Number Utilities
 */
class NumberUtils {
  /**
   * Format number as currency
   */
  static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format number with commas
   */
  static formatNumber(num, locale = 'en-US') {
    return new Intl.NumberFormat(locale).format(num);
  }

  /**
   * Round number to specified decimal places
   */
  static round(num, decimals = 2) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Clamp number between min and max values
   */
  static clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  /**
   * Generate random number between min and max
   */
  static random(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Array Utilities
 */
class ArrayUtils {
  /**
   * Remove duplicates from array
   */
  static unique(arr) {
    return [...new Set(arr)];
  }

  /**
   * Shuffle array randomly
   */
  static shuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Group array by key
   */
  static groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * Sort array by multiple criteria
   */
  static sortBy(arr, ...criteria) {
    return arr.sort((a, b) => {
      for (const criterion of criteria) {
        let aVal, bVal, order = 1;
        
        if (typeof criterion === 'string') {
          aVal = a[criterion];
          bVal = b[criterion];
        } else if (typeof criterion === 'function') {
          aVal = criterion(a);
          bVal = criterion(b);
        } else if (criterion.key) {
          aVal = typeof criterion.key === 'function' ? criterion.key(a) : a[criterion.key];
          bVal = typeof criterion.key === 'function' ? criterion.key(b) : b[criterion.key];
          order = criterion.order === 'desc' ? -1 : 1;
        }
        
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
      }
      return 0;
    });
  }

  /**
   * Paginate array
   */
  static paginate(arr, page, pageSize) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      data: arr.slice(startIndex, endIndex),
      page,
      pageSize,
      total: arr.length,
      totalPages: Math.ceil(arr.length / pageSize),
      hasNext: endIndex < arr.length,
      hasPrev: page > 1
    };
  }
}

/**
 * URL and Query String Utilities
 */
class UrlUtils {
  /**
   * Parse query string into object
   */
  static parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    
    for (const [key, value] = params) {
      result[key] = value;
    }
    
    return result;
  }

  /**
   * Build query string from object
   */
  static buildQueryString(params) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Update URL with new parameters
   */
  static updateUrl(params, replace = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  }
}

/**
 * Local Storage Utilities
 */
class StorageUtils {
  /**
   * Set item in localStorage with expiration
   */
  static setItem(key, value, expirationHours = null) {
    const item = {
      value,
      timestamp: Date.now(),
      expiration: expirationHours ? Date.now() + (expirationHours * 60 * 60 * 1000) : null
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Get item from localStorage with expiration check
   */
  static getItem(key) {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check expiration
      if (item.expiration && Date.now() > item.expiration) {
        localStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  /**
   * Clear all items from localStorage
   */
  static clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo() {
    let totalSize = 0;
    const items = {};
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length;
        items[key] = size;
        totalSize += size;
      }
    }
    
    return {
      totalSize,
      items,
      available: 5 * 1024 * 1024 - totalSize // Approximate 5MB limit
    };
  }
}

/**
 * Debounce and Throttle Utilities
 */
class PerformanceUtils {
  /**
   * Debounce function execution
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function execution
   */
  static throttle(func, limit) {
    let inThrottle;
    
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Measure function execution time
   */
  static measureTime(func, label = 'Function') {
    return function(...args) {
      const start = performance.now();
      const result = func.apply(this, args);
      const end = performance.now();
      
      console.log(`${label} execution time: ${(end - start).toFixed(2)}ms`);
      return result;
    };
  }
}

/**
 * Error Handling Utilities
 */
class ErrorUtils {
  /**
   * Create standardized error object
   */
  static createError(message, code, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * Log error with context
   */
  static logError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('ExploreX Error:', errorInfo);
    
    // In production, send to error tracking service
    if (window.ExploreXConfig && !window.ExploreXConfig.debug) {
      // Send to error tracking service
      // Example: Sentry, LogRocket, etc.
    }
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync(func) {
    return async function(...args) {
      try {
        return await func.apply(this, args);
      } catch (error) {
        ErrorUtils.logError(error, { function: func.name, args });
        throw error;
      }
    };
  }
}

// =============================================================================
// EXPORT UTILITIES
// =============================================================================

// Make utilities available globally
if (typeof window !== 'undefined') {
  // Browser environment
  window.ExploreXUtils = {
    GeoUtils,
    DateUtils,
    StringUtils,
    NumberUtils,
    ArrayUtils,
    UrlUtils,
    StorageUtils,
    PerformanceUtils,
    ErrorUtils
  };
} else {
  // Node.js environment
  module.exports = {
    GeoUtils,
    DateUtils,
    StringUtils,
    NumberUtils,
    ArrayUtils,
    UrlUtils,
    StorageUtils,
    PerformanceUtils,
    ErrorUtils
  };
}

console.log('✅ ExploreX Utilities loaded successfully');