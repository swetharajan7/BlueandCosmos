/**
 * ExploreX Machine Learning Algorithms
 * 
 * Advanced ML algorithms for recommendation and personalization:
 * - Matrix factorization for collaborative filtering
 * - Content-based similarity algorithms
 * - Clustering algorithms for user segmentation
 * - Real-time learning and adaptation
 * - Performance optimization and caching
 */

// =============================================================================
// MATRIX FACTORIZATION ENGINE
// =============================================================================

class MatrixFactorization {
  constructor(config = {}) {
    this.config = {
      factors: 50,
      learningRate: 0.01,
      regularization: 0.01,
      iterations: 100,
      convergenceThreshold: 0.001,
      ...config
    };
    
    this.userFeatures = null;
    this.itemFeatures = null;
    this.userBias = null;
    this.itemBias = null;
    this.globalMean = 0;
    this.isTrained = false;
  }

  /**
   * Train matrix factorization model
   */
  async train(interactionMatrix) {
    console.log('🎓 Training Matrix Factorization model...');
    
    const { users, items, ratings } = this.prepareData(interactionMatrix);
    const numUsers = users.length;
    const numItems = items.length;
    
    // Initialize feature matrices
    this.initializeMatrices(numUsers, numItems);
    
    // Calculate global mean
    this.globalMean = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    // Stochastic Gradient Descent
    for (let iter = 0; iter < this.config.iterations; iter++) {
      let totalError = 0;
      
      // Shuffle ratings for better convergence
      const shuffledRatings = this.shuffleArray([...ratings]);
      
      for (const { userId, itemId, rating } of shuffledRatings) {
        const userIdx = users.indexOf(userId);
        const itemIdx = items.indexOf(itemId);
        
        if (userIdx === -1 || itemIdx === -1) continue;
        
        // Predict rating
        const prediction = this.predictRating(userIdx, itemIdx);
        const error = rating - prediction;
        totalError += error * error;
        
        // Update biases
        const userBiasOld = this.userBias[userIdx];
        const itemBiasOld = this.itemBias[itemIdx];
        
        this.userBias[userIdx] += this.config.learningRate * 
          (error - this.config.regularization * userBiasOld);
        this.itemBias[itemIdx] += this.config.learningRate * 
          (error - this.config.regularization * itemBiasOld);
        
        // Update feature vectors
        for (let f = 0; f < this.config.factors; f++) {
          const userFeatureOld = this.userFeatures[userIdx][f];
          const itemFeatureOld = this.itemFeatures[itemIdx][f];
          
          this.userFeatures[userIdx][f] += this.config.learningRate * 
            (error * itemFeatureOld - this.config.regularization * userFeatureOld);
          this.itemFeatures[itemIdx][f] += this.config.learningRate * 
            (error * userFeatureOld - this.config.regularization * itemFeatureOld);
        }
      }
      
      const rmse = Math.sqrt(totalError / ratings.length);
      
      if (iter % 10 === 0) {
        console.log(`Iteration ${iter}: RMSE = ${rmse.toFixed(4)}`);
      }
      
      // Check convergence
      if (rmse < this.config.convergenceThreshold) {
        console.log(`Converged at iteration ${iter}`);
        break;
      }
    }
    
    this.isTrained = true;
    console.log('✅ Matrix Factorization training completed');
  }

  /**
   * Predict rating for user-item pair
   */
  predictRating(userIdx, itemIdx) {
    if (!this.isTrained) {
      throw new Error('Model must be trained before making predictions');
    }
    
    let prediction = this.globalMean + this.userBias[userIdx] + this.itemBias[itemIdx];
    
    // Dot product of user and item feature vectors
    for (let f = 0; f < this.config.factors; f++) {
      prediction += this.userFeatures[userIdx][f] * this.itemFeatures[itemIdx][f];
    }
    
    return Math.max(0, Math.min(5, prediction)); // Clamp to valid rating range
  }

  /**
   * Get recommendations for user
   */
  getRecommendations(userId, userList, itemList, numRecommendations = 10) {
    const userIdx = userList.indexOf(userId);
    if (userIdx === -1) {
      throw new Error('User not found in training data');
    }
    
    const recommendations = [];
    
    for (let itemIdx = 0; itemIdx < itemList.length; itemIdx++) {
      const itemId = itemList[itemIdx];
      const predictedRating = this.predictRating(userIdx, itemIdx);
      
      recommendations.push({
        itemId,
        predictedRating,
        confidence: this.calculateConfidence(userIdx, itemIdx)
      });
    }
    
    return recommendations
      .sort((a, b) => b.predictedRating - a.predictedRating)
      .slice(0, numRecommendations);
  }

