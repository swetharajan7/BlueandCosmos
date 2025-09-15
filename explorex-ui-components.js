/**
 * ExploreX UI Components and Layout System
 * Space Travel Experience Recommendation System
 * 
 * This module provides comprehensive UI components including:
 * - Responsive layout components
 * - Interactive cards and modals
 * - Navigation and breadcrumb systems
 * - Loading states and animations
 * - Mobile-optimized touch interactions
 */

// =============================================================================
// UI COMPONENT CONFIGURATION
// =============================================================================

const UIConfig = {
  // Animation settings
  animationDuration: 300,
  staggerDelay: 50,
  
  // Responsive breakpoints
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
    wide: 1400
  },
  
  // Component settings
  cardHoverDelay: 100,
  modalTransitionDuration: 250,
  toastDuration: 4000,
  
  // Touch settings
  swipeThreshold: 50,
  longPressDelay: 500
};

// =============================================================================
// BASE UI COMPONENT CLASS
// =============================================================================

class UIComponent {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...this.getDefaultOptions(), ...options };
    this.isInitialized = false;
    this.eventListeners = [];
  }

  getDefaultOptions() {
    return {};
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.render();
    this.isInitialized = true;
  }

  setupEventListeners() {
    // Override in subclasses
  }

  render() {
    // Override in subclasses
  }

  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  destroy() {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.eventListeners = [];
    this.isInitialized = false;
  }
}

// =============================================================================
// RESPONSIVE LAYOUT MANAGER
// =============================================================================

class ResponsiveLayoutManager {
  constructor() {
    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.layoutComponents = new Map();
    this.resizeObserver = null;
    this.init();
  }

  init() {
    this.setupResizeObserver();
    this.setupEventListeners();
    this.updateLayout();
  }

  setupResizeObserver() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(
        window.ExploreXUtils.PerformanceUtils.throttle(
          this.handleResize.bind(this), 100
        )
      );
      this.resizeObserver.observe(document.body);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', 
        window.ExploreXUtils.PerformanceUtils.throttle(
          this.handleResize.bind(this), 100
        )
      );
    }
  }

  setupEventListeners() {
    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  handleResize() {
    const newBreakpoint = this.getCurrentBreakpoint();
    
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.updateLayout();
      this.notifyComponents();
    }
  }

  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width >= UIConfig.breakpoints.wide) return 'wide';
    if (width >= UIConfig.breakpoints.desktop) return 'desktop';
    if (width >= UIConfig.breakpoints.tablet) return 'tablet';
    return 'mobile';
  }

  updateLayout() {
    document.body.setAttribute('data-breakpoint', this.currentBreakpoint);
    
    // Update CSS custom properties for responsive design
    document.documentElement.style.setProperty('--current-breakpoint', this.currentBreakpoint);
    document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  }

  registerComponent(id, component) {
    this.layoutComponents.set(id, component);
  }

  unregisterComponent(id) {
    this.layoutComponents.delete(id);
  }

  notifyComponents() {
    this.layoutComponents.forEach(component => {
      if (component.onBreakpointChange) {
        component.onBreakpointChange(this.currentBreakpoint);
      }
    });
  }

  isMobile() {
    return this.currentBreakpoint === 'mobile';
  }

  isTablet() {
    return this.currentBreakpoint === 'tablet';
  }

  isDesktop() {
    return ['desktop', 'wide'].includes(this.currentBreakpoint);
  }
}

// =============================================================================
// EXPERIENCE CARD COMPONENT
// =============================================================================

class ExperienceCard extends UIComponent {
  constructor(element, experienceData, options = {}) {
    super(element, options);
    this.experienceData = experienceData;
    this.isExpanded = false;
  }

  getDefaultOptions() {
    return {
      showDistance: true,
      showRating: true,
      showPrice: true,
      showBadges: true,
      enableHover: true,
      enableClick: true,
      animateOnScroll: true
    };
  }

