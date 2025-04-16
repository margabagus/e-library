/**
 * E-Library E-book Reader
 * Handles PDF, EPUB, and MOBI formats with offline capabilities
 */
class EBookReader {
    constructor() {
      // DOM elements
      this.container = document.getElementById('reader-container');
      this.bookContent = document.getElementById('book-content');
      this.pageCount = document.getElementById('page-count');
      this.prevButton = document.getElementById('prev-page');
      this.nextButton = document.getElementById('next-page');
      this.settingsButton = document.getElementById('settings-button');
      this.settingsPanel = document.getElementById('settings-panel');
      this.exitButton = document.getElementById('exit-reader');
      this.loader = document.getElementById('loader');
      
      // Reader state
      this.bookId = null;
      this.bookFormat = null;
      this.totalPages = 0;
      this.currentPage = 1;
      this.book = null;
      this.rendition = null;
      this.lastReadTime = Date.now();
      this.pagesRead = new Set();
      this.readingStartTime = null;
      this.analyticsInterval = null;
      
      // Reader settings
      this.theme = localStorage.getItem('reader-theme') || 'light';
      this.fontSize = localStorage.getItem('reader-font-size') || 'medium';
      
      // Initialize settings & themes
      this.initializeSettings();
      this.applyTheme();
      this.applyFontSize();
      
      // Bind events
      this.bindEvents();
      
      // IndexedDB for offline storage
      this.initIndexedDB();
    }
    
