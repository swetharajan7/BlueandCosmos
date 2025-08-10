// Physics Flashcards Application Logic
class FlashcardsApp {
  constructor() {
    this.currentLevel = 'high';
    this.currentTopic = null;
    this.currentCards = [];
    this.currentCardIndex = 0;
    this.isFlipped = false;
    this.sessionStats = {
      cardsStudied: 0,
      correct: 0,
      startTime: null,
      endTime: null
    };
    this.userProgress = this.loadProgress();
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadTopicCategories();
    this.updateStats();
    this.setupTheme();
    this.setupOfflineStatus();
  }
  
  setupEventListeners() {
    // Level selection
    document.getElementById('levelSelect').addEventListener('change', (e) => {
      this.currentLevel = e.target.value;
      this.loadTopicCategories();
    });
    
    // Sidebar toggle for mobile
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Flashcard flip
    document.getElementById('flipBtn').addEventListener('click', () => {
      this.flipCard();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('flashcardInterface').style.display !== 'none') {
        switch(e.key) {
          case ' ':
          case 'Enter':
            e.preventDefault();
            if (!this.isFlipped) {
              this.flipCard();
            }
            break;
          case '1':
            if (this.isFlipped) this.answerCard('hard');
            break;
          case '2':
            if (this.isFlipped) this.answerCard('good');
            break;
          case '3':
            if (this.isFlipped) this.answerCard('easy');
            break;
          case 'h':
            this.showHint();
            break;
          case 's':
            this.skipCard();
            break;
        }
      }
    });
    
    // PWA install
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.installPWA();
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      const sidebarToggle = document.getElementById('sidebarToggle');
      
      if (window.innerWidth <= 768 && 
          !sidebar.contains(e.target) && 
          !sidebarToggle.contains(e.target) &&
          sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  }
  
  setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
      document.getElementById('themeToggle').textContent = '☀️';
    }
    
    document.getElementById('themeToggle').addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
  
  setupOfflineStatus() {
    const updateStatus = () => {
      const indicator = document.getElementById('statusIndicator');
      const text = document.getElementById('statusText');
      
      if (navigator.onLine) {
        indicator.textContent = '🟢';
        text.textContent = 'Online';
      } else {
        indicator.textContent = '🔴';
        text.textContent = 'Offline';
      }
    };
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }
  
  loadTopicCategories() {
    const container = document.getElementById('topicCategories');
    const levelData = PHYSICS_DATA.levels[this.currentLevel];
    
    if (!levelData) return;
    
    container.innerHTML = '';
    
    Object.entries(levelData.categories).forEach(([categoryName, categoryData]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'topic-category';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';
      headerDiv.innerHTML = `
        <span>${categoryData.icon} ${categoryName}</span>
        <span>▼</span>
      `;
      
      const topicsDiv = document.createElement('div');
      topicsDiv.className = 'category-topics';
      
      Object.entries(categoryData.topics).forEach(([topicName, topicData]) => {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'topic-item';
        
        const progress = this.getTopicProgress(this.currentLevel, categoryName, topicName);
        const progressText = `${progress.studied}/${progress.total}`;
        
        topicDiv.innerHTML = `
          <span>${topicName}</span>
          <span class="topic-progress">${progressText}</span>
        `;
        
        topicDiv.addEventListener('click', () => {
          this.startStudySession(categoryName, topicName);
        });
        
        topicsDiv.appendChild(topicDiv);
      });
      
      headerDiv.addEventListener('click', () => {
        topicsDiv.classList.toggle('expanded');
        const arrow = headerDiv.querySelector('span:last-child');
        arrow.textContent = topicsDiv.classList.contains('expanded') ? '▲' : '▼';
      });
      
      categoryDiv.appendChild(headerDiv);
      categoryDiv.appendChild(topicsDiv);
      container.appendChild(categoryDiv);
    });
  }
  
  getTopicProgress(level, category, topic) {
    const topicData = PHYSICS_DATA.levels[level]?.categories[category]?.topics[topic];
    if (!topicData) return { studied: 0, total: 0 };
    
    const total = topicData.cards.length;
    const studied = topicData.cards.filter(card => 
      this.userProgress[card.id]?.lastStudied
    ).length;
    
    return { studied, total };
  }
  
  startStudySession(category, topic) {
    const topicData = PHYSICS_DATA.levels[this.currentLevel]?.categories[category]?.topics[topic];
    if (!topicData) return;
    
    this.currentTopic = { category, topic };
    this.currentCards = this.selectCardsForStudy(topicData.cards);
    this.currentCardIndex = 0;
    this.sessionStats = {
      cardsStudied: 0,
      correct: 0,
      startTime: new Date(),
      endTime: null
    };
    
    // Update active topic in sidebar
    document.querySelectorAll('.topic-item').forEach(item => {
      item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    this.showStudyInterface();
    this.displayCurrentCard();
  }
  
  selectCardsForStudy(allCards) {
    const now = new Date();
    const dueCards = [];
    const newCards = [];
    
    allCards.forEach(card => {
      const progress = this.userProgress[card.id];
      
      if (!progress) {
        // New card
        newCards.push(card);
      } else if (progress.nextReview && new Date(progress.nextReview) <= now) {
        // Due for review
        dueCards.push(card);
      }
    });
    
    // Combine due cards and some new cards (max 20 total)
    const studyCards = [...dueCards];
    const remainingSlots = Math.max(0, 20 - studyCards.length);
    studyCards.push(...newCards.slice(0, remainingSlots));
    
    // Shuffle the cards
    return this.shuffleArray(studyCards);
  }
  
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  showStudyInterface() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('studyComplete').style.display = 'none';
    document.getElementById('flashcardInterface').style.display = 'block';
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  }
  
  displayCurrentCard() {
    if (this.currentCardIndex >= this.currentCards.length) {
      this.completeStudySession();
      return;
    }
    
    const card = this.currentCards[this.currentCardIndex];
    this.isFlipped = false;
    
    // Update progress bar
    const progress = ((this.currentCardIndex + 1) / this.currentCards.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('currentCard').textContent = this.currentCardIndex + 1;
    document.getElementById('totalCards').textContent = this.currentCards.length;
    
    // Reset card flip
    document.getElementById('flashcard').classList.remove('flipped');
    
    // Display card content
    document.getElementById('cardType').textContent = card.type;
    document.getElementById('cardQuestion').textContent = card.question;
    document.getElementById('cardAnswer').textContent = card.answer;
    document.getElementById('cardExplanation').textContent = card.explanation || '';
    
    // Show formula if exists
    const formulaDiv = document.getElementById('cardFormula');
    if (card.formula) {
      formulaDiv.textContent = card.formula;
      formulaDiv.style.display = 'block';
    } else {
      formulaDiv.style.display = 'none';
    }
    
    // Reset hint
    document.getElementById('cardHint').style.display = 'none';
    document.getElementById('hintText').textContent = card.hint || '';
    
    // Reset flip button
    document.getElementById('flipBtn').textContent = 'Show Answer';
  }
  
  flipCard() {
    if (this.isFlipped) return;
    
    this.isFlipped = true;
    document.getElementById('flashcard').classList.add('flipped');
    document.getElementById('flipBtn').textContent = 'Next Card';
  }
  
  answerCard(difficulty) {
    const card = this.currentCards[this.currentCardIndex];
    const cardId = card.id;
    
    // Update user progress
    if (!this.userProgress[cardId]) {
      this.userProgress[cardId] = {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        lastStudied: null,
        nextReview: null
      };
    }
    
    const progress = this.userProgress[cardId];
    const now = new Date();
    
    // Update based on difficulty
    let intervalMultiplier;
    switch(difficulty) {
      case 'hard':
        intervalMultiplier = 1;
        progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2);
        break;
      case 'good':
        intervalMultiplier = 2;
        this.sessionStats.correct++;
        break;
      case 'easy':
        intervalMultiplier = 3;
        progress.easeFactor = Math.min(2.5, progress.easeFactor + 0.1);
        this.sessionStats.correct++;
        break;
    }
    
    // Calculate next review date
    if (progress.repetitions === 0) {
      progress.interval = 1;
    } else if (progress.repetitions === 1) {
      progress.interval = 6;
    } else {
      progress.interval = Math.round(progress.interval * progress.easeFactor * intervalMultiplier);
    }
    
    progress.repetitions++;
    progress.lastStudied = now.toISOString();
    progress.nextReview = new Date(now.getTime() + progress.interval * 24 * 60 * 60 * 1000).toISOString();
    
    this.sessionStats.cardsStudied++;
    this.saveProgress();
    this.updateStats();
    
    // Move to next card
    this.currentCardIndex++;
    setTimeout(() => {
      this.displayCurrentCard();
    }, 300);
  }
  
  showHint() {
    const hintDiv = document.getElementById('cardHint');
    if (hintDiv.style.display === 'none' && document.getElementById('hintText').textContent) {
      hintDiv.style.display = 'block';
    }
  }
  
  skipCard() {
    this.currentCardIndex++;
    this.displayCurrentCard();
  }
  
  pauseStudy() {
    // Save current state and return to welcome screen
    document.getElementById('flashcardInterface').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'block';
  }
  
  completeStudySession() {
    this.sessionStats.endTime = new Date();
    const duration = Math.round((this.sessionStats.endTime - this.sessionStats.startTime) / 1000 / 60);
    const accuracy = this.sessionStats.cardsStudied > 0 ? 
      Math.round((this.sessionStats.correct / this.sessionStats.cardsStudied) * 100) : 0;
    
    // Update display
    document.getElementById('sessionCards').textContent = this.sessionStats.cardsStudied;
    document.getElementById('sessionAccuracy').textContent = `${accuracy}%`;
    document.getElementById('sessionTime').textContent = `${duration}m`;
    
    // Show completion screen
    document.getElementById('flashcardInterface').style.display = 'none';
    document.getElementById('studyComplete').style.display = 'block';
    
    this.updateStats();
  }
  
  startNewSession() {
    document.getElementById('studyComplete').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'block';
  }
  
  viewProgress() {
    // This could open a detailed progress modal
    alert('Progress tracking feature coming soon!');
  }
  
  updateStats() {
    const today = new Date().toDateString();
    let todayCards = 0;
    let totalCorrect = 0;
    let totalStudied = 0;
    
    Object.values(this.userProgress).forEach(progress => {
      if (progress.lastStudied && new Date(progress.lastStudied).toDateString() === today) {
        todayCards++;
      }
      if (progress.lastStudied) {
        totalStudied++;
        if (progress.repetitions > 0) totalCorrect++;
      }
    });
    
    const accuracy = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;
    const streak = this.calculateStreak();
    
    document.getElementById('cardsStudied').textContent = todayCards;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    document.getElementById('streak').textContent = `${streak} days`;
  }
  
  calculateStreak() {
    // Simple streak calculation - could be more sophisticated
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = checkDate.toDateString();
      
      const studiedToday = Object.values(this.userProgress).some(progress => 
        progress.lastStudied && new Date(progress.lastStudied).toDateString() === dateString
      );
      
      if (studiedToday) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }
  
  loadProgress() {
    const saved = localStorage.getItem('flashcards_progress');
    return saved ? JSON.parse(saved) : {};
  }
  
  saveProgress() {
    localStorage.setItem('flashcards_progress', JSON.stringify(this.userProgress));
  }
  
  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        this.deferredPrompt = null;
      });
    } else {
      // Fallback for browsers that don't support PWA install
      alert('To install this app:\n\n1. Open browser menu\n2. Select "Add to Home Screen" or "Install App"\n3. Follow the prompts');
    }
  }
}

