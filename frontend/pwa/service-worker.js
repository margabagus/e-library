// Service Worker for E-Library PWA

const CACHE_NAME = 'e-library-v1';
const BOOK_CACHE_PREFIX = 'book-content-';

// Files to cache for the application shell
const appShellFiles = [
  '/',
  '/index.php',
  '/assets/css/main.css',
  '/assets/css/responsive.css',
  '/assets/css/reader.css',
  '/assets/js/app.js',
  '/assets/js/auth.js',
  '/assets/js/catalog.js',
  '/assets/js/reader.js',
  '/assets/js/offline.js',
  '/assets/images/logo.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/pwa/manifest.json',
  '/components/header.php',
  '/components/footer.php',
  '/components/sidebar.php',
  '/components/book-card.php',
  '/pages/home.php',
  '/pages/catalog.php',
  '/pages/reader.php',
  '/pages/login.php',
  '/pages/register.php',
  '/offline.html'
];

// URLs to exclude from caching
const excludeFromCache = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/analytics'
];

// Install event - Cache application shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(appShellFiles);
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && !key.startsWith(BOOK_CACHE_PREFIX)) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - Network with cache fallback strategy
self.addEventListener('fetch', (event) => {
  // Skip excluded URLs
  if (excludeFromCache.some(url => event.request.url.includes(url))) {
    return;
  }

  // For book content API requests with cache-first strategy
  if (event.request.url.includes('/api/books/content/')) {
    event.respondWith(handleBookContentRequest(event.request));
    return;
  }

  // For catalog API requests with stale-while-revalidate strategy
  if (event.request.url.includes('/api/catalog/') || event.request.url.includes('/api/books')) {
    event.respondWith(handleCatalogRequest(event.request));
    return;
  }

  // For regular navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the response is valid, clone it and store it in the cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network request fails, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If we're trying to navigate to a page but it's not cached,
          // show the offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          return new Response(null, {
            status: 404,
            statusText: 'Not Found'
          });
        });
      })
  );
});

// Handle book content requests with cache-first strategy
async function handleBookContentRequest(request) {
  const bookId = getBookIdFromUrl(request.url);
  const cacheName = `${BOOK_CACHE_PREFIX}${bookId}`;
  
  // Try to get from cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Refresh cache in the background
    updateBookCache(request, cacheName);
    return cachedResponse;
  }

  // If not in cache, fetch from network and cache
  try {
    const response = await fetch(request);
    const responseToCache = response.clone();
    const cache = await caches.open(cacheName);
    cache.put(request, responseToCache);
    
    // Also store the timestamp when this book was cached
    await storeBookCacheTimestamp(bookId);
    
    return response;
  } catch (error) {
    // If network fails and no cache, show error
    return new Response(JSON.stringify({ error: 'Book content unavailable offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle catalog requests with stale-while-revalidate strategy
async function handleCatalogRequest(request) {
  const cachedResponse = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    // Update cache with new response
    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, responseToCache);
    });
    return response;
  }).catch(() => {
    // Return offline response if fetch fails and no cache
    if (!cachedResponse) {
      return new Response(JSON.stringify({ error: 'Catalog unavailable offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Return the cached response immediately or wait for the network response
  return cachedResponse || fetchPromise;
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  // Try the network first
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // If offline, try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If the page is not in cache, show offline page
    return caches.match('/offline.html');
  }
}

// Background sync for analytics data when coming back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalyticsData());
  }
});

// Helper function to extract book ID from URL
function getBookIdFromUrl(url) {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
}

// Helper function to update book cache in the background
async function updateBookCache(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    console.log('[Service Worker] Updated book cache', cacheName);
  } catch (error) {
    console.error('[Service Worker] Failed to update book cache', error);
  }
}

// Store timestamp when a book was cached
async function storeBookCacheTimestamp(bookId) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['bookCacheInfo'], 'readwrite');
    const store = transaction.objectStore('bookCacheInfo');
    
    await store.put({
      bookId: bookId,
      timestamp: Date.now()
    });
    
    db.close();
  } catch (error) {
    console.error('[Service Worker] Failed to store book cache timestamp', error);
  }
}

// Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('e-library-db', 1);
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('bookCacheInfo')) {
        db.createObjectStore('bookCacheInfo', { keyPath: 'bookId' });
      }
      
      if (!db.objectStoreNames.contains('offlineAnalytics')) {
        db.createObjectStore('offlineAnalytics', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    
    request.onerror = function(event) {
      reject('IndexedDB error: ' + event.target.errorCode);
    };
  });
}

// Sync analytics data when coming back online
async function syncAnalyticsData() {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineAnalytics'], 'readwrite');
    const store = transaction.objectStore('offlineAnalytics');
    
    // Get all pending analytics data
    const analyticsData = await getAllFromStore(store);
    
    if (analyticsData.length === 0) {
      return;
    }
    
    // Send analytics data to the server
    const response = await fetch('/api/analytics/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsData)
    });
    
    if (response.ok) {
      // Clear synced data
      const clearTransaction = db.transaction(['offlineAnalytics'], 'readwrite');
      const clearStore = clearTransaction.objectStore('offlineAnalytics');
      await clearStore.clear();
      console.log('[Service Worker] Analytics data synced successfully');
    }
    
    db.close();
  } catch (error) {
    console.error('[Service Worker] Failed to sync analytics data', error);
    // Will retry on next sync event
  }
}