    /**
     * Initialize the IndexedDB for storing reading progress and offline books
     */
    async initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('e-library-reader', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create reading progress store
          if (!db.objectStoreNames.contains('readingProgress')) {
            const progressStore = db.createObjectStore('readingProgress', { keyPath: 'bookId' });
            progressStore.createIndex('lastRead', 'lastRead', { unique: false });
          }
          
          // Create offline books store
          if (!db.objectStoreNames.contains('offlineBooks')) {
            db.createObjectStore('offlineBooks', { keyPath: 'bookId' });
          }
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('IndexedDB error:', event.target.error);
          reject(event.target.error);
        };
      });
    }
    
    /**
     * Initialize reader with a book
     * @param {string} bookId - ID of the book
     * @param {string} format - Format of the book (pdf, epub, mobi)
     */
    async openBook(bookId, format) {
      try {
        this.showLoader();
        
        this.bookId = bookId;
        this.bookFormat = format.toLowerCase();
        
        // Reset state
        this.currentPage = 1;
        this.pagesRead = new Set();
        this.readingStartTime = Date.now();
        
        // Get book data - first try from IndexedDB for offline
        let bookData = await this.getOfflineBook(bookId);
        let isOffline = !!bookData;
        
        if (!bookData) {
          // If not available offline, fetch from API
          try {
            const response = await fetch(`/api/books/content/${bookId}`);
            if (!response.ok) throw new Error('Failed to fetch book');
            bookData = await response.arrayBuffer();
          } catch (error) {
            this.hideLoader();
            this.showError('Book not available. Please check your internet connection.');
            console.error('Error fetching book:', error);
            return;
          }
        }
        
        // Get reading progress from IndexedDB
        const progress = await this.getReadingProgress(bookId);
        if (progress) {
          this.currentPage = progress.currentPage;
        }
        
        // Render the book based on format
        switch (this.bookFormat) {
          case 'pdf':
            await this.renderPDF(bookData);
            break;
          case 'epub':
            await this.renderEPUB(bookData);
            break;
          case 'mobi':
            await this.renderMOBI(bookData);
            break;
          default:
            this.hideLoader();
            this.showError('Unsupported book format');
            return;
        }
        
        // Start analytics tracking
        this.startAnalyticsTracking();
        
        // If book was loaded from network and not already saved offline
        if (!isOffline) {
          // Mark for offline availability if supported
          this.saveBookForOffline(bookId, bookData);
        }
        
        this.hideLoader();
        this.updatePageInfo();
        this.markPageAsRead(this.currentPage);
      } catch (error) {
        this.hideLoader();
        this.showError('Error opening book: ' + error.message);
        console.error('Error opening book:', error);
      }
    }
    
    /**
     * Render PDF book
     * @param {ArrayBuffer} data - PDF file data
     */
    async renderPDF(data) {
      // Load PDF.js dynamically if not already loaded
      if (typeof pdfjsLib === 'undefined') {
        await this.loadScript('/assets/js/lib/pdf.min.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/js/lib/pdf.worker.min.js';
      }
      
      // Load the PDF document
      this.book = await pdfjsLib.getDocument({ data }).promise;
      this.totalPages = this.book.numPages;
      
      // Create PDF container
      this.bookContent.innerHTML = '<div class="pdf-container"><div class="pdf-page"></div></div>';
      this.pdfContainer = document.querySelector('.pdf-page');
      
      // Render the current page
      this.renderPDFPage(this.currentPage);
      
      // Update UI
      this.updatePageInfo();
      this.updateNavigationButtons();
    }
    
    /**
     * Render a specific PDF page
     * @param {number} pageNum - Page number to render
     */
    async renderPDFPage(pageNum) {
      try {
        // Get the page
        const page = await this.book.getPage(pageNum);
        
        // Calculate scale to fit container
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = this.pdfContainer.clientWidth;
        const containerHeight = this.pdfContainer.clientHeight;
        const scaleWidth = containerWidth / viewport.width;
        const scaleHeight = containerHeight / viewport.height;
        const scale = Math.min(scaleWidth, scaleHeight, 1.5); // Limit max scale
        
        // Set up canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        // Clear container and append new canvas
        this.pdfContainer.innerHTML = '';
        this.pdfContainer.appendChild(canvas);
        
        // Render the page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;
        
        // Update current page value
        this.currentPage = pageNum;
        this.updatePageInfo();
        this.updateNavigationButtons();
        this.markPageAsRead(pageNum);
        this.saveReadingProgress();
      } catch (error) {
        console.error('Error rendering PDF page:', error);
        this.showError('Error rendering page');
      }
    }
    
    /**
     * Render EPUB book
     * @param {ArrayBuffer} data - EPUB file data
     */
    async renderEPUB(data) {
      // Load epub.js dynamically if not already loaded
      if (typeof ePub === 'undefined') {
        await this.loadScript('/assets/js/lib/epub.min.js');
      }
      
      // Create blob URL for the EPUB
      const blob = new Blob([data], { type: 'application/epub+zip' });
      const bookUrl = URL.createObjectURL(blob);
      
      // Create EPUB container
      this.bookContent.innerHTML = '<div class="epub-container"></div>';
      const epubContainer = document.querySelector('.epub-container');
      
      // Initialize ePub.js book
      this.book = ePub(bookUrl);
      this.rendition = this.book.renderTo(epubContainer, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated'
      });
      
      // Apply current settings
      this.applyEpubSettings();
      
      // Load the book
      await this.book.ready;
      
      // Get the total pages/locations
      const locations = await this.book.locations.generate(1000);
      this.totalPages = this.book.locations.total;
      
      // Display the book
      if (this.currentPage > 1) {
        // Resume from last position
        const location = this.book.locations.cfiFromPercentage((this.currentPage - 1) / this.totalPages);
        this.rendition.display(location);
      } else {
        this.rendition.display();
      }
      
      // Handle page changes
      this.rendition.on('relocated', (location) => {
        const page = Math.ceil(this.book.locations.percentageFromCfi(location.start.cfi) * this.totalPages);
        this.currentPage = page || 1;
        this.updatePageInfo();
        this.updateNavigationButtons();
        this.markPageAsRead(this.currentPage);
        this.saveReadingProgress();
      });
      
      // Set up navigation methods
      this.prevPage = () => this.rendition.prev();
      this.nextPage = () => this.rendition.next();
      
      this.updatePageInfo();
      this.updateNavigationButtons();
    }
    
    /**
     * Apply current settings to EPUB renderer
     */
    applyEpubSettings() {
      if (!this.rendition) return;
      
      // Apply theme
      let theme = {};
      switch (this.theme) {
        case 'light':
          theme = { body: { background: '#f8f8f8', color: '#333' } };
          break;
        case 'sepia':
          theme = { body: { background: '#f4ecd8', color: '#5b4636' } };
          break;
        case 'dark':
          theme = { body: { background: '#222', color: '#ddd' } };
          break;
      }
      
      // Apply font size
      let fontSize = '100%';
      switch (this.fontSize) {
        case 'small': fontSize = '90%'; break;
        case 'medium': fontSize = '100%'; break;
        case 'large': fontSize = '120%'; break;
        case 'xlarge': fontSize = '140%'; break;
      }
      
      theme.body['font-size'] = fontSize;
      
      // Register and apply theme
      this.rendition.themes.register('custom', theme);
      this.rendition.themes.select('custom');
    }
    
    /**
     * Render MOBI book
     * @param {ArrayBuffer} data - MOBI file data
     */
    async renderMOBI(data) {
      // For MOBI, we'll convert to EPUB format client-side for rendering
      try {
        // Load MOBI.js dynamically if not already loaded
        if (typeof Mobi === 'undefined') {
          await this.loadScript('/assets/js/lib/mobi.min.js');
        }
        
        // Create buffer from ArrayBuffer
        const buffer = new Uint8Array(data);
        
        // Parse MOBI
        const mobi = new Mobi(buffer);
        const htmlContent = mobi.getHTMLContent();
        
        // Create a simple EPUB-like reader using HTML
        this.bookContent.innerHTML = `
          <div class="epub-container">
            <div class="epub-content" id="mobi-content"></div>
          </div>
        `;
        
        const mobiContent = document.getElementById('mobi-content');
        mobiContent.innerHTML = htmlContent;
        
        // Apply styles based on current theme and font size
        this.applyMobiStyles();
        
        // Calculate total pages based on content height
        const pageHeight = mobiContent.clientHeight;
        const contentHeight = mobiContent.scrollHeight;
        this.totalPages = Math.ceil(contentHeight / pageHeight);
        
        // Set up pagination
        this.prevPage = () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.scrollToPage(this.currentPage);
          }
        };
        
        this.nextPage = () => {
          if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.scrollToPage(this.currentPage);
          }
        };
        
        // Scroll to remembered position
        this.scrollToPage(this.currentPage);
        
        // Handle scroll events for page tracking
        mobiContent.addEventListener('scroll', () => {
          const newPage = Math.ceil(mobiContent.scrollTop / pageHeight) + 1;
          if (newPage !== this.currentPage) {
            this.currentPage = newPage;
            this.updatePageInfo();
            this.updateNavigationButtons();
            this.markPageAsRead(this.currentPage);
            this.saveReadingProgress();
          }
        });
        
        this.updatePageInfo();
        this.updateNavigationButtons();
      } catch (error) {
        console.error('Error rendering MOBI:', error);
        this.showError('Error rendering MOBI format');
      }
    }
    
    /**
     * Apply current styles to MOBI content
     */
    applyMobiStyles() {
      const mobiContent = document.getElementById('mobi-content');
      if (!mobiContent) return;
      
      // Apply theme
      let bgColor, textColor;
      switch (this.theme) {
        case 'light':
          bgColor = '#f8f8f8';
          textColor = '#333';
          break;
        case 'sepia':
          bgColor = '#f4ecd8';
          textColor = '#5b4636';
          break;
        case 'dark':
          bgColor = '#222';
          textColor = '#ddd';
          break;
      }
      
      // Apply font size
      let fontSize;
      switch (this.fontSize) {
        case 'small': fontSize = '16px'; break;
        case 'medium': fontSize = '18px'; break;
        case 'large': fontSize = '20px'; break;
        case 'xlarge': fontSize = '22px'; break;
      }
      
      // Apply styles
      mobiContent.style.background = bgColor;
      mobiContent.style.color = textColor;
      mobiContent.style.fontSize = fontSize;
    }
    
    /**
     * Scroll to specific page in MOBI reader
     * @param {number} page - Page number to scroll to
     */
    scrollToPage(page) {
      const mobiContent = document.getElementById('mobi-content');
      if (!mobiContent) return;
      
      const pageHeight = mobiContent.clientHeight;
      mobiContent.scrollTop = (page - 1) * pageHeight;
    }
    
    /**
     * Initialize reader settings panel and options
     */
    initializeSettings() {
      // Bind theme options
      document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
          const theme = option.dataset.theme;
          this.setTheme(theme);
        });
      });
      
      // Bind font size options
      document.querySelectorAll('.font-size-option').forEach(option => {
        option.addEventListener('click', () => {
          const size = option.dataset.size;
          this.setFontSize(size);
        });
      });
      
      // Mark active options
      this.updateSettingsUI();
    }
    
    /**
     * Update the settings UI to reflect current settings
     */
    updateSettingsUI() {
      // Update theme selection
      document.querySelectorAll('.theme-option').forEach(option => {
        if (option.dataset.theme === this.theme) {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
      
      // Update font size selection
      document.querySelectorAll('.font-size-option').forEach(option => {
        if (option.dataset.size === this.fontSize) {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
    }
    
    /**
     * Set reader theme
     * @param {string} theme - Theme name (light, sepia, dark)
     */
    setTheme(theme) {
      this.theme = theme;
      localStorage.setItem('reader-theme', theme);
      this.applyTheme();
      this.updateSettingsUI();
      
      // Apply to EPUB if active
      if (this.bookFormat === 'epub' && this.rendition) {
        this.applyEpubSettings();
      }
      
      // Apply to MOBI if active
      if (this.bookFormat === 'mobi') {
        this.applyMobiStyles();
      }
    }
    
    /**
     * Apply current theme to reader
     */
    applyTheme() {
      document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
      document.body.classList.add(`theme-${this.theme}`);
    }
    
    /**
     * Set font size
     * @param {string} size - Font size (small, medium, large, xlarge)
     */
    setFontSize(size) {
      this.fontSize = size;
      localStorage.setItem('reader-font-size', size);
      this.applyFontSize();
      this.updateSettingsUI();
      
      // Apply to EPUB if active
      if (this.bookFormat === 'epub' && this.rendition) {
        this.applyEpubSettings();
      }
      
      // Apply to MOBI if active
      if (this.bookFormat === 'mobi') {
        this.applyMobiStyles();
      }
    }
    
    /**
     * Apply current font size to reader
     */
    applyFontSize() {
      document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
      document.body.classList.add(`font-${this.fontSize}`);
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
      // Navigation buttons
      this.prevButton.addEventListener('click', () => {
        this.goToPrevPage();
      });
      
      this.nextButton.addEventListener('click', () => {
        this.goToNextPage();
      });
      
      // Settings button toggle
      this.settingsButton.addEventListener('click', () => {
        this.settingsPanel.classList.toggle('active');
      });
      
      // Close settings when clicking outside
      document.addEventListener('click', (e) => {
        if (this.settingsPanel.classList.contains('active') && 
            !this.settingsPanel.contains(e.target) && 
            e.target !== this.settingsButton) {
          this.settingsPanel.classList.remove('active');
        }
      });
      
      // Exit button
      this.exitButton.addEventListener('click', () => {
        this.exitReader();
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          this.goToPrevPage();
        } else if (e.key === 'ArrowRight') {
          this.goToNextPage();
        } else if (e.key === 'Escape') {
          this.exitReader();
        }
      });
      
      // Touch swipe for mobile
      let touchStartX = 0;
      let touchEndX = 0;
      
      this.bookContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      this.bookContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe(touchStartX, touchEndX);
      }, { passive: true });
      
      // Window resize handler
      window.addEventListener('resize', () => {
        this.handleResize();
      });
      
      // Before unload - save progress
      window.addEventListener('beforeunload', () => {
        this.saveReadingProgress();
        this.saveAnalytics();
      });
    }
    
    /**
     * Handle touch swipe
     * @param {number} startX - Touch start X position
     * @param {number} endX - Touch end X position
     */
    handleSwipe(startX, endX) {
      const threshold = 50; // Minimum swipe distance
      
      if (startX - endX > threshold) {
        // Swipe left - go to next page
        this.goToNextPage();
      } else if (endX - startX > threshold) {
        // Swipe right - go to previous page
        this.goToPrevPage();
      }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
      // For PDF, we need to re-render the current page to adjust scale
      if (this.bookFormat === 'pdf' && this.book) {
        this.renderPDFPage(this.currentPage);
      }
    }
    
    /**
     * Go to previous page
     */
    goToPrevPage() {
      if (this.prevPage) {
        // For EPUB and MOBI, use the format-specific method
        this.prevPage();
      } else if (this.currentPage > 1) {
        // For PDF or default
        this.renderPDFPage(this.currentPage - 1);
      }
    }
    
    /**
     * Go to next page
     */
    goToNextPage() {
      if (this.nextPage) {
        // For EPUB and MOBI, use the format-specific method
        this.nextPage();
      } else if (this.currentPage < this.totalPages) {
        // For PDF or default
        this.renderPDFPage(this.currentPage + 1);
      }
    }
    
    /**
     * Update page information display
     */
    updatePageInfo() {
      if (this.pageCount) {
        this.pageCount.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      }
    }
    
    /**
     * Update navigation buttons state (enabled/disabled)
     */
    updateNavigationButtons() {
      if (this.prevButton) {
        this.prevButton.disabled = this.currentPage <= 1;
      }
      
      if (this.nextButton) {
        this.nextButton.disabled = this.currentPage >= this.totalPages;
      }
    }
    
    /**
     * Show loader while loading book
     */
    showLoader() {
      if (this.loader) {
        this.loader.style.display = 'block';
      }
    }
    
    /**
     * Hide loader
     */
    hideLoader() {
      if (this.loader) {
        this.loader.style.display = 'none';
      }
    }
    
    /**
     * Display error message
     * @param {string} message - Error message to display
     */
    showError(message) {
      alert(message);
    }
    
    /**
     * Exit the reader
     */
    exitReader() {
      // Save progress and analytics before exiting
      this.saveReadingProgress();
      this.saveAnalytics();
      
      // Stop analytics tracking
      this.stopAnalyticsTracking();
      
      // Clean up resources
      if (this.rendition) {
        this.rendition.destroy();
      }
      
      // Redirect to previous page or catalog
      window.location.href = document.referrer || '/index.php?page=catalog';
    }
    
    /**
     * Mark a page as read
     * @param {number} pageNum - Page number
     */
    markPageAsRead(pageNum) {
      this.pagesRead.add(pageNum);
      this.lastReadTime = Date.now();
    }
    
    /**
     * Save reading progress to IndexedDB
     */
    async saveReadingProgress() {
      if (!this.db || !this.bookId) return;
      
      try {
        const transaction = this.db.transaction('readingProgress', 'readwrite');
        const store = transaction.objectStore('readingProgress');
        
        await store.put({
          bookId: this.bookId,
          currentPage: this.currentPage,
          totalPages: this.totalPages,
          lastRead: new Date(),
          pagesRead: Array.from(this.pagesRead)
        });
      } catch (error) {
        console.error('Error saving reading progress:', error);
      }
    }
    
    /**
     * Get reading progress from IndexedDB
     * @param {string} bookId - Book ID
     * @returns {Promise<Object>} Reading progress
     */
    async getReadingProgress(bookId) {
      if (!this.db) return null;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction('readingProgress', 'readonly');
        const store = transaction.objectStore('readingProgress');
        const request = store.get(bookId);
        
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        
        request.onerror = (event) => {
          console.error('Error getting reading progress:', event.target.error);
          reject(event.target.error);
        };
      });
    }
    
    /**
     * Save book for offline reading
     * @param {string} bookId - Book ID
     * @param {ArrayBuffer} data - Book data
     */
    async saveBookForOffline(bookId, data) {
      if (!this.db) return;
      
      try {
        const transaction = this.db.transaction('offlineBooks', 'readwrite');
        const store = transaction.objectStore('offlineBooks');
        
        // Check if book is already stored
        const existingBook = await new Promise((resolve) => {
          const request = store.get(bookId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
        
        if (!existingBook) {
          // Store the book data
          await store.put({
            bookId: bookId,
            format: this.bookFormat,
            data: data,
            dateAdded: new Date()
          });
          
          console.log('Book saved for offline reading:', bookId);
          
          // Notify service worker to cache book resources
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              action: 'cacheBook',
              bookId: bookId,
              bookUrl: `/api/books/content/${bookId}`
            });
          }
        }
      } catch (error) {
        console.error('Error saving book for offline:', error);
      }
    }
    
    /**
     * Get offline book data from IndexedDB
     * @param {string} bookId - Book ID
     * @returns {Promise<ArrayBuffer>} Book data
     */
    async getOfflineBook(bookId) {
      if (!this.db) return null;
      
      return new Promise((resolve) => {
        const transaction = this.db.transaction('offlineBooks', 'readonly');
        const store = transaction.objectStore('offlineBooks');
        const request = store.get(bookId);
        
        request.onsuccess = (event) => {
          const book = event.target.result;
          resolve(book ? book.data : null);
        };
        
        request.onerror = () => {
          console.error('Error getting offline book:', request.error);
          resolve(null);
        };
      });
    }
    
    /**
     * Start tracking analytics data
     */
    startAnalyticsTracking() {
      this.readingStartTime = Date.now();
      this.pagesRead = new Set();
      
      // Set up interval to periodically save analytics (every 2 minutes)
      this.analyticsInterval = setInterval(() => {
        this.saveAnalytics();
      }, 2 * 60 * 1000);
    }
    
    /**
     * Stop analytics tracking
     */
    stopAnalyticsTracking() {
      if (this.analyticsInterval) {
        clearInterval(this.analyticsInterval);
        this.analyticsInterval = null;
      }
    }
    
    /**
     * Save reading analytics
     */
    async saveAnalytics() {
      if (!this.bookId || this.pagesRead.size === 0) return;
      
      const readingTime = Math.floor((this.lastReadTime - this.readingStartTime) / 1000);
      if (readingTime <= 0) return;
      
      const analyticsData = {
        bookId: this.bookId,
        pagesRead: this.pagesRead.size,
        readingTimeSeconds: readingTime,
        timestamp: new Date().toISOString()
      };
      
      try {
        // Try to send to server
        const response = await fetch('/api/analytics/reading', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(analyticsData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to send analytics');
        }
        
        // Reset tracking for next interval
        this.readingStartTime = Date.now();
        this.pagesRead = new Set();
        
      } catch (error) {
        console.error('Error sending analytics:', error);
        
        // If offline, store for later sync
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            action: 'storeAnalytics',
            analyticsData: analyticsData
          });
        }
      }
    }
    
    /**
     * Load script dynamically
     * @param {string} src - Script URL
     * @returns {Promise} Promise that resolves when script is loaded
     */
    loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }
  
  // Initialize reader when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    const reader = new EBookReader();
    
    // Make reader available globally for event handlers
    window.ebookReader = reader;
    
    // Check if we have book parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    const format = urlParams.get('format');
    
    if (bookId && format) {
      reader.openBook(bookId, format);
    }
  });