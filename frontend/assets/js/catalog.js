/**
 * E-Library Catalog Module
 * Handles catalog display and interactions
 */
class CatalogModule {
    constructor() {
      this.currentCategory = null;
      this.currentPage = 1;
      this.booksPerPage = 20;
      this.searchQuery = '';
      this.filterFormats = ['pdf', 'epub', 'mobi'];
      this.filterStatus = ['all'];
      
      // Get elements
      this.bookGrid = document.getElementById('book-grid');
      this.categoryList = document.getElementById('category-list');
      this.pagination = document.getElementById('pagination');
      this.searchForm = document.getElementById('search-form');
      
      // Initialize catalog
      this.init();
    }
    
    /**
     * Initialize catalog
     */
    init() {
      // Read URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const category = urlParams.get('category');
      const query = urlParams.get('q');
      const page = parseInt(urlParams.get('page')) || 1;
      
      // Set initial state based on URL
      this.currentPage = page;
      
      if (category) {
        this.currentCategory = category;
      }
      
      if (query) {
        this.searchQuery = query;
      }
      
      // Bind events
      this.bindEvents();
      
      // Load initial data
      this.loadCatalog();
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
      // Category filtering
      if (this.categoryList) {
        this.categoryList.addEventListener('click', (e) => {
          const categoryItem = e.target.closest('.category-item');
          if (categoryItem) {
            const categoryId = categoryItem.dataset.categoryId;
            this.filterByCategory(categoryId);
          }
        });
      }
      
      // Search form
      if (this.searchForm) {
        this.searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const searchInput = this.searchForm.querySelector('input[name="q"]');
          if (searchInput) {
            this.search(searchInput.value);
          }
        });
      }
      
      // Format filters
      document.querySelectorAll('.format-option input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          this.updateFormatFilters();
          this.applyFilters();
        });
      });
      
      // Status filters
      document.querySelectorAll('.status-option input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          this.updateStatusFilters();
          this.applyFilters();
        });
      });
    }
    
    /**
     * Load catalog data
     */
    async loadCatalog() {
      // Show loading state
      this.showLoading();
      
      try {
        // Determine which API endpoint to call
        let url;
        
        if (this.searchQuery) {
          // Search query
          url = `/api/books/search?q=${encodeURIComponent(this.searchQuery)}&page=${this.currentPage}&limit=${this.booksPerPage}`;
        } else if (this.currentCategory && this.currentCategory !== 'all') {
          // Category filter
          url = `/api/books/category/${this.currentCategory}?page=${this.currentPage}&limit=${this.booksPerPage}`;
        } else {
          // All books
          url = `/api/books?page=${this.currentPage}&limit=${this.booksPerPage}`;
        }
        
        // Fetch books
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch books');
        }
        
        const data = await response.json();
        
        // Render books
        this.renderBooks(data);
        
        // Update pagination
        this.updatePagination(data.total, data.page, data.pages);
        
        // Update active category
        this.updateActiveCategory();
        
        // Check offline availability after rendering
        setTimeout(() => {
          this.checkOfflineAvailability();
        }, 500);
      } catch (error) {
        console.error('Error loading catalog:', error);
        
        if (!navigator.onLine) {
          // Load offline books if available
          this.loadOfflineBooks();
        } else {
          // Show error message
          this.showError('Failed to load books. Please try again later.');
        }
      } finally {
        this.hideLoading();
      }
    }
    
    /**
     * Render books in the grid
     * @param {Array} books - Array of book objects
     */
    renderBooks(books) {
      if (!this.bookGrid) return;
      
      // Clear grid
      this.bookGrid.innerHTML = '';
      
      // Check if no books
      if (!books || books.length === 0) {
        this.bookGrid.innerHTML = '<p class="no-results">No books found.</p>';
        return;
      }
      
      // Create book cards
      books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.setAttribute('data-format', book.format.toLowerCase());
        
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
          <a href="index.php?page=reader&id=${book.id}&format=${book.format}" class="book-link"></a>
        `;
        
        this.bookGrid.appendChild(bookCard);
      });
    }
    
    /**
     * Update pagination controls
     * @param {number} total - Total number of books
     * @param {number} currentPage - Current page number
     * @param {number} totalPages - Total number of pages
     */
    updatePagination(total, currentPage, totalPages) {
      if (!this.pagination) return;
      
      this.pagination.innerHTML = '';
      
      if (totalPages <= 1) {
        return;
      }
      
      const createPageLink = (page, text, isActive = false, isDisabled = false) => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = `pagination-link ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        link.textContent = text;
        
        if (!isDisabled) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            this.goToPage(page);
          });
        }
        
        return link;
      };
      
      // Previous button
      this.pagination.appendChild(createPageLink(currentPage - 1, 'Previous', false, currentPage === 1));
      
      // Page numbers
      const maxButtons = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);
      
      if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
      }
      
      // First page
      if (startPage > 1) {
        this.pagination.appendChild(createPageLink(1, '1'));
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-ellipsis';
          ellipsis.textContent = '...';
          this.pagination.appendChild(ellipsis);
        }
      }
      
      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        this.pagination.appendChild(createPageLink(i, i.toString(), i === currentPage));
      }
      
      // Last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-ellipsis';
          ellipsis.textContent = '...';
          this.pagination.appendChild(ellipsis);
        }
        this.pagination.appendChild(createPageLink(totalPages, totalPages.toString()));
      }
      
      // Next button
      this.pagination.appendChild(createPageLink(currentPage + 1, 'Next', false, currentPage === totalPages));
    }
    
    /**
     * Navigate to a specific page
     * @param {number} page - Page number to navigate to
     */
    goToPage(page) {
      this.currentPage = page;
      this.loadCatalog();
      
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('page', page);
      window.history.pushState({}, '', url);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    /**
     * Filter catalog by category
     * @param {string} categoryId - Category ID to filter by
     */
    filterByCategory(categoryId) {
      this.currentCategory = categoryId === 'all' ? null : categoryId;
      this.currentPage = 1;
      this.searchQuery = '';
      
      // Update active category in UI
      this.updateActiveCategory();
      
      // Update URL
      const url = new URL(window.location);
      
      if (this.currentCategory) {
        url.searchParams.set('category', this.currentCategory);
      } else {
        url.searchParams.delete('category');
      }
      
      url.searchParams.delete('q');
      url.searchParams.delete('page');
      
      window.history.pushState({}, '', url);
      
      // Load filtered catalog
      this.loadCatalog();
    }
    
    /**
     * Update active category in UI
     */
    updateActiveCategory() {
      if (!this.categoryList) return;
      
      const categoryItems = this.categoryList.querySelectorAll('.category-item');
      
      categoryItems.forEach(item => {
        const categoryId = item.dataset.categoryId;
        
        if ((categoryId === 'all' && !this.currentCategory) || 
            (categoryId === this.currentCategory)) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
    
    /**
     * Search books
     * @param {string} query - Search query
     */
    search(query) {
      if (!query) return;
      
      this.searchQuery = query;
      this.currentCategory = null;
      this.currentPage = 1;
      
      // Update URL
      const url = new URL(window.location);
      url.searchParams.set('q', this.searchQuery);
      url.searchParams.delete('category');
      url.searchParams.delete('page');
      
      window.history.pushState({}, '', url);
      
      // Load search results
      this.loadCatalog();
    }
    
    /**
     * Update format filters based on checkboxes
     */
    updateFormatFilters() {
      const checkedFormats = Array.from(document.querySelectorAll('.format-option input:checked'))
        .map(checkbox => checkbox.value);
      
      this.filterFormats = checkedFormats;
    }
    
    /**
     * Update status filters based on checkboxes
     */
    updateStatusFilters() {
      const checkedStatuses = Array.from(document.querySelectorAll('.status-option input:checked'))
        .map(checkbox => checkbox.value);
      
      this.filterStatus = checkedStatuses;
    }
    
    /**
     * Apply current filters to book display
     */
    applyFilters() {
      if (!this.bookGrid) return;
      
      const books = this.bookGrid.querySelectorAll('.book-card');
      
      books.forEach(book => {
        // Start with visibility based on format
        const format = book.getAttribute('data-format');
        let visible = this.filterFormats.includes(format);
        
        // Apply status filters if active
        if (visible && !this.filterStatus.includes('all')) {
          // Offline filter
          if (this.filterStatus.includes('offline') && !book.classList.contains('offline-available')) {
            visible = false;
          }
          
          // Read filter
          if (this.filterStatus.includes('read') && !book.classList.contains('already-read')) {
            visible = false;
          }
        }
        
        // Set visibility
        book.style.display = visible ? '' : 'none';
      });
      
      // Check if no visible books
      const visibleBooks = Array.from(books).filter(book => book.style.display !== 'none');
      
      if (visibleBooks.length === 0) {
        const noResults = document.createElement('p');
        noResults.className = 'no-results';
        noResults.textContent = 'No books match the selected filters.';
        
        // Check if message already exists
        if (!this.bookGrid.querySelector('.no-results')) {
          this.bookGrid.appendChild(noResults);
        }
      } else {
        // Remove no results message if it exists
        const noResults = this.bookGrid.querySelector('.no-results');
        if (noResults) {
          noResults.remove();
        }
      }
    }
    
    /**
     * Check which books are available offline
     */
    async checkOfflineAvailability() {
      if (!window.offlineManager) return;
      
      const books = this.bookGrid.querySelectorAll('.book-card');
      
      for (const book of books) {
        const bookLink = book.querySelector('.book-link');
        if (!bookLink) continue;
        
        const href = bookLink.getAttribute('href');
        const bookId = href.split('id=')[1]?.split('&')[0];
        
        if (bookId) {
          const isOffline = await window.offlineManager.isBookAvailableOffline(bookId);
          
          if (isOffline) {
            book.classList.add('offline-available');
            
            // Add offline badge
            if (!book.querySelector('.offline-badge')) {
              const badge = document.createElement('div');
              badge.className = 'offline-badge';
              badge.textContent = 'Available Offline';
              book.querySelector('.book-cover').appendChild(badge);
            }
          }
        }
      }
    }
    
    /**
     * Load books from offline storage
     */
    async loadOfflineBooks() {
      if (!window.offlineManager) {
        this.showError('Offline functionality not available');
        return;
      }
      
      try {
        const offlineBooks = await window.offlineManager.getAllOfflineBooks();
        
        if (!offlineBooks || offlineBooks.length === 0) {
          this.showError('No books available offline');
          return;
        }
        
        // Add offline indicator
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'offline-notice';
        offlineIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> You are currently offline. Showing books available for offline reading.';
        
        // Clear and append
        this.bookGrid.innerHTML = '';
        this.bookGrid.appendChild(offlineIndicator);
        
        // Filter books by category/search if needed
        let filteredBooks = offlineBooks;
        
        if (this.currentCategory && this.currentCategory !== 'all') {
          filteredBooks = offlineBooks.filter(book => book.category_id === this.currentCategory);
        }
        
        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase();
          filteredBooks = filteredBooks.filter(book => {
            return book.title.toLowerCase().includes(query) || 
                   book.author.toLowerCase().includes(query);
          });
        }
        
        if (filteredBooks.length === 0) {
          this.bookGrid.innerHTML += '<p class="no-results">No offline books match your criteria.</p>';
          return;
        }
        
        // Render books
        filteredBooks.forEach(book => {
          const bookCard = document.createElement('div');
          bookCard.className = 'book-card offline-available';
          bookCard.setAttribute('data-format', book.format.toLowerCase());
          
          bookCard.innerHTML = `
            <div class="book-cover">
              <img src="${book.cover_image || '/assets/images/default-cover.jpg'}" alt="${book.title}">
              <div class="book-format">${book.format}</div>
              <div class="offline-badge">Available Offline</div>
            </div>
            <div class="book-info">
              <h3 class="book-title">${book.title}</h3>
              <div class="book-author">${book.author}</div>
              <div class="book-category">${book.category_name || 'Unknown'}</div>
            </div>
            <a href="index.php?page=reader&id=${book.id}&format=${book.format}" class="book-link"></a>
          `;
          
          this.bookGrid.appendChild(bookCard);
        });
      } catch (error) {
        console.error('Error loading offline books:', error);
        this.showError('Failed to load offline books');
      }
    }
    
    /**
     * Show loading state
     */
    showLoading() {
      if (!this.bookGrid) return;
      
      // Add loader if not exists
      if (!this.bookGrid.querySelector('.loader')) {
        const loader = document.createElement('div');
        loader.className = 'loader';
        this.bookGrid.innerHTML = '';
        this.bookGrid.appendChild(loader);
      }
    }
    
    /**
     * Hide loading state
     */
    hideLoading() {
      if (!this.bookGrid) return;
      
      // Remove loader if exists
      const loader = this.bookGrid.querySelector('.loader');
      if (loader) {
        loader.remove();
      }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
      if (!this.bookGrid) return;
      
      this.bookGrid.innerHTML = `<p class="catalog-error">${message}</p>`;
    }
  }
  
  // Initialize catalog on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the catalog page
    if (document.getElementById('book-grid')) {
      const catalogModule = new CatalogModule();
      
      // Make it available globally
      window.catalogModule = catalogModule;
    }
  });