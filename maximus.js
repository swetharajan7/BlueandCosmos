// MAXIMUS - BlueandCosmos AI Assistant
// Competition-ready intelligent site guide

class MaximusAI {
  constructor() {
    this.isOpen = false;
    this.currentPage = this.detectCurrentPage();
    this.userLocation = 'New York City, NY'; // Default, can be updated
    this.knowledgeBase = this.initializeKnowledgeBase();
    this.conversationHistory = [];
    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('moon.html')) return 'lunar';
    if (path.includes('telescope.html')) return 'telescope';
    if (path.includes('dashboard.html')) return 'dashboard';
    if (path.includes('discussion.html')) return 'community';
    return 'home';
  }

  initializeKnowledgeBase() {
    return {
      // Site Navigation
      navigation: {
        "home": "The main BlueandCosmos homepage with hero image and moon phase widget",
        "dashboard": "Real-time Earth-Sky Intelligence Platform with live satellite data, weather, and space monitoring",
        "moon": "Lunar Intelligence Center with 15 years of moon phase data, eclipses, and tidal information",
        "telescope": "Virtual Observatory Command Center for interactive telescope operation and celestial object identification",
        "community": "Cosmic Community Hub where students and researchers connect, share knowledge, and collaborate"
      },

      // Features & Capabilities
      features: {
        "moon phases": "Our Lunar Intelligence Center shows current moon phase, 15-year calendar, eclipses, supermoons, and location-specific moonrise/moonset times",
        "satellite tracking": "Dashboard shows live satellite positions including ISS, Starlink, and weather satellites with pass predictions",
        "telescope operation": "Virtual Observatory teaches telescope controls, celestial object identification, and astronomical coordinates",
        "weather intelligence": "Real-time weather data optimized for stargazing with cloud cover and sky quality analysis",
        "aurora forecast": "Space weather monitoring with aurora visibility predictions based on Kp index",
        "wildfire tracking": "Global fire detection using NASA satellite data with smoke impact analysis",
        "community forum": "Discussion platform with study groups, research collaboration, homework help, and mentorship",
        "solar storms": "Space weather monitoring affecting GPS, communications, and technology",
        "air quality": "Real-time atmospheric monitoring with health recommendations",
        "tidal data": "Lunar-influenced tide predictions and timing for coastal locations"
      },

      // Educational Content
      learning: {
        "beginner astronomy": "Start with our moon phase widget, then explore the Lunar Intelligence Center to understand lunar cycles",
        "telescope basics": "Visit our Virtual Observatory to learn telescope operation, coordinates, and object identification",
        "satellite data": "Dashboard teaches interpretation of real-time Earth and space intelligence data",
        "study groups": "Join our Community Hub to connect with other learners and find study partners",
        "homework help": "Community forum has dedicated homework help section with peer support",
        "career guidance": "Connect with astronomy professionals in our Community Hub for mentorship"
      },

      // Current Events & Data
      realtime: {
        "tonight": "Check Dashboard for tonight's sky conditions, ISS passes, and optimal stargazing times",
        "this week": "Lunar calendar shows this week's moon phase progression and special events",
        "current moon": "Today's moon phase is shown in the header widget with location-specific rise/set times",
        "iss passes": "Satellite tracker shows next ISS passes visible from your location",
        "space weather": "Current solar activity and aurora probability available on Dashboard"
      },

      // Quick Actions
      actions: {
        "find moon phase": "Click the moon widget in the header or visit moon.html",
        "track satellites": "Go to Dashboard and check the Live Satellite Tracker section",
        "use telescope": "Visit telescope.html for the Virtual Observatory experience",
        "join community": "Go to discussion.html to connect with other astronomy enthusiasts",
        "check weather": "Dashboard shows current weather optimized for stargazing",
        "set location": "Update your city in the moon.html or telescope.html location inputs"
      }
    };
  }

  init() {
    this.createChatInterface();
    this.addEventListeners();
    this.showWelcomeMessage();
  }

  createChatInterface() {
    // Create chat bubble
    const chatBubble = document.createElement('div');
    chatBubble.id = 'maximus-bubble';
    chatBubble.innerHTML = `
      <div class="maximus-avatar">
        <span class="maximus-icon">🤖</span>
        <div class="maximus-pulse"></div>
      </div>
      <div class="maximus-tooltip">Hi! I'm MAXIMUS, your BlueandCosmos guide. Ask me anything!</div>
    `;

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'maximus-chat';
    chatWindow.innerHTML = `
      <div class="maximus-header">
        <div class="maximus-title">
          <span class="maximus-icon">🤖</span>
          <span>MAXIMUS - Your AI Guide</span>
        </div>
        <button class="maximus-close" onclick="maximus.toggleChat()">&times;</button>
      </div>
      <div class="maximus-messages" id="maximus-messages"></div>
      <div class="maximus-suggestions" id="maximus-suggestions"></div>
      <div class="maximus-input-area">
        <input type="text" id="maximus-input" placeholder="Ask me about BlueandCosmos..." />
        <button id="maximus-send">Send</button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      #maximus-bubble {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        background: linear-gradient(45deg, #0033a0, #0066cc);
        border-radius: 50%;
        cursor: pointer;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0, 51, 160, 0.4);
        transition: all 0.3s ease;
        animation: maximusPulse 2s infinite;
      }

      #maximus-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(0, 51, 160, 0.6);
      }

      @keyframes maximusPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .maximus-avatar {
        position: relative;
        color: white;
        font-size: 24px;
      }

      .maximus-pulse {
        position: absolute;
        top: -5px;
        left: -5px;
        right: -5px;
        bottom: -5px;
        border: 2px solid rgba(255, 64, 129, 0.6);
        border-radius: 50%;
        animation: maximusRipple 2s infinite;
      }

      @keyframes maximusRipple {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.4); opacity: 0; }
      }

      .maximus-tooltip {
        position: absolute;
        bottom: 70px;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 0.8em 1em;
        border-radius: 10px;
        font-size: 0.9em;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
        pointer-events: none;
        max-width: 250px;
        white-space: normal;
      }

      #maximus-bubble:hover .maximus-tooltip {
        opacity: 1;
        transform: translateY(0);
      }

      #maximus-chat {
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 380px;
        height: 500px;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(15px);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 10001;
        display: none;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        color: white;
        font-family: 'Work Sans', sans-serif;
      }

      .maximus-header {
        background: linear-gradient(45deg, #0033a0, #0066cc);
        padding: 1em;
        border-radius: 15px 15px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .maximus-title {
        display: flex;
        align-items: center;
        gap: 0.5em;
        font-weight: bold;
      }

      .maximus-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5em;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s ease;
      }

      .maximus-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .maximus-messages {
        flex: 1;
        padding: 1em;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1em;
      }

      .maximus-message {
        max-width: 80%;
        padding: 0.8em 1em;
        border-radius: 15px;
        line-height: 1.4;
        animation: messageSlideIn 0.3s ease;
      }

      @keyframes messageSlideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .maximus-message.user {
        background: linear-gradient(45deg, #ff4081, #e91e63);
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 5px;
      }

      .maximus-message.ai {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        align-self: flex-start;
        border-bottom-left-radius: 5px;
        border-left: 3px solid #0066cc;
      }

      .maximus-suggestions {
        padding: 0 1em;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
        margin-bottom: 1em;
      }

      .maximus-suggestion {
        background: rgba(0, 102, 204, 0.2);
        color: #66b3ff;
        padding: 0.4em 0.8em;
        border-radius: 15px;
        font-size: 0.85em;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(102, 179, 255, 0.3);
      }

      .maximus-suggestion:hover {
        background: rgba(0, 102, 204, 0.4);
        color: white;
        transform: translateY(-1px);
      }

      .maximus-input-area {
        padding: 1em;
        display: flex;
        gap: 0.5em;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      #maximus-input {
        flex: 1;
        padding: 0.8em;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-family: inherit;
        outline: none;
      }

      #maximus-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      #maximus-input:focus {
        border-color: #0066cc;
        box-shadow: 0 0 10px rgba(0, 102, 204, 0.3);
      }

      #maximus-send {
        background: linear-gradient(45deg, #ff4081, #e91e63);
        color: white;
        border: none;
        padding: 0.8em 1.2em;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
      }

      #maximus-send:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(255, 64, 129, 0.4);
      }

      .maximus-typing {
        display: flex;
        align-items: center;
        gap: 0.5em;
        color: #66b3ff;
        font-style: italic;
      }

      .maximus-typing-dots {
        display: flex;
        gap: 0.2em;
      }

      .maximus-typing-dot {
        width: 4px;
        height: 4px;
        background: #66b3ff;
        border-radius: 50%;
        animation: typingDot 1.4s infinite;
      }

      .maximus-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .maximus-typing-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typingDot {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }

      @media (max-width: 480px) {
        #maximus-chat {
          width: calc(100vw - 20px);
          right: 10px;
          left: 10px;
          bottom: 100px;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(chatBubble);
    document.body.appendChild(chatWindow);
  }

  addEventListeners() {
    // Chat bubble click
    document.getElementById('maximus-bubble').addEventListener('click', () => {
      this.toggleChat();
    });

    // Send button
    document.getElementById('maximus-send').addEventListener('click', () => {
      this.sendMessage();
    });

    // Enter key
    document.getElementById('maximus-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    // Suggestion clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('maximus-suggestion')) {
        this.handleSuggestion(e.target.textContent);
      }
    });
  }

  toggleChat() {
    const chat = document.getElementById('maximus-chat');
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      chat.style.display = 'flex';
      this.updateSuggestions();
      document.getElementById('maximus-input').focus();
    } else {
      chat.style.display = 'none';
    }
  }

  showWelcomeMessage() {
    setTimeout(() => {
      const pageMessages = {
        'home': "Welcome to BlueandCosmos! I can help you explore our Earth-Sky Intelligence Platform. Try asking about moon phases, satellite tracking, or our telescope simulator!",
        'lunar': "You're in our Lunar Intelligence Center! I can help you understand moon phases, find eclipses, or explain tidal effects. What would you like to learn?",
        'telescope': "Welcome to the Virtual Observatory! I can guide you through telescope operation, help identify celestial objects, or explain astronomical coordinates.",
        'dashboard': "You're viewing our real-time Earth-Sky Intelligence! I can explain the satellite data, weather intelligence, or help you track space events.",
        'community': "Welcome to our Cosmic Community Hub! I can help you find study groups, connect with mentors, or navigate the discussion forums."
      };

      this.addMessage('ai', pageMessages[this.currentPage] || pageMessages['home']);
    }, 1000);
  }

  updateSuggestions() {
    const suggestions = document.getElementById('maximus-suggestions');
    const pageSuggestions = {
      'home': ['Show me moon phases', 'Track satellites', 'How do I start?', 'What can I learn here?'],
      'lunar': ['Current moon phase', 'Next full moon', 'Explain tidal effects', 'Find eclipses'],
      'telescope': ['How to use telescope', 'Identify objects', 'Find Jupiter', 'Explain coordinates'],
      'dashboard': ['Tonight\'s conditions', 'ISS passes', 'Aurora forecast', 'Weather for stargazing'],
      'community': ['Find study groups', 'Get homework help', 'Connect with mentors', 'Join discussions']
    };

    const currentSuggestions = pageSuggestions[this.currentPage] || pageSuggestions['home'];
    
    suggestions.innerHTML = currentSuggestions.map(suggestion => 
      `<div class="maximus-suggestion">${suggestion}</div>`
    ).join('');
  }

  sendMessage() {
    const input = document.getElementById('maximus-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';
    
    this.showTyping();
    setTimeout(() => {
      this.processMessage(message);
    }, 1000 + Math.random() * 1000);
  }

  handleSuggestion(suggestion) {
    this.addMessage('user', suggestion);
    this.showTyping();
    setTimeout(() => {
      this.processMessage(suggestion);
    }, 800);
  }

  addMessage(type, content) {
    const messages = document.getElementById('maximus-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `maximus-message ${type}`;
    messageDiv.innerHTML = content;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    
    this.conversationHistory.push({ type, content });
  }

  showTyping() {
    const messages = document.getElementById('maximus-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'maximus-message ai maximus-typing';
    typingDiv.innerHTML = `
      <span>MAXIMUS is thinking</span>
      <div class="maximus-typing-dots">
        <div class="maximus-typing-dot"></div>
        <div class="maximus-typing-dot"></div>
        <div class="maximus-typing-dot"></div>
      </div>
    `;
    typingDiv.id = 'typing-indicator';
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  removeTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  processMessage(message) {
    this.removeTyping();
    const response = this.generateResponse(message.toLowerCase());
    this.addMessage('ai', response);
  }

  generateResponse(message) {
    // Smart keyword matching and response generation
    const responses = {
      // Navigation
      'moon': () => this.currentPage === 'lunar' ? 
        "You're already in our Lunar Intelligence Center! Check out the 15-year calendar or set your location for personalized moonrise times." :
        "Let me take you to our Lunar Intelligence Center! <a href='moon.html' style='color: #66b3ff;'>Click here</a> to explore moon phases, eclipses, and tidal data.",
      
      'telescope': () => this.currentPage === 'telescope' ?
        "You're in our Virtual Observatory! Try clicking on celestial objects in the sky view, or use the zoom controls to explore." :
        "Our Virtual Observatory awaits! <a href='telescope.html' style='color: #66b3ff;'>Click here</a> to operate telescopes and identify celestial objects.",
      
      'dashboard': () => this.currentPage === 'dashboard' ?
        "You're viewing our Earth-Sky Intelligence Dashboard! Each card shows real-time data - click on any satellite tracker or weather intelligence card." :
        "Check out our real-time intelligence! <a href='dashboard.html' style='color: #66b3ff;'>Visit the Dashboard</a> for live satellite data and space weather.",
      
      'community': () => this.currentPage === 'community' ?
        "Welcome to our community! Browse the categories on the left, join study groups, or start a new discussion." :
        "Join our learning community! <a href='discussion.html' style='color: #66b3ff;'>Visit the Community Hub</a> to connect with students and researchers.",

      // Features
      'satellite': () => "Our satellite tracker shows live positions of ISS, Starlink, and weather satellites! You can find it on the Dashboard with real-time pass predictions.",
      
      'iss': () => "The International Space Station tracker shows when ISS passes over your location! Check the Dashboard satellite tracker or telescope page for viewing times.",
      
      'aurora': () => "Our aurora forecast uses real-time space weather data to predict northern lights visibility! Check the Dashboard for current Kp index and viewing probability.",
      
      'weather': () => "We provide stargazing-optimized weather data including cloud cover, visibility, and sky quality ratings! Perfect for planning your observations.",
      
      'phase': () => "Moon phases are shown in our header widget and detailed in the Lunar Intelligence Center with 15 years of data, eclipses, and supermoons!",

      // Learning
      'learn': () => "BlueandCosmos offers interactive learning through real data exploration! Start with moon phases, try the telescope simulator, or join study groups in our community.",
      
      'beginner': () => "New to astronomy? Start with our moon phase widget, then explore the Lunar Intelligence Center. Our community has beginner-friendly study groups too!",
      
      'help': () => "I can help you navigate BlueandCosmos! Ask about specific features, or visit our Community Hub where students and mentors provide peer support.",

      // Current events
      'tonight': () => "For tonight's sky conditions, check our Dashboard! It shows weather, ISS passes, aurora probability, and optimal stargazing times for your location.",
      
      'now': () => "Right now you can check: current moon phase (header widget), live satellite positions (Dashboard), and real-time space weather conditions!",

      // Default responses
      'default': [
        "I'm here to help you explore BlueandCosmos! Try asking about moon phases, satellite tracking, telescope operation, or our learning community.",
        "Great question! I can guide you to our Lunar Intelligence Center, Virtual Observatory, real-time Dashboard, or Community Hub. What interests you most?",
        "BlueandCosmos combines real-time space data with interactive learning! I can help you navigate our features or find specific information.",
        "As your AI guide, I know all about our platform's features! Ask me about astronomy learning, satellite data, or connecting with other space enthusiasts."
      ]
    };

    // Find matching keywords
    for (const [keyword, responseFunc] of Object.entries(responses)) {
      if (keyword !== 'default' && message.includes(keyword)) {
        return typeof responseFunc === 'function' ? responseFunc() : responseFunc;
      }
    }

    // Return random default response
    const defaultResponses = responses.default;
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
}

// Initialize MAXIMUS when page loads
let maximus;
document.addEventListener('DOMContentLoaded', () => {
  maximus = new MaximusAI();
});

// Global function for easy access
window.maximus = maximus;