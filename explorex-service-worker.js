/**
 * ExploreX Service Worker - PWA & Offline Capabilities
 * 
 * Advanced service worker providing:
 * - Offline experience caching and management
 * - Background sync for data updates
 * - Push notifications for space events
 * - Performance optimization with intelligent caching
 * - Network-first and cache-first strategies
 */

const CACHE_NAME = 'explorex-v1.0.0';
const OFFLINE_CACHE = 'explorex-offline-v1.0.0';
const DYNAMIC_CACHE = 'explorex-dynamic-v1.0.0';

// Core files to cache for offline functionality
const CORE_ASSETS = [
  '/',
  '/explorex.html',
  '/explorex-config.json',
  '/explorex-models.js',
  '/explorex-database.js',
  '/explorex-utils.js',
  '/explorex-location-services.js',
  '/explorex-search-engine.js',
  '/explorex-ui-components.js',
  '/explorex-user-system.js',
  '/explorex-itinerary-system.js',
  '/explorex-recommendation-engine.js',
  '/explorex-social-system.js',
  '/explorex-mobile-optimization.js',
  '/explorex-ui-styles.css',
  '/explorex-mobile-styles.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/experiences/,
  /\/api\/weather/,
  /\/api\/events/,
  /\/api\/locations/
];

// Images and media to cache dynamically
const MEDIA_CACHE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/,
  /\/images\//,
  /\/photos\//
];

// =============================================================================
// SERVICE WORKER INSTALLATION
// =============================================================================

self.addEventListener('install', event => {
  console.log('🔧 ExploreX Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache core assets
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching core assets...');
        return cache.addAll(CORE_ASSETS);
      }),
      
      // Initialize offline cache
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('💾 Initializing offline cache...');
        return cache.add('/offline.html');
      })
    ]).then(() => {
      console.log('✅ Service Worker installed successfully');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ Service Worker installation failed:', error);
    })
  );
});

// =============================================================================
// SERVICE WORKER ACTIVATION
// =============================================================================

self.addEventListener('activate', event => {
  console.log('🚀 ExploreX Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim(),
      
      // Initialize background sync
      initializeBackgroundSync()
    ]).then(() => {
      console.log('✅ Service Worker activated successfully');
    })
  );
});

// =============================================================================
// FETCH HANDLER - INTELLIGENT CACHING STRATEGIES
// =============================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isMediaRequest(request)) {
    event.respondWith(handleMediaRequest(request));
  } else if (isCoreAsset(request)) {
    event.respondWith(handleCoreAssetRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// =============================================================================
// CACHING STRATEGIES
// =============================================================================

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
  try {
    console.log('🌐 API Request:', request.url);
    
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('📱 Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle media requests with cache-first strategy
 */
async function handleMediaRequest(request) {
  try {
    // Try cache first for media
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('📷 Media request failed:', request.url);
    
    // Return placeholder image for failed media requests
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a1a2e"/><text x="50%" y="50%" text-anchor="middle" fill="#667eea" font-family="Arial" font-size="16">Image Unavailable Offline</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' }
      }
    );
  }
}

/**
 * Handle core assets with cache-first strategy
 */
async function handleCoreAssetRequest(request) {
  try {
    // Always try cache first for core assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network if not in cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('💾 Core asset request failed:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

/**
 * Handle generic requests with stale-while-revalidate strategy
 */
async function handleGenericRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      // Update cache in background
      networkPromise;
      return cachedResponse;
    }
    
    // Wait for network if no cache
    return await networkPromise || new Response('Offline', { status: 503 });
    
  } catch (error) {
    console.log('🌐 Generic request failed:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-user-data':
      event.waitUntil(syncUserData());
      break;
    case 'sync-reviews':
      event.waitUntil(syncReviews());
      break;
    case 'sync-photos':
      event.waitUntil(syncPhotos());
      break;
    case 'sync-itineraries':
      event.waitUntil(syncItineraries());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

/**
 * Sync user data when back online
 */
async function syncUserData() {
  try {
    console.log('👤 Syncing user data...');
    
    // Get pending user data from IndexedDB
    const pendingData = await getPendingUserData();
    
    for (const data of pendingData) {
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        // Remove from pending queue
        await removePendingUserData(data.id);
        
      } catch (error) {
        console.error('Failed to sync user data item:', error);
      }
    }
    
    console.log('✅ User data sync completed');
    
  } catch (error) {
    console.error('❌ User data sync failed:', error);
  }
}

/**
 * Sync reviews when back online
 */
async function syncReviews() {
  try {
    console.log('⭐ Syncing reviews...');
    
    const pendingReviews = await getPendingReviews();
    
    for (const review of pendingReviews) {
      try {
        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(review)
        });
        
        await removePendingReview(review.id);
        
      } catch (error) {
        console.error('Failed to sync review:', error);
      }
    }
    
    console.log('✅ Reviews sync completed');
    
  } catch (error) {
    console.error('❌ Reviews sync failed:', error);
  }
}

/**
 * Sync photos when back online
 */
async function syncPhotos() {
  try {
    console.log('📸 Syncing photos...');
    
    const pendingPhotos = await getPendingPhotos();
    
    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('photo', photo.file);
        formData.append('metadata', JSON.stringify(photo.metadata));
        
        await fetch('/api/photos', {
          method: 'POST',
          body: formData
        });
        
        await removePendingPhoto(photo.id);
        
      } catch (error) {
        console.error('Failed to sync photo:', error);
      }
    }
    
    console.log('✅ Photos sync completed');
    
  } catch (error) {
    console.error('❌ Photos sync failed:', error);
  }
}

