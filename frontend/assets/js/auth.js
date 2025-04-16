/**
 * E-Library Authentication Module
 * Handles user authentication operations
 */
class AuthModule {
    constructor() {
      // Initialize auth state
      this.token = localStorage.getItem('auth_token');
      this.user = null;
      
      // Bind event handlers
      this.bindLoginForm();
      this.bindRegisterForm();
      this.bindLogoutButtons();
      
      // Check auth status on init if token exists
      if (this.token) {
        this.checkAuthStatus();
      }
    }
    
    /**
     * Bind login form submission
     */
    bindLoginForm() {
      const loginForm = document.getElementById('login-form');
      if (!loginForm) return;
      
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
        
        // Clear previous errors
        const errorContainer = document.querySelector('.alert-danger');
        if (errorContainer) {
          errorContainer.style.display = 'none';
        }
        
        // Get form data
        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;
        const remember = loginForm.querySelector('input[name="remember"]')?.checked || false;
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              password,
              remember
            })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Save auth token
            localStorage.setItem('auth_token', data.token);
            this.token = data.token;
            this.user = data.user;
            
            // Redirect after login
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            
            if (redirect) {
              window.location.href = `index.php?page=${redirect}`;
            } else {
              window.location.href = 'index.php';
            }
          } else {
            // Show error
            if (!errorContainer) {
              const newError = document.createElement('div');
              newError.className = 'alert alert-danger';
              newError.textContent = data.message || 'Login failed. Please check your credentials.';
              loginForm.prepend(newError);
            } else {
              errorContainer.textContent = data.message || 'Login failed. Please check your credentials.';
              errorContainer.style.display = 'block';
            }
            
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
          }
        } catch (error) {
          console.error('Login error:', error);
          
          // Show error
          if (!errorContainer) {
            const newError = document.createElement('div');
            newError.className = 'alert alert-danger';
            newError.textContent = 'Login failed. Please try again later.';
            loginForm.prepend(newError);
          } else {
            errorContainer.textContent = 'Login failed. Please try again later.';
            errorContainer.style.display = 'block';
          }
          
          // Reset button
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      });
    }
    
    /**
     * Bind register form submission
     */
    bindRegisterForm() {
      const registerForm = document.getElementById('register-form');
      if (!registerForm) return;
      
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';
        
        // Clear previous errors
        const errorContainer = document.querySelector('.alert-danger');
        if (errorContainer) {
          errorContainer.style.display = 'none';
        }
        
        // Get form data
        const username = registerForm.querySelector('input[name="username"]').value;
        const email = registerForm.querySelector('input[name="email"]').value;
        const password = registerForm.querySelector('input[name="password"]').value;
        const confirmPassword = registerForm.querySelector('input[name="confirm_password"]').value;
        
        // Validate form
        if (password !== confirmPassword) {
          // Show error
          if (!errorContainer) {
            const newError = document.createElement('div');
            newError.className = 'alert alert-danger';
            newError.textContent = 'Passwords do not match.';
            registerForm.prepend(newError);
          } else {
            errorContainer.textContent = 'Passwords do not match.';
            errorContainer.style.display = 'block';
          }
          
          // Reset button
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
          return;
        }
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username,
              email,
              password
            })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Save auth token
            localStorage.setItem('auth_token', data.token);
            this.token = data.token;
            this.user = data.user;
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success';
            successMessage.textContent = 'Registration successful! Redirecting...';
            registerForm.prepend(successMessage);
            
            // Redirect after registration
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            
            setTimeout(() => {
              if (redirect) {
                window.location.href = `index.php?page=${redirect}`;
              } else {
                window.location.href = 'index.php';
              }
            }, 2000);
          } else {
            // Show error
            if (!errorContainer) {
              const newError = document.createElement('div');
              newError.className = 'alert alert-danger';
              newError.textContent = data.message || 'Registration failed. Please try again.';
              registerForm.prepend(newError);
            } else {
              errorContainer.textContent = data.message || 'Registration failed. Please try again.';
              errorContainer.style.display = 'block';
            }
            
            // Reset button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
          }
        } catch (error) {
          console.error('Registration error:', error);
          
          // Show error
          if (!errorContainer) {
            const newError = document.createElement('div');
            newError.className = 'alert alert-danger';
            newError.textContent = 'Registration failed. Please try again later.';
            registerForm.prepend(newError);
          } else {
            errorContainer.textContent = 'Registration failed. Please try again later.';
            errorContainer.style.display = 'block';
          }
          
          // Reset button
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      });
    }
    
    /**
     * Bind logout buttons
     */
    bindLogoutButtons() {
      document.querySelectorAll('.logout-button, #logout-button, #header-logout-button').forEach(button => {
        if (button) {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
          });
        }
      });
    }
    
    /**
     * Check authentication status
     */
    async checkAuthStatus() {
      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.user = data.user;
          return true;
        } else {
          // Invalid token, clear auth
          this.logout(false);
          return false;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        return false;
      }
    }
    
    /**
     * Logout user
     * @param {boolean} redirect - Whether to redirect after logout
     */
    logout(redirect = true) {
      // Clear auth data
      localStorage.removeItem('auth_token');
      this.token = null;
      this.user = null;
      
      // API call to logout (optional, as JWT is stateless)
      fetch('/api/auth/logout', {
        method: 'POST'
      }).catch(error => {
        console.error('Logout error:', error);
      });
      
      // Redirect to home page
      if (redirect) {
        window.location.href = 'index.php';
      }
    }
    
    /**
     * Check if user is logged in
     * @returns {boolean} True if logged in
     */
    isLoggedIn() {
      return !!this.token;
    }
    
    /**
     * Get current user
     * @returns {Object|null} User object or null if not logged in
     */
    getCurrentUser() {
      return this.user;
    }
    
    /**
     * Get auth token
     * @returns {string|null} Auth token or null if not logged in
     */
    getToken() {
      return this.token;
    }
  }
  
  // Initialize auth module
  const authModule = new AuthModule();
  
  // Make auth module available globally
  window.authModule = authModule;