// Helper function to get all items from an object store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

// Message event - Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data.action === 'cacheBook') {
    // Cache a book for offline reading
    event.waitUntil(cacheBookForOffline(event.data.bookId, event.data.bookUrl));
  } else if (event.data.action === 'clearBookCache') {
    // Remove a book from cache
    event.waitUntil(clearBookCache(event.data.bookId));
  } else if (event.data.action === 'storeAnalytics') {
    // Store analytics data while offline
    event.waitUntil(storeOfflineAnalytics(event.data.analyticsData));
  }
});

// Cache a complete book for offline reading
async function cacheBookForOffline(bookId, bookUrl) {
  try {
    const cacheName = `${BOOK_CACHE_PREFIX}${bookId}`;
    const cache = await caches.open(cacheName);
    
    // Cache book content
    const response = await fetch(bookUrl);
    await cache.put(bookUrl, response.clone());
    
    // Cache book resources (images, etc.) - if metadata URL is provided
    if (event.data.resourceUrls && Array.isArray(event.data.resourceUrls)) {
      for (const url of event.data.resourceUrls) {
        try {
          const resourceResponse = await fetch(url);
          await cache.put(url, resourceResponse);
        } catch (error) {
          console.error(`[Service Worker] Failed to cache resource: ${url}`, error);
        }
      }
    }
    
    // Store timestamp
    await storeBookCacheTimestamp(bookId);
    
    // Notify the client that caching is complete
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        action: 'bookCached',
        bookId: bookId,
        success: true
      });
    }
  } catch (error) {
    console.error('[Service Worker] Failed to cache book', error);
    
    // Notify the client of the failure
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        action: 'bookCached',
        bookId: bookId,
        success: false,
        error: error.message
      });
    }
  }
}

// Clear a book's cache
async function clearBookCache(bookId) {
  try {
    const cacheName = `${BOOK_CACHE_PREFIX}${bookId}`;
    await caches.delete(cacheName);
    
    // Remove from IndexedDB
    const db = await openIndexedDB();
    const transaction = db.transaction(['bookCacheInfo'], 'readwrite');
    const store = transaction.objectStore('bookCacheInfo');
    await store.delete(bookId);
    db.close();
    
    console.log('[Service Worker] Book cache cleared', bookId);
    
    // Notify clients
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        action: 'bookCacheCleared',
        bookId: bookId,
        success: true
      });
    }
  } catch (error) {
    console.error('[Service Worker] Failed to clear book cache', error);
  }
}

// Store analytics data while offline
async function storeOfflineAnalytics(analyticsData) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(['offlineAnalytics'], 'readwrite');
    const store = transaction.objectStore('offlineAnalytics');
    
    // Add timestamp to data
    analyticsData.timestamp = Date.now();
    await store.add(analyticsData);
    
    db.close();
    console.log('[Service Worker] Analytics data stored for offline sync');
    
    // Register sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-analytics');
    }
  } catch (error) {
    console.error('[Service Worker] Failed to store analytics data', error);
  }
}

// Periodic cleanup of old book caches
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldBookCaches());
  }
});

// Cleanup old book caches based on last access time
async function cleanupOldBookCaches() {
  try {
    // Get all cache keys
    const cacheKeys = await caches.keys();
    const bookCacheKeys = cacheKeys.filter(key => key.startsWith(BOOK_CACHE_PREFIX));
    
    // Get book cache info from IndexedDB
    const db = await openIndexedDB();
    const transaction = db.transaction(['bookCacheInfo'], 'readonly');
    const store = transaction.objectStore('bookCacheInfo');
    const bookCacheInfo = await getAllFromStore(store);
    db.close();
    
    // Set threshold to 30 days
    const thresholdTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Identify old caches
    for (const key of bookCacheKeys) {
      const bookId = key.replace(BOOK_CACHE_PREFIX, '');
      const cacheInfo = bookCacheInfo.find(info => info.bookId === bookId);
      
      // If no cache info or old timestamp, delete the cache
      if (!cacheInfo || cacheInfo.timestamp < thresholdTime) {
        await caches.delete(key);
        console.log('[Service Worker] Cleaned up old book cache', key);
        
        // Also remove from IndexedDB if entry exists
        if (cacheInfo) {
          const deleteDb = await openIndexedDB();
          const deleteTx = deleteDb.transaction(['bookCacheInfo'], 'readwrite');
          const deleteStore = deleteTx.objectStore('bookCacheInfo');
          await deleteStore.delete(bookId);
          deleteDb.close();
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to cleanup old caches', error);
  }
}