  /**
   * Initialize feature matrices with random values
   */
  initializeMatrices(numUsers, numItems) {
    this.userFeatures = Array(numUsers).fill().map(() => 
      Array(this.config.factors).fill().map(() => Math.random() * 0.1)
    );
    
    this.itemFeatures = Array(numItems).fill().map(() => 
      Array(this.config.factors).fill().map(() => Math.random() * 0.1)
    );
    
    this.userBias = Array(numUsers).fill(0);
    this.itemBias = Array(numItems).fill(0);
  }

  /**
   * Prepare interaction data for training
   */
  prepareData(interactionMatrix) {
    const users = [...new Set(interactionMatrix.map(r => r.userId))];
    const items = [...new Set(interactionMatrix.map(r => r.itemId))];
    const ratings = interactionMatrix.map(r => ({
      userId: r.userId,
      itemId: r.itemId,
      rating: r.rating || r.score || 1
    }));
    
    return { users, items, ratings };
  }

  /**
   * Calculate confidence for prediction
   */
  calculateConfidence(userIdx, itemIdx) {
    // Calculate confidence based on feature vector magnitudes
    const userMagnitude = Math.sqrt(
      this.userFeatures[userIdx].reduce((sum, f) => sum + f * f, 0)
    );
    const itemMagnitude = Math.sqrt(
      this.itemFeatures[itemIdx].reduce((sum, f) => sum + f * f, 0)
    );
    
    return Math.min(1, (userMagnitude + itemMagnitude) / 2);
  }

  /**
   * Shuffle array for SGD
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// =============================================================================
// CONTENT-BASED SIMILARITY ENGINE
// =============================================================================

class ContentBasedSimilarity {
  constructor() {
    this.itemFeatures = new Map();
    this.similarityCache = new Map();
  }

  /**
   * Build content-based features for items
   */
  buildItemFeatures(items) {
    console.log('🔧 Building content-based features...');
    
    for (const item of items) {
      const features = this.extractFeatures(item);
      this.itemFeatures.set(item.id, features);
    }
    
    console.log(`✅ Built features for ${items.length} items`);
  }

  /**
   * Extract features from item
   */
  extractFeatures(item) {
    const features = {
      // Categorical features (one-hot encoded)
      type: this.oneHotEncode(item.type, ['observatory', 'planetarium', 'museum', 'space-center']),
      
      // Numerical features (normalized)
      price: this.normalize(item.price || 0, 0, 200),
      rating: this.normalize(item.rating || 0, 0, 5),
      duration: this.normalize(item.duration || 0, 0, 480), // 8 hours max
      
      // Boolean features
      indoor: item.indoor ? 1 : 0,
      familyFriendly: item.familyFriendly ? 1 : 0,
      wheelchairAccessible: item.accessibility?.includes('wheelchair') ? 1 : 0,
      
      // Text features (TF-IDF simplified)
      textFeatures: this.extractTextFeatures(item.description || ''),
      
      // Location features
      locationFeatures: this.extractLocationFeatures(item.location)
    };
    
    return this.flattenFeatures(features);
  }

  /**
   * One-hot encode categorical variable
   */
  oneHotEncode(value, categories) {
    return categories.map(cat => cat === value ? 1 : 0);
  }

  /**
   * Normalize numerical value
   */
  normalize(value, min, max) {
    return max > min ? (value - min) / (max - min) : 0;
  }

