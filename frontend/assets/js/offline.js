/**
 * E-Library Offline Module
 * Handles offline book storage and synchronization
 */
class OfflineManager {
    constructor() {
      this.dbName = 'e-library-offline';
      this.dbVersion = 1;
      this.db = null;
      
      // Initialize IndexedDB
      this.initDB().then(() => {
        this.checkRegisteredServiceWorker();
      }).catch(error => {
        console.error('Failed to initialize offline database:', error);
      });
    }
    
    /**
     * Initialize IndexedDB for offline storage
     */
    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        // Create schema on first time or upgrade
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Books store for book metadata
          if (!db.objectStoreNames.contains('books')) {
            const booksStore = db.createObjectStore('books', { keyPath: 'id' });
            booksStore.createIndex('category', 'category_id', { unique: false });
            booksStore.createIndex('format', 'format', { unique: false });
          }
          
          // Book content store for book data
          if (!db.objectStoreNames.contains('bookContent')) {
            db.createObjectStore('bookContent', { keyPath: 'id' });
          }
          
          // Reading progress store
          if (!db.objectStoreNames.contains('readingProgress')) {
            const progressStore = db.createObjectStore('readingProgress', { keyPath: 'bookId' });
            progressStore.createIndex('lastRead', 'lastRead', { unique: false });
          }
          
