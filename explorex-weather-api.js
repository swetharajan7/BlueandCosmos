/**
 * ExploreX Weather and Astronomical Conditions API
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive weather and astronomical condition integration:
 * - Weather API integration for cloud cover and visibility forecasts
 * - Astronomical twilight and moon phase calculations
 * - Optimal viewing time recommendations
 * - Weather-based experience suggestions
 * - Real-time conditions for outdoor experiences
 */

// =============================================================================
// WEATHER API CONFIGURATION
// =============================================================================

const WeatherAPIConfig = {
  // Weather API endpoints
  apis: {
    openWeather: {
      baseUrl: 'https://api.openweathermap.org/data/2.5',
      apiKey: 'YOUR_OPENWEATHER_API_KEY', // In production, use environment variables
      endpoints: {
        current: '/weather',
        forecast: '/forecast',
        onecall: '/onecall'
      }
    },
    weatherAPI: {
      baseUrl: 'https://api.weatherapi.com/v1',
      apiKey: 'YOUR_WEATHERAPI_KEY',
      endpoints: {
        current: '/current.json',
        forecast: '/forecast.json',
        astronomy: '/astronomy.json'
      }
    }
  },
  
  // Astronomical calculation parameters
  astronomy: {
    // Sun elevation angles for different twilight phases
    twilight: {
      civil: -6,      // Civil twilight (sun 6° below horizon)
      nautical: -12,  // Nautical twilight (sun 12° below horizon)
      astronomical: -18 // Astronomical twilight (sun 18° below horizon)
    },
    
    // Moon phase calculations
    moonPhases: {
      newMoon: 0,
      waxingCrescent: 0.25,
      firstQuarter: 0.5,
      waxingGibbous: 0.75,
      fullMoon: 1,
      waningGibbous: 1.25,
      lastQuarter: 1.5,
      waningCrescent: 1.75
    }
  },
  
  // Weather condition thresholds for astronomy
  conditions: {
    excellent: {
      cloudCover: 10,     // Less than 10% cloud cover
      visibility: 15,     // Greater than 15 km visibility
      humidity: 60,       // Less than 60% humidity
      windSpeed: 15       // Less than 15 km/h wind
    },
    good: {
      cloudCover: 30,
      visibility: 10,
      humidity: 75,
      windSpeed: 25
    },
    fair: {
      cloudCover: 60,
      visibility: 5,
      humidity: 85,
      windSpeed: 35
    }
  },
  
  // Cache settings
  cache: {
    currentWeatherTTL: 10 * 60 * 1000,    // 10 minutes
    forecastTTL: 60 * 60 * 1000,          // 1 hour
    astronomyTTL: 24 * 60 * 60 * 1000     // 24 hours
  }
};

// =============================================================================
// WEATHER API MANAGER CLASS
// =============================================================================

