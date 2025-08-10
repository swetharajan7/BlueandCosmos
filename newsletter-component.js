// Newsletter Signup Component JavaScript
class NewsletterSignup {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.form = null;
    this.input = null;
    this.button = null;
    this.messageDiv = null;
    
    this.init();
  }
  
  init() {
    if (!this.container) return;
    
    this.form = this.container.querySelector('.newsletter-form');
    this.input = this.container.querySelector('.newsletter-input');
    this.button = this.container.querySelector('.newsletter-button');
    this.messageDiv = this.container.querySelector('.newsletter-message');
    
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSubmit(e);
        }
      });
    }
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    const email = this.input.value.trim();
    
    if (!this.validateEmail(email)) {
      this.showMessage('Please enter a valid email address.', 'error');
      return;
    }
    
    this.setLoading(true);
    
    try {
      // Simulate API call - replace with your actual newsletter service
      await this.subscribeToNewsletter(email);
      
      this.showMessage('🎉 Welcome to the BlueandCosmos community! Check your email for confirmation.', 'success');
      this.input.value = '';
      this.container.classList.add('success');
      
      // Track successful signup
      this.trackSignup(email);
      
      setTimeout(() => {
        this.container.classList.remove('success');
      }, 600);
      
    } catch (error) {
      this.showMessage('Something went wrong. Please try again later.', 'error');
      console.error('Newsletter signup error:', error);
    } finally {
      this.setLoading(false);
    }
  }
  
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  async subscribeToNewsletter(email) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Here you would integrate with your actual newsletter service
    // Examples: Mailchimp, ConvertKit, Substack, etc.
    
    // For now, we'll simulate a successful response
    // Replace this with your actual API call:
    /*
    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('Subscription failed');
    }
    
    return response.json();
    */
    
    // Store in localStorage for demo purposes
    const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
    }
    
    return { success: true, email };
  }
  
  setLoading(isLoading) {
    if (!this.button) return;
    
    if (isLoading) {
      this.button.disabled = true;
      this.button.innerHTML = '🚀 Joining...';
      this.button.style.opacity = '0.7';
    } else {
      this.button.disabled = false;
      this.button.innerHTML = '🚀 Join the Mission';
      this.button.style.opacity = '1';
    }
  }
  
  showMessage(message, type) {
    if (!this.messageDiv) return;
    
    this.messageDiv.textContent = message;
    this.messageDiv.className = `newsletter-message newsletter-${type}`;
    this.messageDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.messageDiv.style.display = 'none';
    }, 5000);
  }
  
  trackSignup(email) {
    // Track newsletter signup for analytics
    // Replace with your analytics service (Google Analytics, etc.)
    console.log('Newsletter signup tracked:', email);
    
    // Example Google Analytics event tracking:
    /*
    if (typeof gtag !== 'undefined') {
      gtag('event', 'newsletter_signup', {
        'event_category': 'engagement',
        'event_label': 'newsletter',
        'value': 1
      });
    }
    */
  }
}

// Auto-initialize newsletter components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Find all newsletter signup components and initialize them
  const newsletterComponents = document.querySelectorAll('.newsletter-signup');
  
  newsletterComponents.forEach((component, index) => {
    // Ensure each component has a unique ID
    if (!component.id) {
      component.id = `newsletter-signup-${index}`;
    }
    
    // Initialize the component
    new NewsletterSignup(component.id);
  });
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NewsletterSignup;
}