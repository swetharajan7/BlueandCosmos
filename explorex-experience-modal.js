/**
 * ExploreX Experience Detail Modal System
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive experience detail display including:
 * - Tabbed interface for organized information
 * - Photo galleries and media display
 * - Reviews and ratings system
 * - Booking and contact integration
 * - Social sharing and favorites
 */

// =============================================================================
// EXPERIENCE MODAL CONFIGURATION
// =============================================================================

const ExperienceModalConfig = {
  // Tab configuration
  tabs: [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'details', label: 'Details', icon: '📍' },
    { id: 'photos', label: 'Photos', icon: '📸' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'contact', label: 'Contact', icon: '📞' }
  ],
  
  // Photo gallery settings
  photoGallery: {
    thumbnailSize: 80,
    maxPhotos: 20,
    enableZoom: true,
    enableFullscreen: true
  },
  
  // Review settings
  reviews: {
    pageSize: 5,
    enableSorting: true,
    enableFiltering: true
  }
};

// =============================================================================
// EXPERIENCE DETAIL MODAL CLASS
// =============================================================================

class ExperienceDetailModal extends window.ExploreXUI.Modal {
  constructor(options = {}) {
    super({
      size: 'large',
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
      ...options
    });
    
    this.experience = null;
    this.currentTab = 'overview';
    this.photoGallery = null;
    this.reviewsManager = null;
  }

  /**
   * Show experience details in modal
   */
  showExperience(experience) {
    this.experience = experience;
    this.currentTab = 'overview';
    
    const content = this.createModalContent();
    
    this.open({
      title: experience.name,
      body: content,
      footer: this.createModalFooter()
    });
    
    // Initialize components after modal is open
    setTimeout(() => {
      this.initializeComponents();
    }, 100);
  }

