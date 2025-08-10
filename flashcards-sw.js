// Service Worker for Offline Functionality
const CACHE_NAME = 'physics-flashcards-v1';
const urlsToCache = [
  '/flashcards.html',
  '/flashcards.css',
  '/flashcards-app.js',
  '/flashcards-data.js',
  '/flashcards-sw-register.js',
  '/newsletter-component.css',
  '/newsletter-component.js',
  '/maximus.js',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap',
  'https://cdn.jsdelivr.net/gh/swetharajan7/blueandcosmos/assets/logo-transparent.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});