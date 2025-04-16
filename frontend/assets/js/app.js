/**
 * E-Library Main Application Script
 */
class ELibraryApp {
    constructor() {
      // Initialize app state
      this.state = {
        isLoggedIn: false,
        user: null,
        isOffline: !navigator.onLine,
        isLoading: false,
        activeCategory: null,
        searchQuery: ''
      };
      
      // DOM elements for navigation and mobile menu
      this.navToggle = document.getElementById('mobile-menu-toggle');
      this.navList = document.getElementById('nav-list');
      
      // Initialize service worker
      this.initServiceWorker();
      
      // Bind events
      this.bindEvents();
      
      // Check auth status
      this.checkAuthStatus();
      
      // Initialize components based on page
      this.initPageComponents();
      
      // Setup online/offline listeners
      this.setupOfflineListeners();
    }
    
    /**
     * Initialize service worker for PWA
     */
    initServiceWorker() {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/pwa/service-worker.js')
            .then(registration => {
              console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
              console.error('Service Worker registration failed:', error);
            });
        });
      }
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
      // Mobile menu toggle
      if (this.navToggle) {
        this.navToggle.addEventListener('click', () => {
          this.navList.classList.toggle('active');
        });
      }
      
      // Close mobile menu when clicking outside
      document.addEventListener('click', (e) => {
        if (this.navList && this.navList.classList.contains('active') &&
            !this.navList.contains(e.target) && 
            e.target !== this.navToggle) {
          this.navList.classList.remove('active');
        }
      });
      
      // Search form
      const searchForm = document.getElementById('search-form');
      if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            this.searchBooks(searchInput.value);
          }
        });
      }
      
      // Category filters
      document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', () => {
          const categoryId = item.dataset.categoryId;
          this.filterByCategory(categoryId);
        });
      });
    }
    
    /**
     * Check authentication status
     */
    async checkAuthStatus() {
      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          this.state.isLoggedIn = false;
          this.updateAuthUI();
          return;
        }
        
        // Verify token with API
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          this.state.isLoggedIn = true;
          this.state.user = userData;
        } else {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          this.state.isLoggedIn = false;
        }
        
        this.updateAuthUI();
      } catch (error) {
        console.error('Auth check error:', error);
        // If offline, assume token is valid
        if (!navigator.onLine && localStorage.getItem('auth_token')) {
          this.state.isLoggedIn = true;
          this.updateAuthUI();
        }
      }
    }
    
    /**
     * Update UI based on authentication status
     */
    updateAuthUI() {
      const authButtons = document.querySelector('.auth-buttons');
      const userMenuContainer = document.querySelector('.user-menu-container');
      
      if (!authButtons || !userMenuContainer) return;
      
      if (this.state.isLoggedIn) {
        // Show user menu
        authButtons.style.display = 'none';
        userMenuContainer.style.display = 'block';
        
        // Update user display name
        const userDisplayName = document.getElementById('user-display-name');
        if (userDisplayName && this.state.user) {
          userDisplayName.textContent = this.state.user.username;
        }
      } else {
        // Show login/register buttons
        authButtons.style.display = 'flex';
        userMenuContainer.style.display = 'none';
      }
    }
    
    /**
     * Initialize components specific to current page
     */
    initPageComponents() {
      // Get current page from URL or data attribute
      const currentPage = document.body.dataset.page || this.getCurrentPageFromUrl();
      
      switch (currentPage) {
        case 'home':
          this.initHomePage();
          break;
        case 'catalog':
          this.initCatalogPage();
          break;
        case 'profile':
          this.initProfilePage();
          break;
      }
    }
    
    /**
     * Get current page from URL
     * @returns {string} Current page name
     */
    getCurrentPageFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('page') || 'home';
    }
    
    /**
     * Initialize home page components
     */
    initHomePage() {
      // Featured books carousel (if exists)
      const featuredContainer = document.querySelector('.featured-books');
      if (featuredContainer) {
        // Simple carousel logic
        const slides = featuredContainer.querySelectorAll('.featured-book');
        const prevBtn = featuredContainer.querySelector('.prev-btn');
        const nextBtn = featuredContainer.querySelector('.next-btn');
        
        let currentSlide = 0;
        
        const showSlide = (index) => {
          slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
          });
        };
        
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
          });
        }
        
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
          });
        }
        
        // Auto-rotate every 5 seconds
        setInterval(() => {
          currentSlide = (currentSlide + 1) % slides.length;
          showSlide(currentSlide);
        }, 5000);
        
        // Show first slide
        showSlide(0);
      }
      
      // Recently added books
      this.loadRecentBooks();
    }
    
    /**
     * Load recently added books for homepage
     */
    async loadRecentBooks() {
      const recentContainer = document.getElementById('recent-books');
      if (!recentContainer) return;
      
      try {
        this.setState({ isLoading: true });
        
        const response = await fetch('/api/books/recent');
        
        if (!response.ok) throw new Error('Failed to fetch recent books');
        
        const books = await response.json();
        
        // Render books
        recentContainer.innerHTML = '';
        
        if (books.length === 0) {
          recentContainer.innerHTML = '<p>No recent books available.</p>';
          return;
        }
        
        books.forEach(book => {
          const bookCard = this.createBookCard(book);
          recentContainer.appendChild(bookCard);
        });
      } catch (error) {
        console.error('Error loading recent books:', error);
        
        if (!navigator.onLine) {
          // Try to load from offline storage
          this.loadOfflineBooks(recentContainer);
        } else {
          recentContainer.innerHTML = '<p>Failed to load recent books. Please try again later.</p>';
        }
      } finally {
        this.setState({ isLoading: false });
      }
    }
    
    /**
     * Load offline books when network is unavailable
     * @param {HTMLElement} container - Container to append books to
     */
    async loadOfflineBooks(container) {
      try {
        // Check if offlineManager is available
        if (!window.offlineManager) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        const offlineBooks = await window.offlineManager.getAllOfflineBooks();
        
        if (!offlineBooks || offlineBooks.length === 0) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Add offline indicator
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.innerHTML = '<span>Offline Mode - Showing saved books</span>';
        container.appendChild(offlineIndicator);
        
        // Create book cards
        offlineBooks.forEach(book => {
          const bookCard = this.createBookCard(book);
          container.appendChild(bookCard);
        });
      } catch (error) {
        console.error('Error loading offline books:', error);
        container.innerHTML = '<p>Failed to load offline books.</p>';
      }
    }
    
    /**
     * Initialize catalog page components
     */
    initCatalogPage() {
      // Load all categories
      this.loadCategories();
      
      // Load books (all or by category if specified in URL)
      const urlParams = new URLSearchParams(window.location.search);
      const categoryId = urlParams.get('category');
      
      if (categoryId) {
        this.filterByCategory(categoryId);
      } else {
        this.loadAllBooks();
      }
    }
    
    /**
     * Load all book categories
     */
    async loadCategories() {
      const categoryList = document.getElementById('category-list');
      if (!categoryList) return;
      
      try {
        const response = await fetch('/api/categories');
        
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const categories = await response.json();
        
        // Render categories
        categoryList.innerHTML = '<div class="category-item active" data-category-id="all">All Books</div>';
        
        categories.forEach(category => {
          const categoryItem = document.createElement('div');
          categoryItem.className = 'category-item';
          categoryItem.setAttribute('data-category-id', category.id);
          categoryItem.textContent = category.name;
          
          // Add click event
          categoryItem.addEventListener('click', () => {
            this.filterByCategory(category.id);
          });
          
          categoryList.appendChild(categoryItem);
        });
        
        // Highlight current category if set
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        
        if (categoryId) {
          document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.categoryId === categoryId);
          });
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        categoryList.innerHTML = '<div class="category-item active">All Books</div>';
      }
    }
    
    /**
     * Load all books for catalog
     */
    async loadAllBooks() {
      const bookGrid = document.getElementById('book-grid');
      if (!bookGrid) return;
      
      try {
        this.setState({ isLoading: true });
        
        const response = await fetch('/api/books');
        
        if (!response.ok) throw new Error('Failed to fetch books');
        
        const books = await response.json();
        
        // Render books
        this.renderBooks(books, bookGrid);
      } catch (error) {
        console.error('Error loading books:', error);
        
        if (!navigator.onLine) {
          // Try to load from offline storage
          this.loadOfflineBooks(bookGrid);
        } else {
          bookGrid.innerHTML = '<p>Failed to load books. Please try again later.</p>';
        }
      } finally {
        this.setState({ isLoading: false });
      }
    }
    
    /**
     * Filter books by category
     * @param {string} categoryId - Category ID
     */
    async filterByCategory(categoryId) {
      const bookGrid = document.getElementById('book-grid');
      if (!bookGrid) return;
      
      // Update active category
      document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.categoryId === categoryId);
      });
      
      // Update state
      this.setState({ activeCategory: categoryId === 'all' ? null : categoryId });
      
      if (categoryId === 'all' || !categoryId) {
        // Load all books
        return this.loadAllBooks();
      }
      
      try {
        this.setState({ isLoading: true });
        
        const response = await fetch(`/api/books?category=${categoryId}`);
        
        if (!response.ok) throw new Error('Failed to fetch category books');
        
        const books = await response.json();
        
        // Render books
        this.renderBooks(books, bookGrid);
      } catch (error) {
        console.error('Error loading category books:', error);
        
        if (!navigator.onLine) {
          // Try to filter offline books by category
          this.filterOfflineBooksByCategory(categoryId, bookGrid);
        } else {
          bookGrid.innerHTML = '<p>Failed to load books. Please try again later.</p>';
        }
      } finally {
        this.setState({ isLoading: false });
      }
      
      // Update URL without reloading page
      const url = new URL(window.location);
      url.searchParams.set('category', categoryId);
      window.history.pushState({}, '', url);
    }
    
    /**
     * Filter offline books by category
     * @param {string} categoryId - Category ID
     * @param {HTMLElement} container - Container to render books in
     */
    async filterOfflineBooksByCategory(categoryId, container) {
      try {
        if (!window.offlineManager) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        const allOfflineBooks = await window.offlineManager.getAllOfflineBooks();
        
        if (!allOfflineBooks || allOfflineBooks.length === 0) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        // Filter by category
        const filteredBooks = allOfflineBooks.filter(book => book.category_id === categoryId);
        
        if (filteredBooks.length === 0) {
          container.innerHTML = '<p>No offline books available in this category.</p>';
          return;
        }
        
        // Render filtered books
        this.renderBooks(filteredBooks, container, true);
      } catch (error) {
        console.error('Error filtering offline books:', error);
        container.innerHTML = '<p>Failed to load offline books.</p>';
      }
    }
    
    /**
     * Search books
     * @param {string} query - Search query
     */
    async searchBooks(query) {
      if (!query || query.trim() === '') return;
      
      const bookGrid = document.getElementById('book-grid');
      if (!bookGrid) return;
      
      // Update state
      this.setState({ searchQuery: query.trim() });
      
      try {
        this.setState({ isLoading: true });
        
        const response = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}`);
        
        if (!response.ok) throw new Error('Search failed');
        
        const books = await response.json();
        
        // Render search results
        bookGrid.innerHTML = '';
        
        const searchHeader = document.createElement('h2');
        searchHeader.className = 'search-header';
        searchHeader.textContent = `Search Results for "${query}"`;
        bookGrid.parentElement.insertBefore(searchHeader, bookGrid);
        
        if (books.length === 0) {
          bookGrid.innerHTML = '<p>No books found matching your search.</p>';
          return;
        }
        
        this.renderBooks(books, bookGrid);
      } catch (error) {
        console.error('Error searching books:', error);
        
        if (!navigator.onLine) {
          // Try to search offline books
          this.searchOfflineBooks(query, bookGrid);
        } else {
          bookGrid.innerHTML = '<p>Search failed. Please try again later.</p>';
        }
      } finally {
        this.setState({ isLoading: false });
      }
      
      // Update URL without reloading page
      const url = new URL(window.location);
      url.searchParams.set('q', query);
      if (url.searchParams.has('category')) {
        url.searchParams.delete('category');
      }
      window.history.pushState({}, '', url);
    }
    
    /**
     * Search offline books
     * @param {string} query - Search query
     * @param {HTMLElement} container - Container to render books in
     */
    async searchOfflineBooks(query, container) {
      try {
        if (!window.offlineManager) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        const allOfflineBooks = await window.offlineManager.getAllOfflineBooks();
        
        if (!allOfflineBooks || allOfflineBooks.length === 0) {
          container.innerHTML = '<p>No offline books available.</p>';
          return;
        }
        
        // Simple search implementation
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
        
        const filteredBooks = allOfflineBooks.filter(book => {
          const searchText = `${book.title} ${book.author} ${book.description}`.toLowerCase();
          return searchTerms.some(term => searchText.includes(term));
        });
        
        if (filteredBooks.length === 0) {
          container.innerHTML = '<p>No offline books match your search.</p>';
          return;
        }
        
        // Add offline indicator
        container.innerHTML = '<div class="offline-indicator"><span>Offline Mode - Showing saved books</span></div>';
        
        // Render filtered books
        this.renderBooks(filteredBooks, container, true);
      } catch (error) {
        console.error('Error searching offline books:', error);
        container.innerHTML = '<p>Failed to search offline books.</p>';
      }
    }
    
    /**
     * Initialize profile page components
     */
    async initProfilePage() {
      // Check if user is logged in
      if (!this.state.isLoggedIn) {
        window.location.href = '/index.php?page=login';
        return;
      }
      
      // Get profile sections
      const section = this.getProfileSection();
      
      switch (section) {
        case 'recent':
          this.loadRecentlyReadBooks();
          break;
        case 'offline':
          this.loadUserOfflineBooks();
          break;
        default:
          this.loadUserProfile();
          break;
      }
    }
    
    /**
     * Get current profile section
     * @returns {string} Profile section name
     */
    getProfileSection() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('section') || 'profile';
    }
    
    /**
     * Load user profile information
     */
    async loadUserProfile() {
      const profileContainer = document.getElementById('profile-container');
      if (!profileContainer) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          window.location.href = '/index.php?page=login';
          return;
        }
        
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        
        const userData = await response.json();
        
        // Update user data in state
        this.setState({ user: userData });
        
        // Render profile information
        profileContainer.innerHTML = `
          <div class="profile-card">
            <div class="profile-header">
              <h2>Profile Information</h2>
            </div>
            <div class="profile-info">
              <div class="info-row">
                <span class="info-label">Username:</span>
                <span class="info-value">${userData.username}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${userData.email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Member Since:</span>
                <span class="info-value">${new Date(userData.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div class="profile-stats">
            <h3>Reading Statistics</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${userData.stats.books_read || 0}</div>
                <div class="stat-label">Books Read</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${userData.stats.total_pages || 0}</div>
                <div class="stat-label">Pages Read</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.formatReadingTime(userData.stats.total_reading_time || 0)}</div>
                <div class="stat-label">Reading Time</div>
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        console.error('Error loading profile:', error);
        
        if (!navigator.onLine) {
          profileContainer.innerHTML = `
            <div class="offline-notice">
              <p>You are currently offline. Profile information is not available while offline.</p>
              <p>Some features may be limited until you reconnect to the internet.</p>
            </div>
          `;
        } else {
          profileContainer.innerHTML = '<p>Failed to load profile. Please try again later.</p>';
        }
      }
    }
    
    /**
     * Load recently read books for user
     */
    async loadRecentlyReadBooks() {
      const recentContainer = document.getElementById('recent-books-container');
      if (!recentContainer) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          window.location.href = '/index.php?page=login';
          return;
        }
        
        if (!navigator.onLine) {
          // Try to load from offline storage
          const recentBooks = await window.offlineManager.getRecentlyReadBooks(10);
          
          if (!recentBooks || recentBooks.length === 0) {
            recentContainer.innerHTML = '<p>No recently read books available offline.</p>';
            return;
          }
          
          // Render recent books
          this.renderRecentBooks(recentBooks, recentContainer, true);
          return;
        }
        
        const response = await fetch('/api/user/recent-books', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load recent books');
        
        const recentBooks = await response.json();
        
        // Render books
        this.renderRecentBooks(recentBooks, recentContainer);
      } catch (error) {
        console.error('Error loading recent books:', error);
        recentContainer.innerHTML = '<p>Failed to load recently read books. Please try again later.</p>';
      }
    }
    
    /**
     * Render recently read books
     * @param {Array} books - Array of book objects with progress info
     * @param {HTMLElement} container - Container to render in
     * @param {boolean} isOffline - Whether books are from offline storage
     */
    renderRecentBooks(books, container, isOffline = false) {
      container.innerHTML = '';
      
      if (isOffline) {
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.innerHTML = '<span>Offline Mode</span>';
        container.appendChild(offlineIndicator);
      }
      
      if (books.length === 0) {
        container.innerHTML += '<p>You haven\'t read any books yet.</p>';
        return;
      }
      
      const booksGrid = document.createElement('div');
      booksGrid.className = 'book-grid recent-books-grid';
      
      books.forEach(bookData => {
        // For offline books, the structure is different
        const book = isOffline ? bookData.book : bookData.book;
        const progress = isOffline ? bookData.progress : bookData.progress;
        
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card recent-book-card';
        
        const progressPercent = Math.round((progress.current_page / progress.total_pages) * 100) || 0;
        
        bookCard.innerHTML = `
          <div class="book-cover">
            <img src="${book.cover_image || '/assets/images/default-cover.jpg'}" alt="${book.title}">
            <div class="book-format">${book.format}</div>
            <div class="reading-progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          <div class="book-info">
            <h3 class="book-title">${book.title}</h3>
            <div class="book-author">${book.author}</div>
            <div class="reading-progress">
              <span class="page-indicator">Page ${progress.current_page} of ${progress.total_pages}</span>
              <span class="percent-indicator">${progressPercent}%</span>
            </div>
            <a href="/index.php?page=reader&id=${book.id}&format=${book.format}" class="btn btn-primary continue-reading-btn">Continue Reading</a>
          </div>
        `;
        
        booksGrid.appendChild(bookCard);
      });
      
      container.appendChild(booksGrid);
    }
    
    /**
     * Load user's offline books
     */
    async loadUserOfflineBooks() {
      const offlineBooksContainer = document.getElementById('offline-books-container');
      if (!offlineBooksContainer) return;
      
      try {
        if (!window.offlineManager) {
          offlineBooksContainer.innerHTML = '<p>Offline books functionality is not available.</p>';
          return;
        }
        
        const offlineBooks = await window.offlineManager.getAllOfflineBooks();
        
        if (!offlineBooks || offlineBooks.length === 0) {
          offlineBooksContainer.innerHTML = `
            <div class="no-offline-books">
              <p>You don't have any books saved for offline reading.</p>
              <p>To save a book for offline reading, open a book and click the "Save Offline" button.</p>
            </div>
          `;
          return;
        }
        
        // Check storage usage
        const storageInfo = await window.offlineManager.checkStorageUsage();
        
        // Render storage info if available
        if (storageInfo) {
          const storageInfoElement = document.createElement('div');
          storageInfoElement.className = 'storage-info';
          storageInfoElement.innerHTML = `
            <div class="storage-bar">
              <div class="storage-used" style="width: ${storageInfo.percentUsed}%"></div>
            </div>
            <div class="storage-details">
              <span>Storage Used: ${Math.round(storageInfo.usage / (1024 * 1024))} MB of ${Math.round(storageInfo.quota / (1024 * 1024))} MB</span>
              <span>${Math.round(storageInfo.percentUsed)}%</span>
            </div>
          `;
          offlineBooksContainer.appendChild(storageInfoElement);
        }
        
        // Render books
        const booksGrid = document.createElement('div');
        booksGrid.className = 'book-grid offline-books-grid';
        
        offlineBooks.forEach(book => {
          const bookCard = document.createElement('div');
          bookCard.className = 'book-card offline-book-card';
          
          bookCard.innerHTML = `
            <div class="book-cover">
              <img src="${book.cover_image || '/assets/images/default-cover.jpg'}" alt="${book.title}">
              <div class="book-format">${book.format}</div>
              <div class="offline-badge">Saved Offline</div>
            </div>
            <div class="book-info">
              <h3 class="book-title">${book.title}</h3>
              <div class="book-author">${book.author}</div>
              <div class="book-actions">
                <a href="/index.php?page=reader&id=${book.id}&format=${book.format}" class="btn btn-primary">Read</a>
                <button class="btn btn-secondary remove-offline-btn" data-book-id="${book.id}">Remove</button>
              </div>
            </div>
          `;
          
          booksGrid.appendChild(bookCard);
        });
        
        offlineBooksContainer.appendChild(booksGrid);
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-offline-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const bookId = e.target.dataset.bookId;
            if (confirm('Are you sure you want to remove this book from offline storage?')) {
              await this.removeOfflineBook(bookId);
              // Reload the list
              this.loadUserOfflineBooks();
            }
          });
        });
      } catch (error) {
        console.error('Error loading offline books:', error);
        offlineBooksContainer.innerHTML = '<p>Failed to load offline books. Please try again later.</p>';
      }
    }
    
    /**
     * Remove a book from offline storage
     * @param {string} bookId - Book ID to remove
     */
    async removeOfflineBook(bookId) {
      try {
        if (!window.offlineManager) return false;
        
        await window.offlineManager.removeOfflineBook(bookId);
        return true;
      } catch (error) {
        console.error('Error removing offline book:', error);
        alert('Failed to remove book from offline storage. Please try again.');
        return false;
      }
    }
    
    /**
     * Format reading time from seconds into readable format
     * @param {number} seconds - Reading time in seconds
     * @returns {string} Formatted reading time
     */
    formatReadingTime(seconds) {
      if (seconds < 60) {
        return `${seconds}s`;
      }
      
      if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m`;
      }
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      return `${hours}h ${minutes}m`;
    }
    
    /**
     * Create HTML for book card
     * @param {Object} book - Book data
     * @returns {HTMLElement} Book card element
     */
    createBookCard(book) {
      const bookCard = document.createElement('div');
      bookCard.className = 'book-card';
      
      bookCard.innerHTML = `
        <div class="book-cover">
          <img src="${book.cover_image || '/assets/images/default-cover.jpg'}" alt="${book.title}">
          <div class="book-format">${book.format}</div>
        </div>
        <div class="book-info">
          <h3 class="book-title">${book.title}</h3>
          <div class="book-author">${book.author}</div>
          <div class="book-category">${book.category_name}</div>
        </div>
        <a href="/index.php?page=reader&id=${book.id}&format=${book.format}" class="book-link"></a>
      `;
      
      return bookCard;
    }
    
    /**
     * Render books to container
     * @param {Array} books - Array of book objects
     * @param {HTMLElement} container - Container element
     * @param {boolean} isOffline - Whether in offline mode
     */
    renderBooks(books, container, isOffline = false) {
      // Clear container
      container.innerHTML = '';
      
      if (isOffline) {
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-indicator';
        offlineIndicator.innerHTML = '<span>Offline Mode - Showing saved books</span>';
        container.appendChild(offlineIndicator);
      }
      
      if (books.length === 0) {
        container.innerHTML += '<p>No books available.</p>';
        return;
      }
      
      // Create book cards
      books.forEach(book => {
        const bookCard = this.createBookCard(book);
        container.appendChild(bookCard);
      });
    }
    
    /**
     * Set up online/offline event listeners
     */
    setupOfflineListeners() {
      window.addEventListener('online', () => {
        this.setState({ isOffline: false });
        this.updateOfflineUI();
        
        // Reload current page data if needed
        this.reloadCurrentPageData();
      });
      
      window.addEventListener('offline', () => {
        this.setState({ isOffline: true });
        this.updateOfflineUI();
      });
      
      // Initial offline status
      this.updateOfflineUI();
    }
    
    /**
     * Update UI based on online/offline status
     */
    updateOfflineUI() {
      const offlineIndicator = document.getElementById('offline-indicator');
      
      if (offlineIndicator) {
        if (this.state.isOffline) {
          offlineIndicator.classList.add('active');
          offlineIndicator.textContent = 'Offline Mode';
        } else {
          offlineIndicator.classList.remove('active');
          offlineIndicator.textContent = '';
        }
      }
    }
    
    /**
     * Reload current page data when coming back online
     */
    reloadCurrentPageData() {
      const currentPage = this.getCurrentPageFromUrl();
      
      switch (currentPage) {
        case 'catalog':
          if (this.state.activeCategory) {
            this.filterByCategory(this.state.activeCategory);
          } else if (this.state.searchQuery) {
            this.searchBooks(this.state.searchQuery);
          } else {
            this.loadAllBooks();
          }
          break;
        case 'home':
          this.loadRecentBooks();
          break;
        case 'profile':
          const section = this.getProfileSection();
          if (section === 'recent') {
            this.loadRecentlyReadBooks();
          }
          break;
      }
    }
    
    /**
     * Update state and trigger UI updates
     * @param {Object} newState - Partial state to update
     */
    setState(newState) {
      this.state = {
        ...this.state,
        ...newState
      };
      
      // Handle state changes that require UI updates
      if ('isLoading' in newState) {
        this.updateLoadingUI();
      }
    }
    
    /**
     * Update loading indicators in UI
     */
    updateLoadingUI() {
      const loaders = document.querySelectorAll('.loader');
      
      loaders.forEach(loader => {
        if (this.state.isLoading) {
          loader.style.display = 'block';
        } else {
          loader.style.display = 'none';
        }
      });
    }
  }
  
  // Initialize app on DOM content loaded
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ELibraryApp();
    
    // Make app available globally for event handlers
    window.eLibraryApp = app;
  });