  /**
   * Create comprehensive modal content
   */
  createModalContent() {
    const container = document.createElement('div');
    container.className = 'experience-detail-modal';
    
    container.innerHTML = `
      <div class="modal-tabs">
        ${ExperienceModalConfig.tabs.map(tab => `
          <button class="modal-tab ${tab.id === this.currentTab ? 'active' : ''}" 
                  data-tab="${tab.id}">
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </div>
      
      <div class="modal-tab-content">
        ${this.createTabContent()}
      </div>
    `;
    
    return container;
  }  /**

   * Create tab content based on current tab
   */
  createTabContent() {
    switch (this.currentTab) {
      case 'overview':
        return this.createOverviewTab();
      case 'details':
        return this.createDetailsTab();
      case 'photos':
        return this.createPhotosTab();
      case 'reviews':
        return this.createReviewsTab();
      case 'contact':
        return this.createContactTab();
      default:
        return this.createOverviewTab();
    }
  }

  /**
   * Create overview tab content
   */
  createOverviewTab() {
    const exp = this.experience;
    const stars = '★'.repeat(Math.floor(exp.rating)) + '☆'.repeat(5 - Math.floor(exp.rating));
    const typeDisplay = window.ExploreXUtils.StringUtils.toTitleCase(exp.type.replace(/_/g, ' '));
    
    return `
      <div class="tab-overview">
        <div class="overview-hero">
          <div class="hero-image" style="background-image: url('${this.getExperienceImage(exp)}')">
            <div class="hero-overlay">
              <div class="hero-badges">
                ${exp.featured ? '<span class="hero-badge featured">⭐ Featured</span>' : ''}
                ${exp.verified ? '<span class="hero-badge verified">✅ Verified</span>' : ''}
                ${exp.admissionFee.isFree ? '<span class="hero-badge free">🆓 Free</span>' : ''}
              </div>
              <div class="hero-info">
                <div class="experience-type-large">
                  <span class="type-icon-large">${this.getTypeIcon(exp.type)}</span>
                  <span class="type-label-large">${typeDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="overview-content">
          <div class="overview-main">
            <div class="experience-rating">
              <span class="rating-stars">${stars}</span>
              <span class="rating-value">${exp.rating}</span>
              <span class="rating-count">(${window.ExploreXUtils.NumberUtils.formatNumber(exp.reviewCount)} reviews)</span>
            </div>
            
            <div class="experience-description">
              <p>${exp.description}</p>
            </div>
            
            <div class="experience-highlights">
              <div class="highlight-grid">
                <div class="highlight-item">
                  <span class="highlight-icon">💰</span>
                  <div class="highlight-content">
                    <h4>Admission</h4>
                    <p>${exp.admissionFee.isFree ? 'Free' : exp.admissionFee.formatPrice()}</p>
                  </div>
                </div>
                <div class="highlight-item">
                  <span class="highlight-icon">⏰</span>
                  <div class="highlight-content">
                    <h4>Hours</h4>
                    <p>${this.getOperatingHoursSummary(exp.operatingHours)}</p>
                  </div>
                </div>
                <div class="highlight-item">
                  <span class="highlight-icon">📍</span>
                  <div class="highlight-content">
                    <h4>Location</h4>
                    <p>${exp.address.city}, ${exp.address.state}</p>
                    ${exp.distance ? `<p class="distance">${window.ExploreXUtils.NumberUtils.round(exp.distance, 1)} miles away</p>` : ''}
                  </div>
                </div>
                <div class="highlight-item">
                  <span class="highlight-icon">♿</span>
                  <div class="highlight-content">
                    <h4>Accessibility</h4>
                    <p>${this.getAccessibilitySummary(exp.accessibility)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="overview-sidebar">
            <div class="quick-actions">
              <button class="action-button primary" onclick="this.getDirections()">
                <span class="button-icon">🗺️</span>
                <span class="button-text">Get Directions</span>
              </button>
              <button class="action-button secondary" onclick="this.toggleFavorite()">
                <span class="button-icon">❤️</span>
                <span class="button-text">Save</span>
              </button>
              <button class="action-button secondary" onclick="this.shareExperience()">
                <span class="button-icon">📤</span>
                <span class="button-text">Share</span>
              </button>
            </div>
            
            <div class="contact-quick">
              <h4>Quick Contact</h4>
              ${exp.contactInfo.phone ? `
                <div class="contact-item">
                  <span class="contact-icon">📞</span>
                  <a href="tel:${exp.contactInfo.phone}" class="contact-link">${exp.contactInfo.phone}</a>
                </div>
              ` : ''}
              ${exp.contactInfo.website ? `
                <div class="contact-item">
                  <span class="contact-icon">🌐</span>
                  <a href="${exp.contactInfo.website}" target="_blank" rel="noopener" class="contact-link">Visit Website</a>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create details tab content
   */
  createDetailsTab() {
    const exp = this.experience;
    
    return `
      <div class="tab-details">
        <div class="details-grid">
          <div class="detail-section">
            <h3>Experience Information</h3>
            <div class="detail-items">
              <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${window.ExploreXUtils.StringUtils.toTitleCase(exp.type.replace(/_/g, ' '))}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Address:</span>
                <span class="detail-value">${exp.address.toString()}</span>
              </div>
              ${exp.distance ? `
                <div class="detail-item">
                  <span class="detail-label">Distance:</span>
                  <span class="detail-value">${window.ExploreXUtils.NumberUtils.round(exp.distance, 1)} miles away</span>
                </div>
              ` : ''}
              <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">${window.ExploreXUtils.DateUtils.formatDate(new Date(exp.lastUpdated))}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Pricing Information</h3>
            <div class="pricing-details">
              ${exp.admissionFee.isFree ? `
                <div class="price-item free">
                  <span class="price-label">Admission:</span>
                  <span class="price-value">Free</span>
                </div>
              ` : `
                <div class="price-item">
                  <span class="price-label">Adult:</span>
                  <span class="price-value">${exp.admissionFee.formatPrice('adult')}</span>
                </div>
                ${exp.admissionFee.childPrice > 0 ? `
                  <div class="price-item">
                    <span class="price-label">Child:</span>
                    <span class="price-value">${exp.admissionFee.formatPrice('child')}</span>
                  </div>
                ` : ''}
                ${exp.admissionFee.seniorPrice > 0 ? `
                  <div class="price-item">
                    <span class="price-label">Senior:</span>
                    <span class="price-value">${exp.admissionFee.formatPrice('senior')}</span>
                  </div>
                ` : ''}
                ${exp.admissionFee.studentPrice > 0 ? `
                  <div class="price-item">
                    <span class="price-label">Student:</span>
                    <span class="price-value">${exp.admissionFee.formatPrice('student')}</span>
                  </div>
                ` : ''}
              `}
              ${exp.admissionFee.notes ? `
                <div class="price-notes">
                  <p>${exp.admissionFee.notes}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Operating Hours</h3>
            <div class="hours-table">
              ${this.createDetailedOperatingHours(exp.operatingHours)}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Amenities & Features</h3>
            <div class="amenities-grid">
              ${exp.amenities.map(amenity => `
                <div class="amenity-item">
                  <span class="amenity-icon">${this.getAmenityIcon(amenity)}</span>
                  <span class="amenity-label">${this.formatAmenity(amenity)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Accessibility Features</h3>
            <div class="accessibility-features">
              ${this.createDetailedAccessibilityInfo(exp.accessibility)}
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Tags</h3>
            <div class="tags-list">
              ${exp.tags.map(tag => `
                <span class="tag-item">${tag.replace(/_/g, ' ')}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create photos tab content
   */
  createPhotosTab() {
    const photos = this.getExperiencePhotos(this.experience);
    
    return `
      <div class="tab-photos">
        <div class="photo-gallery">
          <div class="gallery-main">
            <div class="main-photo-container">
              <img class="main-photo" 
                   src="${photos[0].url}" 
                   alt="${photos[0].caption || this.experience.name}"
                   onclick="this.openPhotoViewer(0)" />
              ${photos.length > 1 ? `
                <button class="photo-nav photo-prev" onclick="this.previousPhoto()">‹</button>
                <button class="photo-nav photo-next" onclick="this.nextPhoto()">›</button>
                <div class="photo-counter">1 / ${photos.length}</div>
              ` : ''}
            </div>
          </div>
          
          ${photos.length > 1 ? `
            <div class="gallery-thumbnails">
              ${photos.map((photo, index) => `
                <div class="thumbnail-item ${index === 0 ? 'active' : ''}" 
                     onclick="this.selectPhoto(${index})">
                  <img src="${photo.thumbnailUrl || photo.url}" 
                       alt="${photo.caption || `Photo ${index + 1}`}" />
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="photo-info">
          <h4>About the Photos</h4>
          <p>High-quality images showcasing the experience, facilities, and atmosphere.</p>
          <div class="photo-actions">
            <button class="photo-action-button" onclick="this.downloadPhoto()">
              <span class="button-icon">💾</span>
              <span class="button-text">Download</span>
            </button>
            <button class="photo-action-button" onclick="this.sharePhoto()">
              <span class="button-icon">📤</span>
              <span class="button-text">Share Photo</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create reviews tab content
   */
  createReviewsTab() {
    const exp = this.experience;
    const stars = '★'.repeat(Math.floor(exp.rating)) + '☆'.repeat(5 - Math.floor(exp.rating));
    
    return `
      <div class="tab-reviews">
        <div class="reviews-summary">
          <div class="rating-overview">
            <div class="overall-rating">
              <span class="rating-number">${exp.rating}</span>
              <div class="rating-stars">${stars}</div>
              <span class="rating-text">Based on ${exp.reviewCount} reviews</span>
            </div>
            <div class="rating-breakdown">
              ${this.createRatingDistribution(exp)}
            </div>
          </div>
        </div>
        
        <div class="add-review-section">
          <h4>Share Your Experience</h4>
          <div class="review-form">
            <div class="rating-input">
              <span class="rating-label">Your Rating:</span>
              <div class="star-rating">
                ${[1,2,3,4,5].map(star => `
                  <button class="star-button" data-rating="${star}" onclick="this.setRating(${star})">★</button>
                `).join('')}
              </div>
            </div>
            <textarea class="review-textarea" 
                      placeholder="Tell others about your experience..." 
                      maxlength="500"></textarea>
            <button class="submit-review-button" onclick="this.submitReview()">
              <span class="button-icon">📝</span>
              <span class="button-text">Submit Review</span>
            </button>
          </div>
        </div>
        
        <div class="reviews-list">
          <div class="reviews-header">
            <h4>Recent Reviews</h4>
            <div class="reviews-filters">
              <select class="review-sort">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>
          </div>
          <div class="reviews-content">
            ${this.createReviewsList(exp)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create contact tab content
   */
  createContactTab() {
    const exp = this.experience;
    
    return `
      <div class="tab-contact">
        <div class="contact-grid">
          <div class="contact-section">
            <h3>Contact Information</h3>
            <div class="contact-details">
              ${exp.contactInfo.phone ? `
                <div class="contact-item">
                  <span class="contact-icon">📞</span>
                  <div class="contact-content">
                    <span class="contact-label">Phone:</span>
                    <a href="tel:${exp.contactInfo.phone}" class="contact-link">${exp.contactInfo.phone}</a>
                  </div>
                </div>
              ` : ''}
              
              ${exp.contactInfo.email ? `
                <div class="contact-item">
                  <span class="contact-icon">✉️</span>
                  <div class="contact-content">
                    <span class="contact-label">Email:</span>
                    <a href="mailto:${exp.contactInfo.email}" class="contact-link">${exp.contactInfo.email}</a>
                  </div>
                </div>
              ` : ''}
              
              ${exp.contactInfo.website ? `
                <div class="contact-item">
                  <span class="contact-icon">🌐</span>
                  <div class="contact-content">
                    <span class="contact-label">Website:</span>
                    <a href="${exp.contactInfo.website}" target="_blank" rel="noopener" class="contact-link">Visit Website</a>
                  </div>
                </div>
              ` : ''}
              
              <div class="contact-item">
                <span class="contact-icon">📍</span>
                <div class="contact-content">
                  <span class="contact-label">Address:</span>
                  <span class="contact-text">${exp.address.toString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="contact-section">
            <h3>Location & Directions</h3>
            <div class="location-info">
              <div class="map-placeholder">
                <div class="map-icon">🗺️</div>
                <div class="map-text">Interactive map</div>
                <div class="coordinates">${exp.location.latitude.toFixed(4)}, ${exp.location.longitude.toFixed(4)}</div>
              </div>
              <div class="directions-buttons">
                <button class="directions-button" onclick="this.getDirections('driving')">
                  <span class="button-icon">🚗</span>
                  <span class="button-text">Driving</span>
                </button>
                <button class="directions-button" onclick="this.getDirections('transit')">
                  <span class="button-icon">🚌</span>
                  <span class="button-text">Transit</span>
                </button>
                <button class="directions-button" onclick="this.getDirections('walking')">
                  <span class="button-icon">🚶</span>
                  <span class="button-text">Walking</span>
                </button>
              </div>
            </div>
          </div>
          
          <div class="contact-section">
            <h3>Quick Actions</h3>
            <div class="quick-actions-grid">
              <button class="quick-action-button" onclick="this.bookExperience()">
                <span class="button-icon">🎫</span>
                <span class="button-text">Book Tickets</span>
              </button>
              <button class="quick-action-button" onclick="this.addToItinerary()">
                <span class="button-icon">📅</span>
                <span class="button-text">Add to Itinerary</span>
              </button>
              <button class="quick-action-button" onclick="this.shareExperience()">
                <span class="button-icon">📤</span>
                <span class="button-text">Share</span>
              </button>
              <button class="quick-action-button" onclick="this.reportIssue()">
                <span class="button-icon">⚠️</span>
                <span class="button-text">Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="overview-content">
          <div class="overview-main">
            <div class="experience-rating-large">
              <div class="rating-display">
                <span class="rating-stars-large">${stars}</span>
                <span class="rating-value-large">${exp.rating}</span>
              </div>
              <div class="rating-details">
                <span class="rating-count">${window.ExploreXUtils.NumberUtils.formatNumber(exp.reviewCount)} reviews</span>
                <span class="rating-separator">•</span>
                <span class="experience-category">${typeDisplay}</span>
              </div>
            </div>
            
            <div class="experience-description-full">
              <h3>About This Experience</h3>
              <p>${exp.description}</p>
            </div>
            
            <div class="experience-highlights">
              <h4>Highlights</h4>
              <div class="highlights-grid">
                <div class="highlight-item">
                  <span class="highlight-icon">📍</span>
                  <div class="highlight-content">
                    <div class="highlight-label">Location</div>
                    <div class="highlight-value">${exp.address.city}, ${exp.address.state}</div>
                  </div>
                </div>
                
                <div class="highlight-item">
                  <span class="highlight-icon">💰</span>
                  <div class="highlight-content">
                    <div class="highlight-label">Admission</div>
                    <div class="highlight-value">${exp.admissionFee.formatPrice()}</div>
                  </div>
                </div>
                
                <div class="highlight-item">
                  <span class="highlight-icon">⏰</span>
                  <div class="highlight-content">
                    <div class="highlight-label">Hours</div>
                    <div class="highlight-value">${this.getQuickHours(exp.operatingHours)}</div>
                  </div>
                </div>
                
                <div class="highlight-item">
                  <span class="highlight-icon">♿</span>
                  <div class="highlight-content">
                    <div class="highlight-label">Accessibility</div>
                    <div class="highlight-value">${exp.accessibility.wheelchairAccessible ? 'Wheelchair Accessible' : 'Limited Access'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="overview-sidebar">
            <div class="quick-actions">
              <button class="action-button primary" onclick="window.exploreXApp.getDirections('${exp.address.formattedAddress}')">
                <span class="button-icon">🗺️</span>
                <span class="button-text">Get Directions</span>
              </button>
              
              <button class="action-button secondary" onclick="window.exploreXApp.saveExperience('${exp.id}')">
                <span class="button-icon">❤️</span>
                <span class="button-text">Save</span>
              </button>
              
              <button class="action-button secondary" onclick="window.exploreXApp.shareExperience('${exp.id}')">
                <span class="button-icon">📤</span>
                <span class="button-text">Share</span>
              </button>
            </div>
            
            <div class="quick-info">
              <div class="info-section">
                <h5>Quick Info</h5>
                <div class="info-items">
                  <div class="info-item">
                    <span class="info-label">Type:</span>
                    <span class="info-value">${typeDisplay}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Rating:</span>
                    <span class="info-value">${exp.rating}/5 ⭐</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Price:</span>
                    <span class="info-value">${exp.admissionFee.formatPrice()}</span>
                  </div>
                  ${exp.distance ? `
                    <div class="info-item">
                      <span class="info-label">Distance:</span>
                      <span class="info-value">${window.ExploreXUtils.NumberUtils.round(exp.distance, 1)} miles</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create details tab content
   */
  createDetailsTab() {
    const exp = this.experience;
    
    return `
      <div class="tab-details">
        <div class="details-grid">
          <div class="detail-section">
            <h4>📍 Location & Address</h4>
            <div class="location-info">
              <div class="address-display">
                <div class="address-main">${exp.address.formattedAddress}</div>
                <div class="address-coordinates">
                  ${exp.location.latitude.toFixed(4)}, ${exp.location.longitude.toFixed(4)}
                </div>
              </div>
              <button class="map-button" onclick="window.exploreXApp.showMap('${exp.id}')">
                <span class="button-icon">🗺️</span>
                <span class="button-text">View on Map</span>
              </button>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>⏰ Operating Hours</h4>
            <div class="hours-display">
              ${this.formatDetailedHours(exp.operatingHours)}
            </div>
          </div>
          
          <div class="detail-section">
            <h4>💰 Pricing Information</h4>
            <div class="pricing-display">
              ${this.formatDetailedPricing(exp.admissionFee)}
            </div>
          </div>
          
          <div class="detail-section">
            <h4>🎯 Amenities & Features</h4>
            <div class="amenities-display">
              ${exp.amenities.map(amenity => `
                <div class="amenity-item">
                  <span class="amenity-icon">${this.getAmenityIcon(amenity)}</span>
                  <span class="amenity-label">${this.formatAmenity(amenity)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="detail-section">
            <h4>♿ Accessibility Features</h4>
            <div class="accessibility-display">
              ${this.formatDetailedAccessibility(exp.accessibility)}
            </div>
          </div>
          
          <div class="detail-section">
            <h4>🏷️ Tags & Categories</h4>
            <div class="tags-display">
              ${exp.tags.map(tag => `
                <span class="tag-item">${tag}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create photos tab content
   */
  createPhotosTab() {
    const exp = this.experience;
    
    // Generate sample photos for demonstration
    const samplePhotos = this.generateSamplePhotos(exp);
    
    return `
      <div class="tab-photos">
        <div class="photos-header">
          <h4>📸 Photo Gallery</h4>
          <div class="photos-count">${samplePhotos.length} photos</div>
        </div>
        
        <div class="photo-gallery" id="photoGallery">
          <div class="main-photo">
            <img src="${samplePhotos[0]?.url}" alt="${exp.name}" class="main-photo-img" id="mainPhoto">
            <div class="photo-controls">
              <button class="photo-control" onclick="this.previousPhoto()">‹</button>
              <button class="photo-control" onclick="this.nextPhoto()">›</button>
              <button class="photo-control fullscreen" onclick="this.toggleFullscreen()">⛶</button>
            </div>
          </div>
          
          <div class="photo-thumbnails">
            ${samplePhotos.map((photo, index) => `
              <div class="photo-thumbnail ${index === 0 ? 'active' : ''}" 
                   data-index="${index}" 
                   onclick="this.selectPhoto(${index})">
                <img src="${photo.url}" alt="${photo.caption || exp.name}">
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="photo-info">
          <div class="photo-caption" id="photoCaption">
            ${samplePhotos[0]?.caption || 'Explore this amazing space experience'}
          </div>
          <div class="photo-credit" id="photoCredit">
            ${samplePhotos[0]?.photographer ? `Photo by ${samplePhotos[0].photographer}` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create reviews tab content
   */
  createReviewsTab() {
    const exp = this.experience;
    const sampleReviews = this.generateSampleReviews(exp);
    
    return `
      <div class="tab-reviews">
        <div class="reviews-header">
          <div class="reviews-summary">
            <div class="rating-overview">
              <div class="rating-large">${exp.rating}</div>
              <div class="rating-details">
                <div class="stars-large">${'★'.repeat(Math.floor(exp.rating))}${'☆'.repeat(5 - Math.floor(exp.rating))}</div>
                <div class="reviews-count">${exp.reviewCount} reviews</div>
              </div>
            </div>
            
            <div class="rating-breakdown">
              ${this.createRatingBreakdown(exp)}
            </div>
          </div>
          
          <div class="reviews-actions">
            <button class="review-button primary" onclick="this.writeReview()">
              <span class="button-icon">✍️</span>
              <span class="button-text">Write a Review</span>
            </button>
          </div>
        </div>
        
        <div class="reviews-filters">
          <select class="review-sort">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
          
          <div class="rating-filters">
            <button class="rating-filter active" data-rating="all">All</button>
            <button class="rating-filter" data-rating="5">5★</button>
            <button class="rating-filter" data-rating="4">4★</button>
            <button class="rating-filter" data-rating="3">3★</button>
            <button class="rating-filter" data-rating="2">2★</button>
            <button class="rating-filter" data-rating="1">1★</button>
          </div>
        </div>
        
        <div class="reviews-list">
          ${sampleReviews.map(review => this.createReviewItem(review)).join('')}
        </div>
        
        <div class="reviews-pagination">
          <button class="pagination-button" disabled>Previous</button>
          <span class="pagination-info">1 of 3 pages</span>
          <button class="pagination-button">Next</button>
        </div>
      </div>
    `;
  }

  /**
   * Create contact tab content
   */
  createContactTab() {
    const exp = this.experience;
    
    return `
      <div class="tab-contact">
        <div class="contact-grid">
          <div class="contact-section">
            <h4>📞 Contact Information</h4>
            <div class="contact-methods">
              ${exp.contactInfo.phone ? `
                <div class="contact-method">
                  <span class="contact-icon">📞</span>
                  <div class="contact-details">
                    <div class="contact-label">Phone</div>
                    <div class="contact-value">
                      <a href="tel:${exp.contactInfo.phone}">${exp.contactInfo.phone}</a>
                    </div>
                  </div>
                </div>
              ` : ''}
              
              ${exp.contactInfo.email ? `
                <div class="contact-method">
                  <span class="contact-icon">📧</span>
                  <div class="contact-details">
                    <div class="contact-label">Email</div>
                    <div class="contact-value">
                      <a href="mailto:${exp.contactInfo.email}">${exp.contactInfo.email}</a>
                    </div>
                  </div>
                </div>
              ` : ''}
              
              ${exp.contactInfo.website ? `
                <div class="contact-method">
                  <span class="contact-icon">🌐</span>
                  <div class="contact-details">
                    <div class="contact-label">Website</div>
                    <div class="contact-value">
                      <a href="${exp.contactInfo.website}" target="_blank" rel="noopener">Visit Website</a>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="contact-section">
            <h4>🗺️ Directions & Transportation</h4>
            <div class="directions-info">
              <div class="address-full">
                <div class="address-text">${exp.address.formattedAddress}</div>
                <button class="directions-button" onclick="window.exploreXApp.getDirections('${exp.address.formattedAddress}')">
                  <span class="button-icon">🗺️</span>
                  <span class="button-text">Get Directions</span>
                </button>
              </div>
              
              <div class="transportation-options">
                <div class="transport-option">
                  <span class="transport-icon">🚗</span>
                  <span class="transport-label">Driving directions available</span>
                </div>
                <div class="transport-option">
                  <span class="transport-icon">🚌</span>
                  <span class="transport-label">Public transit options</span>
                </div>
                ${exp.amenities.includes('parking') ? `
                  <div class="transport-option">
                    <span class="transport-icon">🅿️</span>
                    <span class="transport-label">Parking available</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          
          <div class="contact-section">
            <h4>ℹ️ Visitor Information</h4>
            <div class="visitor-info">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-icon">🎫</span>
                  <div class="info-content">
                    <div class="info-label">Tickets</div>
                    <div class="info-value">${exp.admissionFee.isFree ? 'Free admission' : 'Tickets required'}</div>
                  </div>
                </div>
                
                <div class="info-item">
                  <span class="info-icon">👥</span>
                  <div class="info-content">
                    <div class="info-label">Group Visits</div>
                    <div class="info-value">${exp.amenities.includes('guided_tours') ? 'Group tours available' : 'Individual visits'}</div>
                  </div>
                </div>
                
                <div class="info-item">
                  <span class="info-icon">📷</span>
                  <div class="info-content">
                    <div class="info-label">Photography</div>
                    <div class="info-value">Photography allowed</div>
                  </div>
                </div>
                
                <div class="info-item">
                  <span class="info-icon">🍽️</span>
                  <div class="info-content">
                    <div class="info-label">Dining</div>
                    <div class="info-value">${exp.amenities.includes('restaurant') ? 'Restaurant on-site' : 'No dining facilities'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="contact-section">
            <h4>📱 Social & Sharing</h4>
            <div class="social-sharing">
              <div class="share-buttons">
                <button class="share-button facebook" onclick="this.shareToFacebook()">
                  <span class="share-icon">📘</span>
                  <span class="share-label">Facebook</span>
                </button>
                
                <button class="share-button twitter" onclick="this.shareToTwitter()">
                  <span class="share-icon">🐦</span>
                  <span class="share-label">Twitter</span>
                </button>
                
                <button class="share-button email" onclick="this.shareByEmail()">
                  <span class="share-icon">📧</span>
                  <span class="share-label">Email</span>
                </button>
                
                <button class="share-button copy" onclick="this.copyLink()">
                  <span class="share-icon">🔗</span>
                  <span class="share-label">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }  /**
 
  * Create modal footer with action buttons
   */
  createModalFooter() {
    const exp = this.experience;
    
    const footer = document.createElement('div');
    footer.className = 'experience-modal-footer';
    
    footer.innerHTML = `
      <div class="footer-actions">
        <button class="footer-button secondary" onclick="window.exploreXApp.saveExperience('${exp.id}')">
          <span class="button-icon">❤️</span>
          <span class="button-text">Save</span>
        </button>
        
        <button class="footer-button secondary" onclick="window.exploreXApp.shareExperience('${exp.id}')">
          <span class="button-icon">📤</span>
          <span class="button-text">Share</span>
        </button>
        
        <button class="footer-button primary" onclick="window.exploreXApp.getDirections('${exp.address.formattedAddress}')">
          <span class="button-icon">🗺️</span>
          <span class="button-text">Get Directions</span>
        </button>
      </div>
    `;
    
    return footer;
  }

  /**
   * Initialize modal components after opening
   */
  initializeComponents() {
    this.setupTabNavigation();
    this.setupPhotoGallery();
    this.setupReviewsInteraction();
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    const tabs = this.element.querySelectorAll('.modal-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId) {
    if (tabId === this.currentTab) return;
    
    this.currentTab = tabId;
    
    // Update tab buttons
    const tabs = this.element.querySelectorAll('.modal-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update tab content
    const contentContainer = this.element.querySelector('.modal-tab-content');
    if (contentContainer) {
      contentContainer.innerHTML = this.createTabContent();
      
      // Reinitialize components for new tab
      if (tabId === 'photos') {
        this.setupPhotoGallery();
      } else if (tabId === 'reviews') {
        this.setupReviewsInteraction();
      }
    }
  }

  /**
   * Setup photo gallery functionality
   */
  setupPhotoGallery() {
    const gallery = this.element.querySelector('#photoGallery');
    if (!gallery) return;
    
    this.currentPhotoIndex = 0;
    this.photos = this.generateSamplePhotos(this.experience);
    
    // Setup thumbnail clicks
    const thumbnails = gallery.querySelectorAll('.photo-thumbnail');
    thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => {
        this.selectPhoto(index);
      });
    });
    
    // Setup keyboard navigation
    document.addEventListener('keydown', this.handlePhotoKeydown.bind(this));
  }

  /**
   * Select a photo in the gallery
   */
  selectPhoto(index) {
    if (index < 0 || index >= this.photos.length) return;
    
    this.currentPhotoIndex = index;
    const photo = this.photos[index];
    
    // Update main photo
    const mainPhoto = this.element.querySelector('#mainPhoto');
    if (mainPhoto) {
      mainPhoto.src = photo.url;
      mainPhoto.alt = photo.caption || this.experience.name;
    }
    
    // Update thumbnails
    const thumbnails = this.element.querySelectorAll('.photo-thumbnail');
    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
    
    // Update photo info
    const caption = this.element.querySelector('#photoCaption');
    const credit = this.element.querySelector('#photoCredit');
    
    if (caption) {
      caption.textContent = photo.caption || 'Explore this amazing space experience';
    }
    
    if (credit) {
      credit.textContent = photo.photographer ? `Photo by ${photo.photographer}` : '';
    }
  }

  /**
   * Navigate to previous photo
   */
  previousPhoto() {
    const newIndex = this.currentPhotoIndex > 0 ? this.currentPhotoIndex - 1 : this.photos.length - 1;
    this.selectPhoto(newIndex);
  }

  /**
   * Navigate to next photo
   */
  nextPhoto() {
    const newIndex = this.currentPhotoIndex < this.photos.length - 1 ? this.currentPhotoIndex + 1 : 0;
    this.selectPhoto(newIndex);
  }

  /**
   * Handle keyboard navigation for photos
   */
  handlePhotoKeydown(event) {
    if (this.currentTab !== 'photos' || !this.isOpen) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previousPhoto();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextPhoto();
        break;
    }
  }

  /**
   * Setup reviews interaction
   */
  setupReviewsInteraction() {
    // Setup rating filters
    const ratingFilters = this.element.querySelectorAll('.rating-filter');
    ratingFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        ratingFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        this.filterReviews(filter.dataset.rating);
      });
    });
    
    // Setup sort dropdown
    const sortSelect = this.element.querySelector('.review-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortReviews(sortSelect.value);
      });
    }
  }

  /**
   * Filter reviews by rating
   */
  filterReviews(rating) {
    // Implementation for filtering reviews
    console.log('Filtering reviews by rating:', rating);
  }

  /**
   * Sort reviews by criteria
   */
  sortReviews(criteria) {
    // Implementation for sorting reviews
    console.log('Sorting reviews by:', criteria);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  getExperienceImage(experience) {
    const imageMap = {
      observatory: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=400&fit=crop',
      planetarium: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800&h=400&fit=crop',
      space_center: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&h=400&fit=crop',
      space_museum: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=400&fit=crop',
      science_center: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    };
    
    return imageMap[experience.type] || imageMap.observatory;
  }

  getTypeIcon(type) {
    const iconMap = {
      observatory: '🔭',
      planetarium: '🌌',
      space_center: '🚀',
      space_museum: '🏛️',
      science_center: '🔬',
      astronomy_lab: '🧪',
      stargazing_site: '✨'
    };
    
    return iconMap[type] || '📍';
  }

  getQuickHours(hours) {
    if (!hours || hours.length === 0) return 'Hours vary';
    
    const today = new Date().getDay();
    const todayHours = hours.find(h => h.dayOfWeek === today);
    
    if (todayHours) {
      return todayHours.isClosed ? 'Closed today' : `${todayHours.openTime} - ${todayHours.closeTime}`;
    }
    
    return 'See details';
  }

  formatDetailedHours(hours) {
    if (!hours || hours.length === 0) {
      return '<p class="no-hours">Operating hours not available</p>';
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return hours.map(hour => {
      const dayName = dayNames[hour.dayOfWeek];
      const isToday = new Date().getDay() === hour.dayOfWeek;
      
      return `
        <div class="hours-row ${isToday ? 'today' : ''}">
          <span class="day-name">${dayName}</span>
          <span class="day-hours">
            ${hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
          </span>
        </div>
      `;
    }).join('');
  }

  formatDetailedPricing(pricing) {
    if (pricing.isFree) {
      return '<div class="pricing-free">🆓 Free Admission</div>';
    }
    
    const prices = [];
    if (pricing.adultPrice > 0) prices.push(`Adults: ${pricing.formatPrice('adult')}`);
    if (pricing.childPrice > 0) prices.push(`Children: ${pricing.formatPrice('child')}`);
    if (pricing.seniorPrice > 0) prices.push(`Seniors: ${pricing.formatPrice('senior')}`);
    if (pricing.studentPrice > 0) prices.push(`Students: ${pricing.formatPrice('student')}`);
    
    return `
      <div class="pricing-list">
        ${prices.map(price => `<div class="price-item">${price}</div>`).join('')}
        ${pricing.notes ? `<div class="pricing-notes">${pricing.notes}</div>` : ''}
      </div>
    `;
  }

  formatDetailedAccessibility(accessibility) {
    const features = [];
    
    if (accessibility.wheelchairAccessible) features.push('♿ Wheelchair accessible entrances and facilities');
    if (accessibility.hearingImpairedSupport) features.push('🦻 Assistive listening devices available');
    if (accessibility.visualImpairedSupport) features.push('👁️ Audio descriptions and tactile exhibits');
    if (accessibility.signLanguageAvailable) features.push('🤟 Sign language interpretation available');
    if (accessibility.assistiveListening) features.push('🎧 Assistive listening systems');
    
    if (features.length === 0) {
      return '<div class="no-accessibility">Accessibility information not available</div>';
    }
    
    return features.map(feature => `<div class="accessibility-item">${feature}</div>`).join('');
  }

  getAmenityIcon(amenity) {
    const iconMap = {
      parking: '🅿️',
      restaurant: '🍽️',
      gift_shop: '🛍️',
      restrooms: '🚻',
      wheelchair_accessible: '♿',
      guided_tours: '👥',
      telescope_viewing: '🔭',
      planetarium: '🌌',
      imax_theater: '🎬',
      visitor_center: 'ℹ️'
    };
    
    return iconMap[amenity] || '✨';
  }

  formatAmenity(amenity) {
    const amenityMap = {
      parking: 'Parking Available',
      restaurant: 'Restaurant & Dining',
      gift_shop: 'Gift Shop',
      restrooms: 'Restrooms',
      wheelchair_accessible: 'Wheelchair Accessible',
      guided_tours: 'Guided Tours',
      telescope_viewing: 'Telescope Viewing',
      planetarium: 'Planetarium Shows',
      imax_theater: 'IMAX Theater',
      visitor_center: 'Visitor Center'
    };
    
    return amenityMap[amenity] || amenity.replace(/_/g, ' ');
  }

  generateSamplePhotos(experience) {
    const baseImages = {
      observatory: [
        'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=400&fit=crop'
      ],
      planetarium: [
        'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=400&fit=crop'
      ],
      space_center: [
        'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=400&fit=crop'
      ]
    };
    
    const images = baseImages[experience.type] || baseImages.observatory;
    
    return images.map((url, index) => ({
      url,
      caption: `${experience.name} - View ${index + 1}`,
      photographer: index === 0 ? 'NASA' : `Photographer ${index + 1}`
    }));
  }

  generateSampleReviews(experience) {
    return [
      {
        id: 1,
        author: 'Sarah M.',
        rating: 5,
        date: '2 weeks ago',
        title: 'Amazing experience!',
        content: 'Absolutely loved visiting this place. The staff was knowledgeable and the exhibits were fascinating. Perfect for space enthusiasts of all ages.',
        helpful: 12,
        verified: true
      },
      {
        id: 2,
        author: 'Mike R.',
        rating: 4,
        date: '1 month ago',
        title: 'Great for families',
        content: 'Took my kids here and they had a blast. The interactive exhibits kept them engaged for hours. Only downside was the parking situation.',
        helpful: 8,
        verified: true
      },
      {
        id: 3,
        author: 'Jennifer L.',
        rating: 5,
        date: '2 months ago',
        title: 'Educational and fun',
        content: 'Perfect blend of education and entertainment. The planetarium show was spectacular and the telescope viewing was a highlight.',
        helpful: 15,
        verified: false
      }
    ];
  }

  createRatingBreakdown(experience) {
    // Generate sample rating distribution
    const distribution = [
      { stars: 5, count: Math.floor(experience.reviewCount * 0.6) },
      { stars: 4, count: Math.floor(experience.reviewCount * 0.25) },
      { stars: 3, count: Math.floor(experience.reviewCount * 0.1) },
      { stars: 2, count: Math.floor(experience.reviewCount * 0.03) },
      { stars: 1, count: Math.floor(experience.reviewCount * 0.02) }
    ];
    
    return distribution.map(item => {
      const percentage = (item.count / experience.reviewCount) * 100;
      return `
        <div class="rating-bar">
          <span class="rating-label">${item.stars}★</span>
          <div class="rating-progress">
            <div class="rating-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="rating-count">${item.count}</span>
        </div>
      `;
    }).join('');
  }

  createReviewItem(review) {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    return `
      <div class="review-item">
        <div class="review-header">
          <div class="review-author">
            <div class="author-avatar">${review.author.charAt(0)}</div>
            <div class="author-info">
              <div class="author-name">
                ${review.author}
                ${review.verified ? '<span class="verified-badge">✓</span>' : ''}
              </div>
              <div class="review-date">${review.date}</div>
            </div>
          </div>
          <div class="review-rating">
            <span class="review-stars">${stars}</span>
          </div>
        </div>
        
        <div class="review-content">
          <h5 class="review-title">${review.title}</h5>
          <p class="review-text">${review.content}</p>
        </div>
        
        <div class="review-footer">
          <button class="review-action">
            <span class="action-icon">👍</span>
            <span class="action-text">Helpful (${review.helpful})</span>
          </button>
          <button class="review-action">
            <span class="action-icon">📤</span>
            <span class="action-text">Share</span>
          </button>
        </div>
      </div>
    `;
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

if (typeof window !== 'undefined') {
  window.ExploreXExperienceModal = {
    ExperienceDetailModal,
    ExperienceModalConfig
  };
} else {
  module.exports = {
    ExperienceDetailModal,
    ExperienceModalConfig
  };
}

console.log('✅ ExploreX Experience Modal loaded successfully');  }

  /**

   * Create modal footer with main actions
   */
  createModalFooter() {
    const footer = document.createElement('div');
    footer.className = 'modal-footer-actions';
    
    footer.innerHTML = `
      <button class="footer-button secondary" onclick="this.addToItinerary()">
        <span class="button-icon">📅</span>
        <span class="button-text">Add to Itinerary</span>
      </button>
      <button class="footer-button secondary" onclick="this.bookExperience()">
        <span class="button-icon">🎫</span>
        <span class="button-text">Book Now</span>
      </button>
      <button class="footer-button primary" onclick="this.getDirections()">
        <span class="button-icon">🗺️</span>
        <span class="button-text">Get Directions</span>
      </button>
    `;
    
    return footer;
  }

  // ===========================================================================
  // COMPONENT INITIALIZATION
  // ===========================================================================

  /**
   * Initialize interactive components
   */
  initializeComponents() {
    this.setupTabNavigation();
    this.setupPhotoGallery();
    this.setupReviewSystem();
    this.setupEventHandlers();
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    const tabButtons = this.element.querySelectorAll('.modal-tab');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  /**
   * Setup photo gallery
   */
  setupPhotoGallery() {
    this.currentPhotoIndex = 0;
    this.photos = this.getExperiencePhotos(this.experience);
  }

  /**
   * Setup review system
   */
  setupReviewSystem() {
    this.userRating = 0;
    this.setupStarRating();
  }

  /**
   * Setup star rating interaction
   */
  setupStarRating() {
    const starButtons = this.element.querySelectorAll('.star-button');
    starButtons.forEach((star, index) => {
      star.addEventListener('mouseover', () => {
        this.highlightStars(index + 1);
      });
      star.addEventListener('mouseout', () => {
        this.highlightStars(this.userRating);
      });
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      
      if (e.key === 'ArrowLeft') {
        this.previousPhoto();
      } else if (e.key === 'ArrowRight') {
        this.nextPhoto();
      }
    });
  }

  // ===========================================================================
  // TAB NAVIGATION
  // ===========================================================================

  /**
   * Switch to different tab
   */
  switchTab(tabId) {
    this.currentTab = tabId;
    
    // Update tab buttons
    const tabButtons = this.element.querySelectorAll('.modal-tab');
    tabButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabId);
    });
    
    // Update tab content
    const tabContent = this.element.querySelector('.modal-tab-content');
    tabContent.innerHTML = this.createTabContent();
    
    // Reinitialize components for new tab
    if (tabId === 'photos') {
      this.setupPhotoGallery();
    } else if (tabId === 'reviews') {
      this.setupReviewSystem();
    }
  }

  // ===========================================================================
  // PHOTO GALLERY FUNCTIONALITY
  // ===========================================================================

  /**
   * Get experience photos
   */
  getExperiencePhotos(experience) {
    // In production, this would fetch from API
    const defaultPhoto = this.getExperienceImage(experience);
    
    return [
      {
        url: defaultPhoto,
        thumbnailUrl: defaultPhoto,
        caption: experience.name
      },
      // Add more photos if available
      {
        url: defaultPhoto,
        thumbnailUrl: defaultPhoto,
        caption: `${experience.name} - Interior View`
      },
      {
        url: defaultPhoto,
        thumbnailUrl: defaultPhoto,
        caption: `${experience.name} - Exterior View`
      }
    ];
  }

  /**
   * Navigate to previous photo
   */
  previousPhoto() {
    if (this.photos.length <= 1) return;
    
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.photos.length) % this.photos.length;
    this.updatePhotoDisplay();
  }

  /**
   * Navigate to next photo
   */
  nextPhoto() {
    if (this.photos.length <= 1) return;
    
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photos.length;
    this.updatePhotoDisplay();
  }

  /**
   * Select specific photo
   */
  selectPhoto(index) {
    this.currentPhotoIndex = index;
    this.updatePhotoDisplay();
  }

  /**
   * Update photo display
   */
  updatePhotoDisplay() {
    const mainPhoto = this.element.querySelector('.main-photo');
    const counter = this.element.querySelector('.photo-counter');
    const thumbnails = this.element.querySelectorAll('.thumbnail-item');
    
    if (mainPhoto) {
      mainPhoto.src = this.photos[this.currentPhotoIndex].url;
      mainPhoto.alt = this.photos[this.currentPhotoIndex].caption;
    }
    
    if (counter) {
      counter.textContent = `${this.currentPhotoIndex + 1} / ${this.photos.length}`;
    }
    
    thumbnails.forEach((thumb, index) => {
      thumb.classList.toggle('active', index === this.currentPhotoIndex);
    });
  }

  /**
   * Open photo viewer (fullscreen)
   */
  openPhotoViewer(index) {
    // Create fullscreen photo viewer
    const viewer = document.createElement('div');
    viewer.className = 'photo-viewer-overlay';
    viewer.innerHTML = `
      <div class="photo-viewer">
        <button class="photo-viewer-close" onclick="this.closePhotoViewer()">×</button>
        <img class="photo-viewer-image" 
             src="${this.photos[index].url}" 
             alt="${this.photos[index].caption}" />
        <div class="photo-viewer-caption">${this.photos[index].caption}</div>
        ${this.photos.length > 1 ? `
          <button class="photo-viewer-nav photo-viewer-prev" onclick="this.previousPhoto()">‹</button>
          <button class="photo-viewer-nav photo-viewer-next" onclick="this.nextPhoto()">›</button>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(viewer);
    this.photoViewer = viewer;
  }

  /**
   * Close photo viewer
   */
  closePhotoViewer() {
    if (this.photoViewer) {
      document.body.removeChild(this.photoViewer);
      this.photoViewer = null;
    }
  }

  // ===========================================================================
  // REVIEW SYSTEM
  // ===========================================================================

  /**
   * Set user rating
   */
  setRating(rating) {
    this.userRating = rating;
    this.highlightStars(rating);
  }

  /**
   * Highlight stars up to rating
   */
  highlightStars(rating) {
    const starButtons = this.element.querySelectorAll('.star-button');
    starButtons.forEach((star, index) => {
      star.classList.toggle('active', index < rating);
    });
  }

  /**
   * Submit user review
   */
  async submitReview() {
    const reviewText = this.element.querySelector('.review-textarea').value.trim();
    
    if (this.userRating === 0) {
      alert('Please select a rating before submitting your review.');
      return;
    }
    
    if (reviewText.length === 0) {
      alert('Please write a review before submitting.');
      return;
    }
    
    try {
      // Submit review (mock implementation)
      await this.saveUserReview({
        experienceId: this.experience.id,
        rating: this.userRating,
        review: reviewText,
        date: new Date()
      });
      
      // Show success message
      const toastManager = window.exploreXApp?.toastManager;
      if (toastManager) {
        toastManager.success('Thank you for your review!');
      }
      
      // Clear form
      this.element.querySelector('.review-textarea').value = '';
      this.setRating(0);
      
      // Refresh reviews display
      this.refreshReviews();
      
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    }
  }

  /**
   * Save user review (mock)
   */
  async saveUserReview(reviewData) {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Review saved:', reviewData);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Refresh reviews display
   */
  refreshReviews() {
    const reviewsContent = this.element.querySelector('.reviews-content');
    if (reviewsContent) {
      reviewsContent.innerHTML = this.createReviewsList(this.experience);
    }
  }

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  /**
   * Get directions to experience
   */
  getDirections(mode = 'driving') {
    const address = encodeURIComponent(this.experience.address.toString());
    let url;
    
    switch (mode) {
      case 'transit':
        url = `https://maps.google.com/maps?daddr=${address}&dirflg=r`;
        break;
      case 'walking':
        url = `https://maps.google.com/maps?daddr=${address}&dirflg=w`;
        break;
      default:
        url = `https://maps.google.com/maps?daddr=${address}`;
    }
    
    window.open(url, '_blank', 'noopener');
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite() {
    try {
      // Toggle favorite status (mock)
      const isFavorited = await this.toggleFavoriteStatus(this.experience.id);
      
      // Update UI
      const favoriteButtons = this.element.querySelectorAll('.action-button');
      favoriteButtons.forEach(button => {
        if (button.textContent.includes('Save')) {
          const icon = button.querySelector('.button-icon');
          const text = button.querySelector('.button-text');
          
          if (isFavorited) {
            icon.textContent = '❤️';
            text.textContent = 'Saved';
            button.classList.add('favorited');
          } else {
            icon.textContent = '🤍';
            text.textContent = 'Save';
            button.classList.remove('favorited');
          }
        }
      });
      
      // Show toast notification
      const toastManager = window.exploreXApp?.toastManager;
      if (toastManager) {
        if (isFavorited) {
          toastManager.success('Experience saved to your favorites!');
        } else {
          toastManager.info('Experience removed from favorites');
        }
      }
      
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  /**
   * Share experience
   */
  shareExperience() {
    const shareData = {
      title: this.experience.name,
      text: `Check out ${this.experience.name} - ${this.experience.description.substring(0, 100)}...`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.title} - ${shareData.url}`);
      
      const toastManager = window.exploreXApp?.toastManager;
      if (toastManager) {
        toastManager.success('Link copied to clipboard!');
      }
    }
  }

  /**
   * Book experience
   */
  bookExperience() {
    // In production, this would integrate with booking system
    const bookingUrl = this.experience.contactInfo.website || '#';
    window.open(bookingUrl, '_blank', 'noopener');
  }

  /**
   * Add to itinerary
   */
  addToItinerary() {
    // In production, this would add to user's itinerary
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.success('Experience added to your itinerary!');
    }
  }

  /**
   * Report issue
   */
  reportIssue() {
    // In production, this would open a report form
    const toastManager = window.exploreXApp?.toastManager;
    if (toastManager) {
      toastManager.info('Report feature coming soon!');
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get experience image
   */
  getExperienceImage(experience) {
    const imageMap = {
      observatory: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=400&fit=crop',
      planetarium: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800&h=400&fit=crop',
      space_center: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&h=400&fit=crop',
      space_museum: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=400&fit=crop',
      science_center: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop'
    };
    
    return imageMap[experience.type] || imageMap.observatory;
  }

  /**
   * Get type icon
   */
  getTypeIcon(type) {
    const iconMap = {
      observatory: '🔭',
      planetarium: '🌌',
      space_center: '🚀',
      space_museum: '🏛️',
      science_center: '🔬',
      astronomy_lab: '🧪',
      stargazing_site: '✨'
    };
    
    return iconMap[type] || '📍';
  }

  /**
   * Get operating hours summary
   */
  getOperatingHoursSummary(hours) {
    if (!hours || hours.length === 0) {
      return 'Hours not available';
    }
    
    const today = new Date().getDay();
    const todayHours = hours.find(h => h.dayOfWeek === today);
    
    if (todayHours) {
      if (todayHours.isClosed) {
        return 'Closed today';
      } else {
        return `Open today: ${todayHours.openTime} - ${todayHours.closeTime}`;
      }
    }
    
    return 'See details for full hours';
  }

  /**
   * Get accessibility summary
   */
  getAccessibilitySummary(accessibility) {
    if (!accessibility || accessibility.length === 0) {
      return 'Contact for accessibility info';
    }
    
    const features = accessibility.slice(0, 2);
    return features.map(feature => this.formatAccessibilityFeature(feature)).join(', ');
  }

  /**
   * Create detailed operating hours
   */
  createDetailedOperatingHours(hours) {
    if (!hours || hours.length === 0) {
      return '<p>Operating hours not available. Please contact directly.</p>';
    }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return `
      <div class="hours-list">
        ${hours.map(hour => `
          <div class="hour-item">
            <span class="day-name">${dayNames[hour.dayOfWeek]}:</span>
            <span class="day-hours">
              ${hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Create detailed accessibility info
   */
  createDetailedAccessibilityInfo(accessibility) {
    if (!accessibility || accessibility.length === 0) {
      return '<p>Please contact the venue for accessibility information.</p>';
    }
    
    return `
      <div class="accessibility-list">
        ${accessibility.map(feature => `
          <div class="accessibility-item">
            <span class="accessibility-icon">♿</span>
            <span class="accessibility-text">${this.formatAccessibilityFeature(feature)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Get amenity icon
   */
  getAmenityIcon(amenity) {
    const iconMap = {
      parking: '🅿️',
      restrooms: '🚻',
      gift_shop: '🛍️',
      cafe: '☕',
      wheelchair_accessible: '♿',
      guided_tours: '👥',
      audio_guide: '🎧',
      wifi: '📶',
      telescope: '🔭',
      planetarium_shows: '🌌'
    };
    
    return iconMap[amenity] || '✅';
  }

  /**
   * Format amenity text
   */
  formatAmenity(amenity) {
    return window.ExploreXUtils.StringUtils.toTitleCase(amenity.replace(/_/g, ' '));
  }

  /**
   * Format accessibility feature
   */
  formatAccessibilityFeature(feature) {
    return window.ExploreXUtils.StringUtils.toTitleCase(feature.replace(/_/g, ' '));
  }

  /**
   * Create rating distribution
   */
  createRatingDistribution(experience) {
    // Mock rating distribution
    const distribution = [
      { stars: 5, count: Math.floor(experience.reviewCount * 0.6) },
      { stars: 4, count: Math.floor(experience.reviewCount * 0.25) },
      { stars: 3, count: Math.floor(experience.reviewCount * 0.1) },
      { stars: 2, count: Math.floor(experience.reviewCount * 0.03) },
      { stars: 1, count: Math.floor(experience.reviewCount * 0.02) }
    ];
    
    return `
      <div class="rating-bars">
        ${distribution.map(item => {
          const percentage = (item.count / experience.reviewCount) * 100;
          return `
            <div class="rating-bar-item">
              <span class="rating-bar-label">${item.stars} ★</span>
              <div class="rating-bar">
                <div class="rating-bar-fill" style="width: ${percentage}%"></div>
              </div>
              <span class="rating-bar-count">${item.count}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Create reviews list
   */
  createReviewsList(experience) {
    // Mock reviews data
    const mockReviews = [
      {
        id: 1,
        userName: 'Sarah M.',
        rating: 5,
        date: new Date('2024-01-15'),
        review: 'Amazing experience! The staff was knowledgeable and the facilities were top-notch. Highly recommend for anyone interested in astronomy.'
      },
      {
        id: 2,
        userName: 'Mike R.',
        rating: 4,
        date: new Date('2024-01-10'),
        review: 'Great place to visit with kids. The interactive exhibits were engaging and educational.'
      },
      {
        id: 3,
        userName: 'Jennifer L.',
        rating: 5,
        date: new Date('2024-01-05'),
        review: 'Spectacular views through the telescope! The guided tour was informative and the gift shop had great souvenirs.'
      }
    ];
    
    return `
      <div class="reviews-items">
        ${mockReviews.map(review => `
          <div class="review-item">
            <div class="review-header">
              <div class="review-user">
                <span class="user-avatar">👤</span>
                <span class="user-name">${review.userName}</span>
              </div>
              <div class="review-meta">
                <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                <div class="review-date">${window.ExploreXUtils.DateUtils.formatDate(review.date)}</div>
              </div>
            </div>
            <div class="review-content">
              <p>${review.review}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Toggle favorite status (mock)
   */
  async toggleFavoriteStatus(experienceId) {
    // Mock API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const isFavorited = Math.random() > 0.5; // Random for demo
        resolve(isFavorited);
      }, 500);
    });
  }
}

// =============================================================================
// EXPORT AND INITIALIZATION
// =============================================================================

// Make available globally
window.ExploreXExperienceModal = ExperienceDetailModal;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('ExploreX Experience Detail Modal system loaded');
});