  setupEventListeners() {
    if (this.options.enableClick) {
      this.addEventListener(this.element, 'click', this.handleClick.bind(this));
    }

    if (this.options.enableHover) {
      this.addEventListener(this.element, 'mouseenter', this.handleMouseEnter.bind(this));
      this.addEventListener(this.element, 'mouseleave', this.handleMouseLeave.bind(this));
    }

    // Touch events for mobile
    this.setupTouchEvents();
  }

  setupTouchEvents() {
    let touchStartTime = 0;
    let touchStartY = 0;

    this.addEventListener(this.element, 'touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartY = e.touches[0].clientY;
    });

    this.addEventListener(this.element, 'touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      const touchEndY = e.changedTouches[0].clientY;
      const touchDistance = Math.abs(touchEndY - touchStartY);

      // Detect tap vs scroll
      if (touchDuration < 300 && touchDistance < 10) {
        this.handleClick(e);
      }
    });
  }

  render() {
    const exp = this.experienceData;
    
    // Generate star rating
    const stars = '★'.repeat(Math.floor(exp.rating)) + 
                 '☆'.repeat(5 - Math.floor(exp.rating));
    
    // Format type for display
    const typeDisplay = window.ExploreXUtils.StringUtils.toTitleCase(
      exp.type.replace(/_/g, ' ')
    );
    
    // Create badges
    const badges = [];
    if (this.options.showBadges) {
      if (exp.featured) badges.push('<span class="experience-badge badge-featured">Featured</span>');
      if (exp.verified) badges.push('<span class="experience-badge badge-verified">Verified</span>');
      if (exp.admissionFee.isFree) badges.push('<span class="experience-badge badge-free">Free</span>');
    }
    
    this.element.className = 'experience-card';
    this.element.innerHTML = `
      <div class="card-image-container">
        <div class="card-image" style="background-image: url('${this.getCardImage(exp)}')">
          <div class="card-image-overlay">
            <div class="experience-badges">
              ${badges.join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="card-content">
        <div class="experience-header">
          <h3 class="experience-title">${exp.name}</h3>
          <div class="experience-type">
            <span class="type-icon">${this.getTypeIcon(exp.type)}</span>
            <span class="type-label">${typeDisplay}</span>
          </div>
        </div>
        
        ${this.options.showRating ? `
          <div class="experience-rating">
            <span class="rating-stars">${stars}</span>
            <span class="rating-value">${exp.rating}</span>
            <span class="rating-count">(${window.ExploreXUtils.NumberUtils.formatNumber(exp.reviewCount)})</span>
          </div>
        ` : ''}
        
        <p class="experience-description">
          ${window.ExploreXUtils.StringUtils.truncate(exp.shortDescription || exp.description, 100)}
        </p>
        
        <div class="experience-details">
          <div class="experience-location">
            <span class="location-icon">📍</span>
            <span class="location-text">${exp.address.city}, ${exp.address.state}</span>
            ${this.options.showDistance && exp.distance ? 
              `<span class="experience-distance">${window.ExploreXUtils.NumberUtils.round(exp.distance, 1)} mi</span>` : ''}
          </div>
          
          ${this.options.showPrice ? `
            <div class="experience-price ${exp.admissionFee.isFree ? 'price-free' : ''}">
              ${exp.admissionFee.formatPrice()}
            </div>
          ` : ''}
        </div>
        
        <div class="card-actions">
          <button class="card-action-button primary">
            <span class="button-icon">👁️</span>
            <span class="button-text">View Details</span>
          </button>
          <button class="card-action-button secondary">
            <span class="button-icon">❤️</span>
            <span class="button-text">Save</span>
          </button>
        </div>
      </div>
    `;

    // Setup intersection observer for scroll animations
    if (this.options.animateOnScroll) {
      this.setupScrollAnimation();
    }
  }

  getCardImage(experience) {
    // Return placeholder image based on experience type
    const imageMap = {
      observatory: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=250&fit=crop',
      planetarium: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=250&fit=crop',
      space_center: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&h=250&fit=crop',
      space_museum: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=250&fit=crop',
      science_center: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop'
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

  setupScrollAnimation() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });

      observer.observe(this.element);
    }
  }

  handleClick(event) {
    event.preventDefault();
    
    // Add click animation
    this.element.classList.add('card-clicked');
    setTimeout(() => {
      this.element.classList.remove('card-clicked');
    }, 200);

    // Dispatch custom event
    this.element.dispatchEvent(new CustomEvent('experienceCardClick', {
      bubbles: true,
      detail: {
        experience: this.experienceData,
        card: this.element
      }
    }));
  }

  handleMouseEnter() {
    this.element.classList.add('card-hover');
  }

  handleMouseLeave() {
    this.element.classList.remove('card-hover');
  }

  updateData(newData) {
    this.experienceData = newData;
    this.render();
  }
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================