// Quick study functions for welcome screen buttons
function startQuickStudy(topic) {
  const app = window.flashcardsApp;
  if (!app) return;
  
  // Find the topic in current level
  const levelData = PHYSICS_DATA.levels[app.currentLevel];
  if (!levelData) return;
  
  for (const [categoryName, categoryData] of Object.entries(levelData.categories)) {
    for (const [topicName, topicData] of Object.entries(categoryData.topics)) {
      if (topicName.toLowerCase().includes(topic) || 
          categoryName.toLowerCase().includes(topic)) {
        app.startStudySession(categoryName, topicName);
        return;
      }
    }
  }
}

// Global functions for HTML onclick handlers
function answerCard(difficulty) {
  window.flashcardsApp?.answerCard(difficulty);
}

function showHint() {
  window.flashcardsApp?.showHint();
}

function skipCard() {
  window.flashcardsApp?.skipCard();
}

function pauseStudy() {
  window.flashcardsApp?.pauseStudy();
}

function startNewSession() {
  window.flashcardsApp?.startNewSession();
}

function viewProgress() {
  window.flashcardsApp?.viewProgress();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.flashcardsApp = new FlashcardsApp();
});

// PWA install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (window.flashcardsApp) {
    window.flashcardsApp.deferredPrompt = e;
  }
});