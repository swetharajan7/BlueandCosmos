// STEM Flashcards Application Logic
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

    // NotebookLM integration
    document.getElementById('notebookLMBtn')?.addEventListener('click', () => {
      this.openNotebookLM(this.getCurrentTopic());
    });

    // Custom flashcard creation
    document.getElementById('createCardsBtn')?.addEventListener('click', () => {
      this.openFlashcardCreator();
    });

    document.getElementById('notebookLMCreateBtn')?.addEventListener('click', () => {
      this.openNotebookLMCreator();
    });

    document.getElementById('notebookLMAudioBtn')?.addEventListener('click', () => {
      this.generateAudioSummary();
    });

    document.getElementById('closeCreator')?.addEventListener('click', () => {
      this.closeFlashcardCreator();
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
    const levelData = STEM_DATA.levels[this.currentLevel];
    
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
    const topicData = STEM_DATA.levels[level]?.categories[category]?.topics[topic];
    if (!topicData) return { studied: 0, total: 0 };
    
    const total = topicData.cards.length;
    const studied = topicData.cards.filter(card => 
      this.userProgress[card.id]?.lastStudied
    ).length;
    
    return { studied, total };
  }
  
  startStudySession(category, topic) {
    const topicData = STEM_DATA.levels[this.currentLevel]?.categories[category]?.topics[topic];
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

  // NotebookLM Integration
  openNotebookLM(topic = null, cardContent = null) {
    let notebookLMUrl = 'https://notebooklm.google.com/';
    
    // If we have specific content, we can create a more targeted experience
    if (topic || cardContent) {
      const searchQuery = cardContent ? 
        `${cardContent.question} ${cardContent.answer} ${cardContent.explanation || ''}` : 
        `${topic} STEM education study guide`;
      
      // Create a study prompt for NotebookLM
      const studyPrompt = `Study Topic: ${topic || 'STEM Concepts'}\n\n`;
      const cardInfo = cardContent ? 
        `Question: ${cardContent.question}\nAnswer: ${cardContent.answer}\nExplanation: ${cardContent.explanation || 'N/A'}\n\n` : '';
      
      const fullPrompt = studyPrompt + cardInfo + 
        'Please help me understand this concept better and create study materials.';
      
      // Store the prompt in sessionStorage for NotebookLM to potentially use
      sessionStorage.setItem('flashcard_study_prompt', fullPrompt);
    }
    
    // Open NotebookLM in new tab
    window.open(notebookLMUrl, '_blank', 'noopener,noreferrer');
    
    // Track usage
    this.trackNotebookLMUsage(topic, cardContent);
  }

  trackNotebookLMUsage(topic, cardContent) {
    console.log('NotebookLM opened for:', topic || 'general study');
    
    // Add to observation log
    this.addToLog(`Opened NotebookLM for ${topic || 'current topic'}`);
  }

  getCurrentCardContent() {
    if (this.currentCardIndex < this.currentCards.length) {
      return this.currentCards[this.currentCardIndex];
    }
    return null;
  }

  getCurrentTopic() {
    return this.currentTopic ? 
      `${this.currentTopic.category} - ${this.currentTopic.topic}` : 
      'STEM Flashcards';
  }

  // Custom Flashcard Creation System
  openFlashcardCreator() {
    document.getElementById('flashcardCreator').style.display = 'flex';
    this.initializeCreatorForm();
  }

  closeFlashcardCreator() {
    document.getElementById('flashcardCreator').style.display = 'none';
    this.resetCreatorForm();
  }

  openNotebookLMCreator() {
    // Open NotebookLM with instructions for creating flashcards
    const prompt = `I want to create educational flashcards. Please help me:

1. Generate question and answer pairs for my study topic
2. Create detailed explanations for complex concepts
3. Suggest multimedia elements (images, audio descriptions)
4. Organize content by difficulty level

Topic: ${this.getCurrentTopic()}

Please provide structured content that I can use to create comprehensive flashcards.`;

    sessionStorage.setItem('flashcard_creation_prompt', prompt);
    this.openNotebookLM('Flashcard Creation', { question: prompt, answer: '', explanation: '' });
  }

  generateAudioSummary() {
    const currentCard = this.getCurrentCardContent();
    if (currentCard) {
      const audioPrompt = `Create an audio summary script for this flashcard:

Question: ${currentCard.question}
Answer: ${currentCard.answer}
Explanation: ${currentCard.explanation || 'N/A'}

Please provide a clear, engaging script that could be used for audio narration, including:
- Clear pronunciation guides for technical terms
- Natural speaking rhythm and pauses
- Emphasis on key concepts
- Estimated speaking time`;

      sessionStorage.setItem('audio_summary_prompt', audioPrompt);
      this.openNotebookLM('Audio Summary Generation', currentCard);
    } else {
      alert('Please select a flashcard first to generate an audio summary.');
    }
  }

  initializeCreatorForm() {
    // Initialize form event listeners
    const form = document.getElementById('creatorForm');
    const imageInput = document.getElementById('cardImage');
    const audioInput = document.getElementById('cardAudio');
    const videoInput = document.getElementById('cardVideo');

    // Form submission
    form?.addEventListener('submit', (e) => this.handleFormSubmission(e));

    // Media preview handlers
    imageInput?.addEventListener('change', (e) => this.handleImageUpload(e));
    audioInput?.addEventListener('change', (e) => this.handleAudioUpload(e));
    videoInput?.addEventListener('change', (e) => this.handleVideoUpload(e));

    // AI enhancement buttons
    document.getElementById('enhanceWithAI')?.addEventListener('click', () => this.enhanceWithAI());
    document.getElementById('generateAudioSummary')?.addEventListener('click', () => this.generateAudioForCard());
    document.getElementById('createVariations')?.addEventListener('click', () => this.createVariations());

    // Record buttons
    document.getElementById('recordAudioBtn')?.addEventListener('click', () => this.recordAudio());
    document.getElementById('recordVideoBtn')?.addEventListener('click', () => this.recordVideo());

    // Preview button
    document.getElementById('previewCard')?.addEventListener('click', () => this.previewCustomCard());
  }

  handleFormSubmission(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const cardData = this.extractCardData(formData);
    this.saveCustomCard(cardData);
  }

  extractCardData(formData) {
    return {
      id: 'custom_' + Date.now(),
      type: 'Custom',
      question: formData.get('question'),
      answer: formData.get('answer'),
      explanation: formData.get('explanation'),
      category: formData.get('category'),
      tags: formData.get('tags')?.split(',').map(tag => tag.trim()) || [],
      difficulty: parseInt(formData.get('difficulty')),
      media: {
        image: this.processedMedia?.image || null,
        audio: this.processedMedia?.audio || null,
        video: this.processedMedia?.video || null
      },
      created: new Date().toISOString(),
      lastStudied: null,
      nextReview: null
    };
  }

  saveCustomCard(cardData) {
    // Save to localStorage
    const customCards = JSON.parse(localStorage.getItem('custom_flashcards') || '[]');
    customCards.push(cardData);
    localStorage.setItem('custom_flashcards', JSON.stringify(customCards));

    // Add to current study session if applicable
    this.addToLog(`Created custom flashcard: ${cardData.question.substring(0, 50)}...`);

    // Show success message
    alert('✅ Custom flashcard created successfully!');
    this.closeFlashcardCreator();
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 100px; border-radius: 4px;">`;
        
        if (!this.processedMedia) this.processedMedia = {};
        this.processedMedia.image = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  handleAudioUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const preview = document.getElementById('audioPreview');
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.style.width = '100%';
      audio.src = URL.createObjectURL(file);
      preview.innerHTML = '';
      preview.appendChild(audio);

      if (!this.processedMedia) this.processedMedia = {};
      this.processedMedia.audio = URL.createObjectURL(file);
    }
  }

  handleVideoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const preview = document.getElementById('videoPreview');
      const video = document.createElement('video');
      video.controls = true;
      video.style.width = '100%';
      video.style.maxHeight = '100px';
      video.src = URL.createObjectURL(file);
      preview.innerHTML = '';
      preview.appendChild(video);

      if (!this.processedMedia) this.processedMedia = {};
      this.processedMedia.video = URL.createObjectURL(file);
    }
  }

  enhanceWithAI() {
    const question = document.getElementById('cardQuestion').value;
    const answer = document.getElementById('cardAnswer').value;

    if (!question && !answer) {
      alert('Please enter at least a question or answer to enhance with AI.');
      return;
    }

    const enhancementPrompt = `Please enhance this flashcard content:

Question: ${question || '[Please suggest a question]'}
Answer: ${answer || '[Please provide an answer]'}

Please help me:
1. Improve the question to be more engaging and educational
2. Enhance the answer with clear, accurate information
3. Add a detailed explanation with examples
4. Suggest related concepts or follow-up questions
5. Recommend visual or audio elements that would help learning

Focus on making this content suitable for STEM education.`;

    sessionStorage.setItem('flashcard_enhancement_prompt', enhancementPrompt);
    this.openNotebookLM('Flashcard Enhancement', { question: enhancementPrompt, answer: '', explanation: '' });
  }

  generateAudioForCard() {
    const question = document.getElementById('cardQuestion').value;
    const answer = document.getElementById('cardAnswer').value;

    if (!question || !answer) {
      alert('Please enter both question and answer to generate audio summary.');
      return;
    }

    const audioPrompt = `Create an audio narration script for this flashcard:

Question: ${question}
Answer: ${answer}

Please provide:
1. A clear, engaging narration script
2. Pronunciation guides for technical terms
3. Natural pauses and emphasis markers
4. Estimated reading time
5. Tips for effective audio delivery

Make it suitable for educational audio content.`;

    sessionStorage.setItem('audio_generation_prompt', audioPrompt);
    this.openNotebookLM('Audio Script Generation', { question: audioPrompt, answer: '', explanation: '' });
  }

  createVariations() {
    const question = document.getElementById('cardQuestion').value;
    const answer = document.getElementById('cardAnswer').value;

    if (!question || !answer) {
      alert('Please enter both question and answer to create variations.');
      return;
    }

    const variationPrompt = `Create multiple variations of this flashcard:

Original Question: ${question}
Original Answer: ${answer}

Please create:
1. 3-5 different ways to ask the same concept
2. Varying difficulty levels (easier and harder versions)
3. Different question formats (multiple choice, fill-in-blank, etc.)
4. Related questions that test connected concepts
5. Real-world application questions

This will help create a comprehensive study set.`;

    sessionStorage.setItem('variation_prompt', variationPrompt);
    this.openNotebookLM('Flashcard Variations', { question: variationPrompt, answer: '', explanation: '' });
  }

  recordAudio() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Audio recording implementation would go here
          alert('🎤 Audio recording feature coming soon! For now, you can upload audio files or use NotebookLM to generate audio scripts.');
        })
        .catch(err => {
          alert('Microphone access denied. Please upload an audio file instead.');
        });
    } else {
      alert('Audio recording not supported in this browser. Please upload an audio file.');
    }
  }

  recordVideo() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          // Video recording implementation would go here
          alert('📹 Video recording feature coming soon! For now, you can upload video files.');
        })
        .catch(err => {
          alert('Camera access denied. Please upload a video file instead.');
        });
    } else {
      alert('Video recording not supported in this browser. Please upload a video file.');
    }
  }

  previewCustomCard() {
    const question = document.getElementById('cardQuestion').value;
    const answer = document.getElementById('cardAnswer').value;
    const explanation = document.getElementById('cardExplanation').value;

    if (!question || !answer) {
      alert('Please enter at least a question and answer to preview.');
      return;
    }

    // Create a temporary preview (you could enhance this with a modal)
    const preview = `
📝 FLASHCARD PREVIEW

Question: ${question}

Answer: ${answer}

${explanation ? `Explanation: ${explanation}` : ''}

${this.processedMedia?.image ? '📷 Image attached' : ''}
${this.processedMedia?.audio ? '🎵 Audio attached' : ''}
${this.processedMedia?.video ? '🎬 Video attached' : ''}
    `;

    alert(preview);
  }

  resetCreatorForm() {
    document.getElementById('creatorForm')?.reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('audioPreview').innerHTML = '';
    document.getElementById('videoPreview').innerHTML = '';
    this.processedMedia = null;
  }

  loadCustomCards() {
    const customCards = JSON.parse(localStorage.getItem('custom_flashcards') || '[]');
    return customCards;
  }
}

// Quick study functions for welcome screen buttons
function startQuickStudy(topic) {
  const app = window.flashcardsApp;
  if (!app) return;
  
  // Find the topic in current level
  const levelData = STEM_DATA.levels[app.currentLevel];
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

function openNotebookLMForCard() {
  const app = window.flashcardsApp;
  if (app) {
    const currentCard = app.getCurrentCardContent();
    const currentTopic = app.getCurrentTopic();
    app.openNotebookLM(currentTopic, currentCard);
  }
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