class Modal extends UIComponent {
  constructor(options = {}) {
    const modalElement = document.createElement('div');
    super(modalElement, options);
    this.isOpen = false;
    this.focusableElements = [];
    this.previousFocus = null;
  }

  getDefaultOptions() {
    return {
      closeOnBackdrop: true,
      closeOnEscape: true,
      showCloseButton: true,
      size: 'medium', // small, medium, large, fullscreen
      animation: 'fade', // fade, slide, zoom
      backdrop: true
    };
  }

  setupEventListeners() {
    if (this.options.closeOnEscape) {
      this.addEventListener(document, 'keydown', this.handleKeydown.bind(this));
    }

    if (this.options.closeOnBackdrop) {
      this.addEventListener(this.element, 'click', this.handleBackdropClick.bind(this));
    }
  }

  render() {
    this.element.className = `modal modal-${this.options.size}`;
    this.element.innerHTML = `
      ${this.options.backdrop ? '<div class="modal-backdrop"></div>' : ''}
      <div class="modal-container">
        <div class="modal-content">
          ${this.options.showCloseButton ? `
            <button class="modal-close" aria-label="Close modal">
              <span class="close-icon">✕</span>
            </button>
          ` : ''}
          <div class="modal-header">
            <h2 class="modal-title" id="modal-title"></h2>
          </div>
          <div class="modal-body" id="modal-body">
            <!-- Content will be inserted here -->
          </div>
          <div class="modal-footer" id="modal-footer">
            <!-- Footer content will be inserted here -->
          </div>
        </div>
      </div>
    `;

    // Setup close button
    if (this.options.showCloseButton) {
      const closeButton = this.element.querySelector('.modal-close');
      this.addEventListener(closeButton, 'click', this.close.bind(this));
    }

    // Add to DOM
    document.body.appendChild(this.element);
  }