/**
 * Sync itineraries when back online
 */
async function syncItineraries() {
  try {
    console.log('📅 Syncing itineraries...');
    
    const pendingItineraries = await getPendingItineraries();
    
    for (const itinerary of pendingItineraries) {
      try {
        await fetch('/api/itineraries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itinerary)
        });
        
        await removePendingItinerary(itinerary.id);
        
      } catch (error) {
        console.error('Failed to sync itinerary:', error);
      }
    }
    
    console.log('✅ Itineraries sync completed');
    
  } catch (error) {
    console.error('❌ Itineraries sync failed:', error);
  }
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  let notificationData = {
    title: 'ExploreX',
    body: 'New space exploration opportunity!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'explorex-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png'
        }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to the relevant page
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if request is for API endpoint
 */
function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is for media content
 */
function isMediaRequest(request) {
  return MEDIA_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is for core asset
 */
function isCoreAsset(request) {
  const url = new URL(request.url);
  return CORE_ASSETS.includes(url.pathname);
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [CACHE_NAME, OFFLINE_CACHE, DYNAMIC_CACHE];
  
  return Promise.all(
    cacheNames
      .filter(cacheName => !validCaches.includes(cacheName))
      .map(cacheName => {
        console.log('🗑️ Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      })
  );
}

/**
 * Initialize background sync
 */
async function initializeBackgroundSync() {
  // Register for background sync events
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('🔄 Background sync initialized');
  }
}

// =============================================================================
// INDEXEDDB HELPERS (Placeholder implementations)
// =============================================================================

async function getPendingUserData() {
  // Implementation would use IndexedDB to get pending user data
  return [];
}

async function removePendingUserData(id) {
  // Implementation would remove item from IndexedDB
  console.log('Removed pending user data:', id);
}

async function getPendingReviews() {
  // Implementation would use IndexedDB to get pending reviews
  return [];
}

async function removePendingReview(id) {
  // Implementation would remove review from IndexedDB
  console.log('Removed pending review:', id);
}

async function getPendingPhotos() {
  // Implementation would use IndexedDB to get pending photos
  return [];
}

async function removePendingPhoto(id) {
  // Implementation would remove photo from IndexedDB
  console.log('Removed pending photo:', id);
}

async function getPendingItineraries() {
  // Implementation would use IndexedDB to get pending itineraries
  return [];
}

async function removePendingItinerary(id) {
  // Implementation would remove itinerary from IndexedDB
  console.log('Removed pending itinerary:', id);
}

console.log('🚀 ExploreX Service Worker loaded and ready!');