class WeatherAPIManager {
  constructor(config = {}) {
    this.config = { ...WeatherAPIConfig, ...config };
    this.cache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the weather API manager
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🌤️ Initializing ExploreX Weather API Manager...');
      
      // Test API connections
      await this.testAPIConnections();
      
      // Load cached data
      this.loadCachedData();
      
      // Setup cache cleanup
      this.setupCacheCleanup();
      
      this.isInitialized = true;
      console.log('✅ Weather API Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Weather API Manager:', error);
      throw error;
    }
  }

  /**
   * Test API connections
   */
  async testAPIConnections() {
    // For demo purposes, we'll use mock data
    // In production, this would test actual API keys
    console.log('🔗 Testing weather API connections...');
    
    // Mock successful connection test
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Weather API connections tested (using mock data for demo)');
  }

  // ===========================================================================
  // CURRENT WEATHER CONDITIONS
  // ===========================================================================

  /**
   * Get current weather conditions for a location
   */
  async getCurrentWeather(location) {
    try {
      const { latitude, longitude } = location;
      const cacheKey = `current_${latitude}_${longitude}`;
      
      // Check cache first
      const cachedWeather = this.getFromCache(cacheKey);
      if (cachedWeather) {
        console.log('📦 Returning cached current weather');
        return cachedWeather;
      }

      console.log(`🌤️ Fetching current weather for ${latitude}, ${longitude}`);

      // In production, this would make real API calls
      const weatherData = await this.fetchCurrentWeatherFromAPI(latitude, longitude);
      
      // Process and enhance weather data
      const processedWeather = this.processWeatherData(weatherData, location);
      
      // Cache the result
      this.setCache(cacheKey, processedWeather, this.config.cache.currentWeatherTTL);
      
      return processedWeather;

    } catch (error) {
      console.error('❌ Failed to fetch current weather:', error);
      return this.getMockCurrentWeather(location);
    }
  }

  /**
   * Fetch current weather from API (mock implementation)
   */
  async fetchCurrentWeatherFromAPI(latitude, longitude) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate realistic mock weather data based on location and time
    const now = new Date();
    const hour = now.getHours();
    const season = this.getSeason(now);
    
    return {
      temperature: this.generateTemperature(latitude, season, hour),
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      cloudCover: Math.floor(Math.random() * 100), // 0-100%
      visibility: Math.floor(Math.random() * 20) + 5, // 5-25 km
      windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
      windDirection: Math.floor(Math.random() * 360), // 0-360 degrees
      pressure: Math.floor(Math.random() * 50) + 1000, // 1000-1050 hPa
      uvIndex: this.calculateUVIndex(latitude, now),
      condition: this.generateWeatherCondition(),
      timestamp: now
    };
  }

  /**
   * Process and enhance weather data with astronomical conditions
   */
  processWeatherData(weatherData, location) {
    const astronomyData = this.calculateAstronomicalConditions(location, weatherData.timestamp);
    const viewingConditions = this.assessViewingConditions(weatherData);
    
    return {
      ...weatherData,
      astronomy: astronomyData,
      viewing: viewingConditions,
      recommendations: this.generateViewingRecommendations(weatherData, astronomyData),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
      }
    };
  }

  // ===========================================================================
  // WEATHER FORECAST
  // ===========================================================================

  /**
   * Get weather forecast for multiple days
   */
  async getWeatherForecast(location, days = 5) {
    try {
      const { latitude, longitude } = location;
      const cacheKey = `forecast_${latitude}_${longitude}_${days}`;
      
      // Check cache first
      const cachedForecast = this.getFromCache(cacheKey);
      if (cachedForecast) {
        console.log('📦 Returning cached weather forecast');
        return cachedForecast;
      }

      console.log(`📅 Fetching ${days}-day weather forecast for ${latitude}, ${longitude}`);

      // Fetch forecast data
      const forecastData = await this.fetchForecastFromAPI(latitude, longitude, days);
      
      // Process forecast data
      const processedForecast = this.processForecastData(forecastData, location);
      
      // Cache the result
      this.setCache(cacheKey, processedForecast, this.config.cache.forecastTTL);
      
      return processedForecast;

    } catch (error) {
      console.error('❌ Failed to fetch weather forecast:', error);
      return this.getMockForecast(location, days);
    }
  }

  /**
   * Fetch forecast from API (mock implementation)
   */
  async fetchForecastFromAPI(latitude, longitude, days) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const forecast = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const season = this.getSeason(date);
      
      // Generate daily forecast
      const dayForecast = {
        date: date,
        temperature: {
          min: this.generateTemperature(latitude, season, 6), // Early morning
          max: this.generateTemperature(latitude, season, 14), // Afternoon
          avg: this.generateTemperature(latitude, season, 12) // Noon
        },
        humidity: Math.floor(Math.random() * 40) + 40,
        cloudCover: Math.floor(Math.random() * 100),
        visibility: Math.floor(Math.random() * 20) + 5,
        windSpeed: Math.floor(Math.random() * 30) + 5,
        windDirection: Math.floor(Math.random() * 360),
        pressure: Math.floor(Math.random() * 50) + 1000,
        condition: this.generateWeatherCondition(),
        precipitation: Math.random() * 10, // 0-10mm
        precipitationChance: Math.floor(Math.random() * 100) // 0-100%
      };
      
      forecast.push(dayForecast);
    }
    
    return forecast;
  }

  /**
   * Process forecast data with astronomical information
   */
  processForecastData(forecastData, location) {
    return {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
      },
      forecast: forecastData.map(day => ({
        ...day,
        astronomy: this.calculateAstronomicalConditions(location, day.date),
        viewing: this.assessViewingConditions(day),
        recommendations: this.generateViewingRecommendations(day, this.calculateAstronomicalConditions(location, day.date))
      })),
      summary: this.generateForecastSummary(forecastData),
      bestViewingDays: this.identifyBestViewingDays(forecastData, location)
    };
  }

  // ===========================================================================
  // ASTRONOMICAL CALCULATIONS
  // ===========================================================================

  /**
   * Calculate astronomical conditions for a given location and time
   */
  calculateAstronomicalConditions(location, date = new Date()) {
    const { latitude, longitude } = location;
    
    return {
      sun: this.calculateSunPosition(latitude, longitude, date),
      moon: this.calculateMoonConditions(latitude, longitude, date),
      twilight: this.calculateTwilight(latitude, longitude, date),
      darkness: this.calculateDarknessHours(latitude, longitude, date),
      visibility: this.calculateVisibilityWindow(latitude, longitude, date)
    };
  }

  /**
   * Calculate sun position and times
   */
  calculateSunPosition(latitude, longitude, date) {
    // Simplified sun position calculation
    const dayOfYear = this.getDayOfYear(date);
    const solarDeclination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    
    // Calculate sunrise and sunset times (simplified)
    const hourAngle = Math.acos(-Math.tan(latitude * Math.PI / 180) * Math.tan(solarDeclination * Math.PI / 180));
    const sunriseHour = 12 - (hourAngle * 180 / Math.PI) / 15;
    const sunsetHour = 12 + (hourAngle * 180 / Math.PI) / 15;
    
    const sunrise = new Date(date);
    sunrise.setHours(Math.floor(sunriseHour), (sunriseHour % 1) * 60, 0, 0);
    
    const sunset = new Date(date);
    sunset.setHours(Math.floor(sunsetHour), (sunsetHour % 1) * 60, 0, 0);
    
    return {
      sunrise,
      sunset,
      dayLength: (sunsetHour - sunriseHour) * 60, // minutes
      solarNoon: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
      elevation: this.calculateSunElevation(latitude, longitude, date)
    };
  }

  /**
   * Calculate moon conditions
   */
  calculateMoonConditions(latitude, longitude, date) {
    // Simplified moon phase calculation
    const lunarMonth = 29.53058867; // Average lunar month in days
    const knownNewMoon = new Date('2024-01-11'); // Known new moon date
    const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
    const lunarAge = daysSinceNewMoon % lunarMonth;
    const phase = lunarAge / lunarMonth;
    
    // Calculate moon rise and set times (simplified)
    const moonriseHour = 6 + (phase * 24); // Approximate
    const moonsetHour = (moonriseHour + 12) % 24;
    
    const moonrise = new Date(date);
    moonrise.setHours(Math.floor(moonriseHour), (moonriseHour % 1) * 60, 0, 0);
    
    const moonset = new Date(date);
    moonset.setHours(Math.floor(moonsetHour), (moonsetHour % 1) * 60, 0, 0);
    
    return {
      phase: this.getMoonPhaseName(phase),
      phaseValue: phase,
      illumination: Math.abs(Math.cos(phase * 2 * Math.PI)) * 100, // Percentage
      moonrise,
      moonset,
      lunarAge: Math.floor(lunarAge),
      isVisible: this.isMoonVisible(date, moonrise, moonset)
    };
  }

  /**
   * Calculate twilight times
   */
  calculateTwilight(latitude, longitude, date) {
    const sun = this.calculateSunPosition(latitude, longitude, date);
    
    // Calculate different twilight phases (simplified)
    const civilTwilightEvening = new Date(sun.sunset.getTime() + 30 * 60 * 1000); // 30 min after sunset
    const nauticalTwilightEvening = new Date(sun.sunset.getTime() + 60 * 60 * 1000); // 1 hour after sunset
    const astronomicalTwilightEvening = new Date(sun.sunset.getTime() + 90 * 60 * 1000); // 1.5 hours after sunset
    
    const astronomicalTwilightMorning = new Date(sun.sunrise.getTime() - 90 * 60 * 1000); // 1.5 hours before sunrise
    const nauticalTwilightMorning = new Date(sun.sunrise.getTime() - 60 * 60 * 1000); // 1 hour before sunrise
    const civilTwilightMorning = new Date(sun.sunrise.getTime() - 30 * 60 * 1000); // 30 min before sunrise
    
    return {
      evening: {
        civil: civilTwilightEvening,
        nautical: nauticalTwilightEvening,
        astronomical: astronomicalTwilightEvening
      },
      morning: {
        astronomical: astronomicalTwilightMorning,
        nautical: nauticalTwilightMorning,
        civil: civilTwilightMorning
      }
    };
  }

  /**
   * Calculate darkness hours for optimal viewing
   */
  calculateDarknessHours(latitude, longitude, date) {
    const twilight = this.calculateTwilight(latitude, longitude, date);
    
    const darknessStart = twilight.evening.astronomical;
    const darknessEnd = twilight.morning.astronomical;
    
    // Handle cases where astronomical twilight doesn't occur (polar regions)
    if (!darknessStart || !darknessEnd) {
      return {
        start: null,
        end: null,
        duration: 0,
        hasDarkness: false
      };
    }
    
    let duration;
    if (darknessEnd < darknessStart) {
      // Darkness spans midnight
      duration = (24 * 60 * 60 * 1000) - (darknessStart - darknessEnd);
    } else {
      duration = darknessEnd - darknessStart;
    }
    
    return {
      start: darknessStart,
      end: darknessEnd,
      duration: duration / (1000 * 60), // minutes
      hasDarkness: duration > 0
    };
  }

  /**
   * Calculate optimal visibility window
   */
  calculateVisibilityWindow(latitude, longitude, date) {
    const darkness = this.calculateDarknessHours(latitude, longitude, date);
    const moon = this.calculateMoonConditions(latitude, longitude, date);
    
    if (!darkness.hasDarkness) {
      return {
        start: null,
        end: null,
        duration: 0,
        quality: 'poor',
        reason: 'No astronomical darkness'
      };
    }
    
    // Adjust for moon interference
    let optimalStart = darkness.start;
    let optimalEnd = darkness.end;
    let quality = 'excellent';
    
    if (moon.illumination > 50) {
      quality = 'good';
      if (moon.illumination > 80) {
        quality = 'fair';
      }
    }
    
    return {
      start: optimalStart,
      end: optimalEnd,
      duration: darkness.duration,
      quality,
      moonInterference: moon.illumination > 30
    };
  }

  // ===========================================================================
  // VIEWING CONDITIONS ASSESSMENT
  // ===========================================================================

  /**
   * Assess viewing conditions based on weather and astronomy
   */
  assessViewingConditions(weatherData) {
    const conditions = this.config.conditions;
    
    // Calculate overall score (0-100)
    let score = 100;
    let factors = [];
    
    // Cloud cover impact (most important)
    if (weatherData.cloudCover > conditions.excellent.cloudCover) {
      const cloudPenalty = Math.min(weatherData.cloudCover, 100) * 0.8;
      score -= cloudPenalty;
      factors.push({
        factor: 'Cloud Cover',
        impact: -cloudPenalty,
        value: `${weatherData.cloudCover}%`,
        status: weatherData.cloudCover > conditions.fair.cloudCover ? 'poor' : 
                weatherData.cloudCover > conditions.good.cloudCover ? 'fair' : 'good'
      });
    }
    
    // Visibility impact
    if (weatherData.visibility < conditions.excellent.visibility) {
      const visibilityPenalty = (conditions.excellent.visibility - weatherData.visibility) * 2;
      score -= visibilityPenalty;
      factors.push({
        factor: 'Visibility',
        impact: -visibilityPenalty,
        value: `${weatherData.visibility} km`,
        status: weatherData.visibility < conditions.fair.visibility ? 'poor' : 
                weatherData.visibility < conditions.good.visibility ? 'fair' : 'good'
      });
    }
    
    // Humidity impact
    if (weatherData.humidity > conditions.excellent.humidity) {
      const humidityPenalty = (weatherData.humidity - conditions.excellent.humidity) * 0.3;
      score -= humidityPenalty;
      factors.push({
        factor: 'Humidity',
        impact: -humidityPenalty,
        value: `${weatherData.humidity}%`,
        status: weatherData.humidity > conditions.fair.humidity ? 'poor' : 
                weatherData.humidity > conditions.good.humidity ? 'fair' : 'good'
      });
    }
    
    // Wind impact
    if (weatherData.windSpeed > conditions.excellent.windSpeed) {
      const windPenalty = (weatherData.windSpeed - conditions.excellent.windSpeed) * 0.5;
      score -= windPenalty;
      factors.push({
        factor: 'Wind Speed',
        impact: -windPenalty,
        value: `${weatherData.windSpeed} km/h`,
        status: weatherData.windSpeed > conditions.fair.windSpeed ? 'poor' : 
                weatherData.windSpeed > conditions.good.windSpeed ? 'fair' : 'good'
      });
    }
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Determine overall rating
    let rating, description;
    if (score >= 80) {
      rating = 'excellent';
      description = 'Excellent conditions for stargazing and astronomy';
    } else if (score >= 60) {
      rating = 'good';
      description = 'Good conditions with minor limitations';
    } else if (score >= 40) {
      rating = 'fair';
      description = 'Fair conditions, some viewing possible';
    } else if (score >= 20) {
      rating = 'poor';
      description = 'Poor conditions, limited viewing opportunities';
    } else {
      rating = 'very-poor';
      description = 'Very poor conditions, not recommended for astronomy';
    }
    
    return {
      score: Math.round(score),
      rating,
      description,
      factors,
      recommendation: this.getViewingRecommendation(rating, score)
    };
  }

  /**
   * Generate viewing recommendations
   */
  generateViewingRecommendations(weatherData, astronomyData) {
    const recommendations = [];
    
    // Weather-based recommendations
    if (weatherData.cloudCover < 20) {
      recommendations.push({
        type: 'excellent',
        icon: '🌟',
        title: 'Perfect Clear Skies',
        description: 'Excellent conditions for deep-sky observation and astrophotography'
      });
    } else if (weatherData.cloudCover < 50) {
      recommendations.push({
        type: 'good',
        icon: '⭐',
        title: 'Partly Cloudy',
        description: 'Good for bright objects like planets and the moon'
      });
    }
    
    // Moon phase recommendations
    if (astronomyData.moon.illumination < 25) {
      recommendations.push({
        type: 'excellent',
        icon: '🌑',
        title: 'New Moon Period',
        description: 'Ideal dark skies for faint deep-sky objects and the Milky Way'
      });
    } else if (astronomyData.moon.illumination > 80) {
      recommendations.push({
        type: 'info',
        icon: '🌕',
        title: 'Full Moon Period',
        description: 'Great for lunar observation but challenging for deep-sky objects'
      });
    }
    
    // Darkness recommendations
    if (astronomyData.darkness.duration > 360) { // More than 6 hours
      recommendations.push({
        type: 'excellent',
        icon: '🌌',
        title: 'Long Dark Period',
        description: `${Math.round(astronomyData.darkness.duration / 60)} hours of astronomical darkness`
      });
    }
    
    // Seasonal recommendations
    const season = this.getSeason(new Date());
    const seasonalRec = this.getSeasonalRecommendations(season);
    if (seasonalRec) {
      recommendations.push(seasonalRec);
    }
    
    return recommendations;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Generate temperature based on location and conditions
   */
  generateTemperature(latitude, season, hour) {
    // Base temperature varies by latitude and season
    let baseTemp = 20; // Default 20°C
    
    // Latitude adjustment
    baseTemp -= Math.abs(latitude) * 0.6;
    
    // Seasonal adjustment
    const seasonalAdjustment = {
      spring: 0,
      summer: 10,
      autumn: -5,
      winter: -15
    };
    baseTemp += seasonalAdjustment[season] || 0;
    
    // Daily variation
    const dailyVariation = 10 * Math.sin((hour - 6) * Math.PI / 12);
    baseTemp += dailyVariation;
    
    // Add some randomness
    baseTemp += (Math.random() - 0.5) * 10;
    
    return Math.round(baseTemp * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get season based on date
   */
  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * Generate weather condition
   */
  generateWeatherCondition() {
    const conditions = [
      { name: 'Clear', icon: '☀️', probability: 0.3 },
      { name: 'Partly Cloudy', icon: '⛅', probability: 0.25 },
      { name: 'Cloudy', icon: '☁️', probability: 0.2 },
      { name: 'Overcast', icon: '🌫️', probability: 0.15 },
      { name: 'Light Rain', icon: '🌦️', probability: 0.07 },
      { name: 'Rain', icon: '🌧️', probability: 0.03 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const condition of conditions) {
      cumulative += condition.probability;
      if (random <= cumulative) {
        return condition;
      }
    }
    
    return conditions[0]; // Default to clear
  }

  /**
   * Calculate UV index
   */
  calculateUVIndex(latitude, date) {
    const hour = date.getHours();
    
    // UV is highest around noon, zero at night
    if (hour < 6 || hour > 18) return 0;
    
    const solarElevation = Math.sin((hour - 6) * Math.PI / 12);
    const latitudeEffect = Math.cos(latitude * Math.PI / 180);
    
    return Math.round(solarElevation * latitudeEffect * 11);
  }

  /**
   * Calculate sun elevation
   */
  calculateSunElevation(latitude, longitude, date) {
    // Simplified calculation
    const hour = date.getHours() + date.getMinutes() / 60;
    const solarTime = hour + longitude / 15; // Rough solar time
    const hourAngle = (solarTime - 12) * 15; // Degrees from solar noon
    
    const dayOfYear = this.getDayOfYear(date);
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    
    const elevation = Math.asin(
      Math.sin(declination * Math.PI / 180) * Math.sin(latitude * Math.PI / 180) +
      Math.cos(declination * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
    ) * 180 / Math.PI;
    
    return Math.max(-90, Math.min(90, elevation));
  }

  /**
   * Get day of year
   */
  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get moon phase name
   */
  getMoonPhaseName(phase) {
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
  }

  /**
   * Check if moon is visible
   */
  isMoonVisible(date, moonrise, moonset) {
    const hour = date.getHours();
    const moonriseHour = moonrise.getHours();
    const moonsetHour = moonset.getHours();
    
    if (moonriseHour < moonsetHour) {
      return hour >= moonriseHour && hour <= moonsetHour;
    } else {
      return hour >= moonriseHour || hour <= moonsetHour;
    }
  }

  /**
   * Get viewing recommendation based on rating
   */
  getViewingRecommendation(rating, score) {
    const recommendations = {
      'excellent': 'Perfect time for all types of astronomical observation',
      'good': 'Great conditions for most astronomical activities',
      'fair': 'Suitable for bright objects and casual stargazing',
      'poor': 'Limited viewing opportunities, consider indoor activities',
      'very-poor': 'Not recommended for outdoor astronomy'
    };
    
    return recommendations[rating] || 'Conditions assessment unavailable';
  }

  /**
   * Get seasonal recommendations
   */
  getSeasonalRecommendations(season) {
    const seasonal = {
      spring: {
        type: 'info',
        icon: '🌸',
        title: 'Spring Skies',
        description: 'Great for galaxies in Leo and Virgo, longer nights ending'
      },
      summer: {
        type: 'info',
        icon: '☀️',
        title: 'Summer Skies',
        description: 'Milky Way season! Perfect for summer triangle and nebulae'
      },
      autumn: {
        type: 'info',
        icon: '🍂',
        title: 'Autumn Skies',
        description: 'Andromeda Galaxy season, great for deep-sky objects'
      },
      winter: {
        type: 'info',
        icon: '❄️',
        title: 'Winter Skies',
        description: 'Orion and winter constellations, longest dark periods'
      }
    };
    
    return seasonal[season];
  }

  /**
   * Generate forecast summary
   */
  generateForecastSummary(forecastData) {
    const avgCloudCover = forecastData.reduce((sum, day) => sum + day.cloudCover, 0) / forecastData.length;
    const avgVisibility = forecastData.reduce((sum, day) => sum + day.visibility, 0) / forecastData.length;
    
    let summary = '';
    if (avgCloudCover < 30) {
      summary = 'Generally clear skies expected with excellent viewing conditions';
    } else if (avgCloudCover < 60) {
      summary = 'Mixed conditions with some clear periods for observation';
    } else {
      summary = 'Mostly cloudy period with limited viewing opportunities';
    }
    
    return {
      description: summary,
      avgCloudCover: Math.round(avgCloudCover),
      avgVisibility: Math.round(avgVisibility * 10) / 10,
      bestDay: this.findBestDay(forecastData),
      worstDay: this.findWorstDay(forecastData)
    };
  }

  /**
   * Identify best viewing days
   */
  identifyBestViewingDays(forecastData, location) {
    return forecastData
      .map((day, index) => ({
        ...day,
        index,
        viewingScore: this.calculateDayViewingScore(day, location)
      }))
      .sort((a, b) => b.viewingScore - a.viewingScore)
      .slice(0, 3)
      .map(day => ({
        date: day.date,
        score: day.viewingScore,
        reason: this.getViewingScoreReason(day)
      }));
  }

  /**
   * Calculate viewing score for a day
   */
  calculateDayViewingScore(day, location) {
    let score = 100;
    
    // Cloud cover (most important)
    score -= day.cloudCover * 0.8;
    
    // Visibility
    score += (day.visibility - 10) * 2;
    
    // Humidity
    score -= Math.max(0, day.humidity - 60) * 0.3;
    
    // Wind
    score -= Math.max(0, day.windSpeed - 15) * 0.5;
    
    // Moon phase (calculated separately)
    const astronomy = this.calculateAstronomicalConditions(location, day.date);
    score += (100 - astronomy.moon.illumination) * 0.2;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get reason for viewing score
   */
  getViewingScoreReason(day) {
    const reasons = [];
    
    if (day.cloudCover < 20) reasons.push('clear skies');
    if (day.visibility > 15) reasons.push('excellent visibility');
    if (day.windSpeed < 15) reasons.push('calm conditions');
    
    return reasons.length > 0 ? reasons.join(', ') : 'favorable conditions';
  }

  /**
   * Find best day in forecast
   */
  findBestDay(forecastData) {
    return forecastData.reduce((best, current) => 
      current.cloudCover < best.cloudCover ? current : best
    );
  }

  /**
   * Find worst day in forecast
   */
  findWorstDay(forecastData) {
    return forecastData.reduce((worst, current) => 
      current.cloudCover > worst.cloudCover ? current : worst
    );
  }

  /**
   * Get mock current weather (fallback)
   */
  getMockCurrentWeather(location) {
    return {
      temperature: 18,
      humidity: 65,
      cloudCover: 25,
      visibility: 12,
      windSpeed: 8,
      windDirection: 270,
      pressure: 1013,
      uvIndex: 3,
      condition: { name: 'Partly Cloudy', icon: '⛅' },
      timestamp: new Date(),
      astronomy: this.calculateAstronomicalConditions(location),
      viewing: {
        score: 75,
        rating: 'good',
        description: 'Good conditions for stargazing',
        factors: []
      },
      recommendations: [],
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || 'Unknown Location'
      }
    };
  }

  /**
   * Get mock forecast (fallback)
   */
  getMockForecast(location, days) {
    const forecast = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date,
        temperature: { min: 12, max: 22, avg: 17 },
        humidity: 60,
        cloudCover: 30,
        visibility: 15,
        windSpeed: 10,
        condition: { name: 'Partly Cloudy', icon: '⛅' },
        astronomy: this.calculateAstronomicalConditions(location, date),
        viewing: { score: 70, rating: 'good' }
      });
    }
    
    return {
      location,
      forecast,
      summary: { description: 'Mock forecast data' },
      bestViewingDays: []
    };
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  /**
   * Get item from cache
   */
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  /**
   * Set item in cache
   */
  setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      created: Date.now()
    });
  }

  /**
   * Setup cache cleanup
   */
  setupCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Load cached data from storage
   */
  loadCachedData() {
    try {
      const cachedData = window.ExploreXUtils.StorageUtils.getItem('weather_cache');
      if (cachedData) {
        const now = Date.now();
        Object.entries(cachedData).forEach(([key, item]) => {
          if (now < item.expiry) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cached weather data:', error);
    }
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXWeatherAPI = {
  WeatherAPIManager,
  WeatherAPIConfig
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌤️ ExploreX Weather API system loaded');
});