  open(content = {}) {
    if (this.isOpen) return;

    // Store current focus
    this.previousFocus = document.activeElement;

    // Set content
    if (content.title) {
      this.setTitle(content.title);
    }
    if (content.body) {
      this.setBody(content.body);
    }
    if (content.footer) {
      this.setFooter(content.footer);
    }

    // Show modal
    this.element.style.display = 'flex';
    this.element.classList.add('modal-opening');
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.element.classList.add('modal-open');
      this.element.classList.remove('modal-opening');
    });

    // Manage focus
    this.setupFocusManagement();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    this.isOpen = true;

    // Dispatch event
    this.element.dispatchEvent(new CustomEvent('modalOpen', {
      bubbles: true,
      detail: { modal: this }
    }));
  }

  close() {
    if (!this.isOpen) return;

    this.element.classList.add('modal-closing');
    this.element.classList.remove('modal-open');

    setTimeout(() => {
      this.element.style.display = 'none';
      this.element.classList.remove('modal-closing');
      
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus
      if (this.previousFocus) {
        this.previousFocus.focus();
      }
      
      this.isOpen = false;

      // Dispatch event
      this.element.dispatchEvent(new CustomEvent('modalClose', {
        bubbles: true,
        detail: { modal: this }
      }));
    }, UIConfig.modalTransitionDuration);
  }

  setTitle(title) {
    const titleElement = this.element.querySelector('#modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  setBody(content) {
    const bodyElement = this.element.querySelector('#modal-body');
    if (bodyElement) {
      if (typeof content === 'string') {
        bodyElement.innerHTML = content;
      } else {
        bodyElement.innerHTML = '';
        bodyElement.appendChild(content);
      }
    }
  }

  setFooter(content) {
    const footerElement = this.element.querySelector('#modal-footer');
    if (footerElement) {
      if (typeof content === 'string') {
        footerElement.innerHTML = content;
      } else {
        footerElement.innerHTML = '';
        footerElement.appendChild(content);
      }
    }
  }

  setupFocusManagement() {
    // Find all focusable elements
    this.focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  handleKeydown(event) {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
  }

  handleTabNavigation(event) {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  handleBackdropClick(event) {
    if (event.target === this.element) {
      this.close();
    }
  }
}

// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================

class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', options = {}) {
    const toast = this.createToast(message, type, options);
    this.toasts.push(toast);
    this.container.appendChild(toast.element);

    // Animate in
    requestAnimationFrame(() => {
      toast.element.classList.add('toast-show');
    });

    // Auto-hide
    if (options.duration !== 0) {
      setTimeout(() => {
        this.hide(toast);
      }, options.duration || UIConfig.toastDuration);
    }

    return toast;
  }

  createToast(message, type, options) {
    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    element.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        ${options.showClose !== false ? `
          <button class="toast-close" aria-label="Close notification">✕</button>
        ` : ''}
      </div>
    `;

    const toast = { element, type, message, options };

    // Setup close button
    const closeButton = element.querySelector('.toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide(toast);
      });
    }

    return toast;
  }

  hide(toast) {
    toast.element.classList.add('toast-hide');
    
    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.overlay = null;
  }

  show(target = document.body, options = {}) {
    const loader = this.createLoader(target, options);
    this.activeLoaders.add(loader);
    return loader;
  }

  createLoader(target, options) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner ${options.size || 'medium'}`;
    
    if (options.message) {
      const message = document.createElement('div');
      message.className = 'loading-message';
      message.textContent = options.message;
      overlay.appendChild(message);
    }
    
    overlay.appendChild(spinner);
    
    // Position overlay
    if (target === document.body) {
      overlay.classList.add('loading-fullscreen');
    } else {
      target.style.position = 'relative';
      overlay.classList.add('loading-local');
    }
    
    target.appendChild(overlay);
    
    const loader = {
      element: overlay,
      target,
      hide: () => this.hide(loader)
    };
    
    return loader;
  }

  hide(loader) {
    if (loader.element && loader.element.parentNode) {
      loader.element.classList.add('loading-fade-out');
      
      setTimeout(() => {
        if (loader.element.parentNode) {
          loader.element.parentNode.removeChild(loader.element);
        }
      }, 200);
    }
    
    this.activeLoaders.delete(loader);
  }

  hideAll() {
    this.activeLoaders.forEach(loader => {
      this.hide(loader);
    });
  }
}

// =============================================================================
// EXPORT FOR USE IN APPLICATION
// =============================================================================

// Make UI components available globally
if (typeof window !== 'undefined') {
  window.ExploreXUI = {
    UIComponent,
    ResponsiveLayoutManager,
    ExperienceCard,
    Modal,
    ToastManager,
    LoadingManager,
    UIConfig
  };
} else {
  module.exports = {
    UIComponent,
    ResponsiveLayoutManager,
    ExperienceCard,
    Modal,
    ToastManager,
    LoadingManager,
    UIConfig
  };
}

console.log('✅ ExploreX UI Components loaded successfully');