  /**
   * Extract text features using simple TF-IDF
   */
  extractTextFeatures(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const wordCounts = new Map();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    // Return top 10 most frequent words as features
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => count / words.length);
  }

  /**
   * Extract location features
   */
  extractLocationFeatures(location) {
    if (!location) return [0, 0, 0];
    
    return [
      this.normalize(location.latitude || 0, -90, 90),
      this.normalize(location.longitude || 0, -180, 180),
      location.urban ? 1 : 0
    ];
  }

  /**
   * Flatten nested features into single array
   */
  flattenFeatures(features) {
    const flattened = [];
    
    for (const [key, value] of Object.entries(features)) {
      if (Array.isArray(value)) {
        flattened.push(...value);
      } else {
        flattened.push(value);
      }
    }
    
    return flattened;
  }

  /**
   * Calculate cosine similarity between two items
   */
  calculateSimilarity(itemId1, itemId2) {
    const cacheKey = `${itemId1}-${itemId2}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }
    
    const features1 = this.itemFeatures.get(itemId1);
    const features2 = this.itemFeatures.get(itemId2);
    
    if (!features1 || !features2) return 0;
    
    const similarity = this.cosineSimilarity(features1, features2);
    this.similarityCache.set(cacheKey, similarity);
    
    return similarity;
  }

  /**
   * Calculate cosine similarity between two feature vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Get similar items for given item
   */
  getSimilarItems(itemId, numSimilar = 10) {
    const similarities = [];
    
    for (const [otherItemId] of this.itemFeatures) {
      if (otherItemId === itemId) continue;
      
      const similarity = this.calculateSimilarity(itemId, otherItemId);
      similarities.push({ itemId: otherItemId, similarity });
    }
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, numSimilar);
  }

  /**
   * Get content-based recommendations for user profile
   */
  getRecommendations(userProfile, numRecommendations = 10) {
    const userVector = this.buildUserVector(userProfile);
    const recommendations = [];
    
    for (const [itemId, itemFeatures] of this.itemFeatures) {
      // Skip items user has already interacted with
      if (userProfile.interactedItems?.has(itemId)) continue;
      
      const similarity = this.cosineSimilarity(userVector, itemFeatures);
      recommendations.push({ itemId, score: similarity });
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, numRecommendations);
  }

  /**
   * Build user vector from interaction history
   */
  buildUserVector(userProfile) {
    const interactedItems = userProfile.interactedItems || new Set();
    const preferences = userProfile.preferences || new Map();
    
    if (interactedItems.size === 0) {
      // Return zero vector for new users
      const sampleFeatures = this.itemFeatures.values().next().value;
      return new Array(sampleFeatures.length).fill(0);
    }
    
    // Weighted average of interacted item features
    const userVector = new Array(this.itemFeatures.values().next().value.length).fill(0);
    let totalWeight = 0;
    
    for (const itemId of interactedItems) {
      const itemFeatures = this.itemFeatures.get(itemId);
      const weight = preferences.get(itemId) || 1;
      
      if (itemFeatures) {
        for (let i = 0; i < itemFeatures.length; i++) {
          userVector[i] += itemFeatures[i] * weight;
        }
        totalWeight += weight;
      }
    }
    
    // Normalize by total weight
    if (totalWeight > 0) {
      for (let i = 0; i < userVector.length; i++) {
        userVector[i] /= totalWeight;
      }
    }
    
    return userVector;
  }
}

// =============================================================================
// CLUSTERING ENGINE
// =============================================================================

class ClusteringEngine {
  constructor(config = {}) {
    this.config = {
      k: 5, // Number of clusters
      maxIterations: 100,
      convergenceThreshold: 0.001,
      ...config
    };
    
    this.centroids = [];
    this.clusters = [];
    this.isTrained = false;
  }

  /**
   * Perform K-means clustering on user data
   */
  async clusterUsers(userData) {
    console.log('🎯 Performing K-means clustering...');
    
    const dataPoints = this.prepareUserData(userData);
    
    // Initialize centroids randomly
    this.initializeCentroids(dataPoints);
    
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Assign points to clusters
      const newClusters = this.assignPointsToClusters(dataPoints);
      
      // Update centroids
      const newCentroids = this.updateCentroids(newClusters);
      
      // Check convergence
      const centroidShift = this.calculateCentroidShift(this.centroids, newCentroids);
      
      this.clusters = newClusters;
      this.centroids = newCentroids;
      
      if (centroidShift < this.config.convergenceThreshold) {
        console.log(`K-means converged at iteration ${iter}`);
        break;
      }
    }
    
    this.isTrained = true;
    console.log('✅ K-means clustering completed');
    
    return this.analyzeClusters();
  }

  /**
   * Prepare user data for clustering
   */
  prepareUserData(userData) {
    return userData.map(user => ({
      userId: user.id,
      features: this.extractUserFeatures(user)
    }));
  }

  /**
   * Extract features from user for clustering
   */
  extractUserFeatures(user) {
    return [
      user.preferences?.experienceTypes?.observatory || 0,
      user.preferences?.experienceTypes?.planetarium || 0,
      user.preferences?.experienceTypes?.museum || 0,
      user.preferences?.budgetRange || 0,
      user.interactionCount || 0,
      user.averageRating || 0
    ];
  }

  /**
   * Initialize centroids randomly
   */
  initializeCentroids(dataPoints) {
    const numFeatures = dataPoints[0].features.length;
    this.centroids = [];
    
    for (let i = 0; i < this.config.k; i++) {
      const centroid = [];
      for (let j = 0; j < numFeatures; j++) {
        const values = dataPoints.map(p => p.features[j]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        centroid.push(Math.random() * (max - min) + min);
      }
      this.centroids.push(centroid);
    }
  }

  /**
   * Assign data points to nearest centroids
   */
  assignPointsToClusters(dataPoints) {
    const clusters = Array(this.config.k).fill().map(() => []);
    
    for (const point of dataPoints) {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < this.centroids.length; i++) {
        const distance = this.euclideanDistance(point.features, this.centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(point);
    }
    
    return clusters;
  }

  /**
   * Update centroids based on cluster assignments
   */
  updateCentroids(clusters) {
    const newCentroids = [];
    
    for (const cluster of clusters) {
      if (cluster.length === 0) {
        // Keep old centroid if cluster is empty
        newCentroids.push([...this.centroids[newCentroids.length]]);
        continue;
      }
      
      const numFeatures = cluster[0].features.length;
      const centroid = new Array(numFeatures).fill(0);
      
      for (const point of cluster) {
        for (let i = 0; i < numFeatures; i++) {
          centroid[i] += point.features[i];
        }
      }
      
      for (let i = 0; i < numFeatures; i++) {
        centroid[i] /= cluster.length;
      }
      
      newCentroids.push(centroid);
    }
    
    return newCentroids;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  euclideanDistance(point1, point2) {
    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate centroid shift for convergence check
   */
  calculateCentroidShift(oldCentroids, newCentroids) {
    let totalShift = 0;
    
    for (let i = 0; i < oldCentroids.length; i++) {
      totalShift += this.euclideanDistance(oldCentroids[i], newCentroids[i]);
    }
    
    return totalShift / oldCentroids.length;
  }

  /**
   * Analyze clusters and generate insights
   */
  analyzeClusters() {
    const analysis = [];
    
    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i];
      const centroid = this.centroids[i];
      
      analysis.push({
        clusterId: i,
        size: cluster.length,
        centroid: centroid,
        characteristics: this.describeCluster(centroid),
        users: cluster.map(p => p.userId)
      });
    }
    
    return analysis;
  }

  /**
   * Describe cluster characteristics
   */
  describeCluster(centroid) {
    const [observatory, planetarium, museum, budget, interactions, rating] = centroid;
    
    let description = '';
    
    if (observatory > 0.5) description += 'Observatory enthusiasts, ';
    if (planetarium > 0.5) description += 'Planetarium lovers, ';
    if (museum > 0.5) description += 'Museum visitors, ';
    if (budget > 100) description += 'High budget, ';
    if (interactions > 50) description += 'Highly active, ';
    if (rating > 4) description += 'High raters';
    
    return description || 'General space enthusiasts';
  }

  /**
   * Get cluster for specific user
   */
  getUserCluster(userId) {
    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i];
      if (cluster.some(point => point.userId === userId)) {
        return i;
      }
    }
    return -1; // User not found
  }
}

// =============================================================================
// REAL-TIME LEARNING ENGINE
// =============================================================================

class RealTimeLearning {
  constructor() {
    this.learningRate = 0.01;
    this.decayFactor = 0.99;
    this.updateQueue = [];
    this.isProcessing = false;
  }

  /**
   * Queue real-time update
   */
  queueUpdate(update) {
    this.updateQueue.push({
      ...update,
      timestamp: Date.now()
    });
    
    if (!this.isProcessing) {
      this.processUpdates();
    }
  }

  /**
   * Process queued updates
   */
  async processUpdates() {
    this.isProcessing = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      await this.applyUpdate(update);
    }
    
    this.isProcessing = false;
  }

  /**
   * Apply single update to models
   */
  async applyUpdate(update) {
    // Apply incremental learning update
    console.log('🔄 Applying real-time update:', update.type);
    
    // This would update the actual ML models incrementally
    // For now, we'll just log the update
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXMLAlgorithms = {
  MatrixFactorization,
  ContentBasedSimilarity,
  ClusteringEngine,
  RealTimeLearning
};

console.log('🤖 ExploreX ML Algorithms loaded');