          // Analytics queue for data syncing
          if (!db.objectStoreNames.contains('analyticsQueue')) {
            db.createObjectStore('analyticsQueue', { keyPath: 'id', autoIncrement: true });
          }
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve();
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    }
    
    /**
     * Check if service worker is registered and available
     */
    checkRegisteredServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          console.log('Service Worker is ready:', reg.scope);
          this.serviceWorkerReady = true;
        }).catch(error => {
          console.error('Service Worker not ready:', error);
        });
      }
    }
    
    /**
     * Save book metadata for offline access
     * @param {Object} book - Book metadata object
     */
    async saveBookMetadata(book) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('books', 'readwrite');
        const store = transaction.objectStore('books');
        
        const request = store.put(book);
        
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Save book content for offline access
     * @param {string} bookId - Book ID
     * @param {ArrayBuffer} content - Book content as ArrayBuffer
     * @param {string} format - Book format (pdf, epub, mobi)
     */
    async saveBookContent(bookId, content, format) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('bookContent', 'readwrite');
        const store = transaction.objectStore('bookContent');
        
        const request = store.put({
          id: bookId,
          content: content,
          format: format,
          savedAt: new Date()
        });
        
        request.onsuccess = () => {
          // Notify service worker to cache required resources
          this.notifyServiceWorker(bookId, format);
          resolve(true);
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Notify service worker to cache book resources
     * @param {string} bookId - Book ID
     * @param {string} format - Book format
     */
    notifyServiceWorker(bookId, format) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'cacheBook',
          bookId: bookId,
          format: format,
          bookUrl: `/api/books/content/${bookId}`
        });
      }
    }
    
    /**
     * Get book metadata from offline storage
     * @param {string} bookId - Book ID
     * @returns {Promise<Object>} Book metadata
     */
    async getBookMetadata(bookId) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('books', 'readonly');
        const store = transaction.objectStore('books');
        
        const request = store.get(bookId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Get book content from offline storage
     * @param {string} bookId - Book ID
     * @returns {Promise<ArrayBuffer>} Book content
     */
    async getBookContent(bookId) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('bookContent', 'readonly');
        const store = transaction.objectStore('bookContent');
        
        const request = store.get(bookId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.content);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Get all offline books
     * @returns {Promise<Array>} List of offline books
     */
    async getAllOfflineBooks() {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('books', 'readonly');
        const store = transaction.objectStore('books');
        
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Check if a book is available offline
     * @param {string} bookId - Book ID
     * @returns {Promise<boolean>} True if book is available offline
     */
    async isBookAvailableOffline(bookId) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve) => {
        const transaction = this.db.transaction('bookContent', 'readonly');
        const store = transaction.objectStore('bookContent');
        
        const request = store.count(bookId);
        
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => resolve(false);
      });
    }
    
    /**
     * Remove book from offline storage
     * @param {string} bookId - Book ID
     */
    async removeOfflineBook(bookId) {
      if (!this.db) await this.initDB();
      
      // Remove book content
      const contentTransaction = this.db.transaction('bookContent', 'readwrite');
      const contentStore = contentTransaction.objectStore('bookContent');
      await contentStore.delete(bookId);
      
      // Remove book metadata
      const metadataTransaction = this.db.transaction('books', 'readwrite');
      const metadataStore = metadataTransaction.objectStore('books');
      await metadataStore.delete(bookId);
      
      // Notify service worker to clear cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          action: 'clearBookCache',
          bookId: bookId
        });
      }
      
      return true;
    }
    
    /**
     * Save reading progress to offline storage
     * @param {string} bookId - Book ID
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @param {Array} pagesRead - List of pages that have been read
     */
    async saveReadingProgress(bookId, currentPage, totalPages, pagesRead = []) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('readingProgress', 'readwrite');
        const store = transaction.objectStore('readingProgress');
        
        const request = store.put({
          bookId: bookId,
          currentPage: currentPage,
          totalPages: totalPages,
          pagesRead: pagesRead,
          lastRead: new Date()
        });
        
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Get reading progress from offline storage
     * @param {string} bookId - Book ID
     * @returns {Promise<Object>} Reading progress
     */
    async getReadingProgress(bookId) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('readingProgress', 'readonly');
        const store = transaction.objectStore('readingProgress');
        
        const request = store.get(bookId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Get recently read books
     * @param {number} limit - Maximum number of books to return
     * @returns {Promise<Array>} List of recently read books
     */
    async getRecentlyReadBooks(limit = 5) {
      if (!this.db) await this.initDB();
      
      return new Promise(async (resolve, reject) => {
        try {
          const transaction = this.db.transaction(['readingProgress', 'books'], 'readonly');
          const progressStore = transaction.objectStore('readingProgress');
          const booksStore = transaction.objectStore('books');
          
          // Get all reading progress entries
          const progressRequest = progressStore.index('lastRead').openCursor(null, 'prev');
          
          const recentBooks = [];
          let count = 0;
          
          progressRequest.onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor && count < limit) {
              // Get book metadata for each entry
              const bookRequest = booksStore.get(cursor.value.bookId);
              
              bookRequest.onsuccess = () => {
                if (bookRequest.result) {
                  recentBooks.push({
                    book: bookRequest.result,
                    progress: cursor.value
                  });
                }
                count++;
                cursor.continue();
              };
              
              bookRequest.onerror = (error) => {
                count++;
                cursor.continue();
              };
            } else {
              resolve(recentBooks);
            }
          };
          
          progressRequest.onerror = (event) => reject(event.target.error);
        } catch (error) {
          reject(error);
        }
      });
    }
    
    /**
     * Queue analytics data for sync when online
     * @param {Object} analyticsData - Analytics data to queue
     */
    async queueAnalyticsData(analyticsData) {
      if (!this.db) await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('analyticsQueue', 'readwrite');
        const store = transaction.objectStore('analyticsQueue');
        
        // Add timestamp to data
        analyticsData.timestamp = new Date();
        analyticsData.synced = false;
        
        const request = store.add(analyticsData);
        
        request.onsuccess = () => {
          // Request sync if online
          if (navigator.onLine && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.sync.register('sync-analytics').catch(error => {
                console.error('Background sync registration error:', error);
              });
            });
          }
          resolve(true);
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }
    
    /**
     * Check storage space usage
     * @returns {Promise<Object>} Storage usage information
     */
    async checkStorageUsage() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          percentUsed: (estimate.usage / estimate.quota) * 100,
          availableMB: (estimate.quota - estimate.usage) / (1024 * 1024)
        };
      }
      
      return null;
    }
    
    /**
     * Check if storage space is available for a book of given size
     * @param {number} bookSizeBytes - Book size in bytes
     * @returns {Promise<boolean>} True if storage is available
     */
    async hasEnoughStorageFor(bookSizeBytes) {
      const usage = await this.checkStorageUsage();
      
      if (!usage) return true; // Cannot determine, assume yes
      
      // Add 10% buffer for related resources
      const requiredBytes = bookSizeBytes * 1.1;
      
      return (usage.quota - usage.usage) > requiredBytes;
    }
    
    /**
     * Download and save a book for offline reading
     * @param {string} bookId - Book ID
     * @returns {Promise<boolean>} True if successful
     */
    async downloadBookForOffline(bookId) {
      try {
        // First, get book metadata
        const response = await fetch(`/api/books/${bookId}`);
        if (!response.ok) throw new Error('Failed to fetch book metadata');
        
        const book = await response.json();
        
        // Check if we have enough storage
        const contentResponse = await fetch(`/api/books/content/${bookId}`, { method: 'HEAD' });
        const contentLength = parseInt(contentResponse.headers.get('Content-Length') || '0');
        
        if (contentLength > 0) {
          const hasSpace = await this.hasEnoughStorageFor(contentLength);
          if (!hasSpace) {
            throw new Error('Not enough storage space available');
          }
        }
        
        // Fetch book content
        const contentFetch = await fetch(`/api/books/content/${bookId}`);
        if (!contentFetch.ok) throw new Error('Failed to fetch book content');
        
        const content = await contentFetch.arrayBuffer();
        
        // Save book metadata and content
        await this.saveBookMetadata(book);
        await this.saveBookContent(bookId, content, book.format);
        
        return true;
      } catch (error) {
        console.error('Error downloading book for offline:', error);
        throw error;
      }
    }
  }
  
  // Initialize offline manager
  const offlineManager = new OfflineManager();
  
  // Add online/offline event listeners
  window.addEventListener('online', () => {
    console.log('Back online, syncing data...');
    
    // Trigger sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('sync-analytics').catch(error => {
          console.error('Background sync registration error:', error);
        });
      });
    }
    
    // Update UI if needed
    document.querySelectorAll('.online-status-indicator').forEach(el => {
      el.classList.remove('offline');
      el.classList.add('online');
      el.textContent = 'Online';
    });
  });
  
  window.addEventListener('offline', () => {
    console.log('Offline mode active');
    
    // Update UI if needed
    document.querySelectorAll('.online-status-indicator').forEach(el => {
      el.classList.remove('online');
      el.classList.add('offline');
      el.textContent = 'Offline';
    });
  });
  
  // Make offlineManager globally available
  window.offlineManager = offlineManager;