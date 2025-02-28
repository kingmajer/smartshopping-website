// ========================
// CORE APPLICATION MODULE
// ========================
const SmartShopping = (() => {
  // Configuration
  const config = {
    api: {
      search: 'https://api.example.com/products',
      prices: 'https://api.example.com/compare'
    },
    localStorageKeys: {
      user: 'ss_user',
      cart: 'ss_cart',
      session: 'ss_session'
    },
    notificationDuration: 5000
  };

  // State Management
  let state = {
    user: null,
    cart: [],
    searchResults: [],
    currentSession: null
  };

  // ========================
  // INITIALIZATION
  // ========================
  function init() {
    loadPersistedData();
    initEventListeners();
    initServiceWorker();
    showNotification('Welcome to Smart Shopping!');
  }

  // ========================
  // AUTHENTICATION SYSTEM
  // ========================
  const auth = {
    async login(email, password) {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const user = await response.json();
        state.user = user;
        localStorage.setItem(config.localStorageKeys.user, JSON.stringify(user));
        this.updateAuthUI();
        return true;
      } catch (error) {
        showNotification('Login failed: ' + error.message, 'error');
        return false;
      }
    },

    logout() {
      state.user = null;
      localStorage.removeItem(config.localStorageKeys.user);
      this.updateAuthUI();
    },

    updateAuthUI() {
      const authElements = document.querySelectorAll('.auth-state');
      authElements.forEach(el => {
        el.textContent = state.user ? `Welcome, ${state.user.name}` : 'Guest';
      });
    }
  };

  // ========================
  // SEARCH & PRICE COMPARISON
  // ========================
  const search = {
    timer: null,

    async handleInput(query) {
      clearTimeout(this.timer);
      this.timer = setTimeout(async () => {
        if (query.length > 2) {
          await this.fetchSuggestions(query);
          await this.fetchPriceComparisons(query);
        }
      }, 300);
    },

    async fetchSuggestions(query) {
      try {
        const response = await fetch(`${config.api.search}?q=${query}`);
        const data = await response.json();
        state.searchResults = data.results;
        this.displaySuggestions(data.results);
      } catch (error) {
        showNotification('Failed to load suggestions', 'error');
      }
    },

    async fetchPriceComparisons(query) {
      try {
        const response = await fetch(`${config.api.prices}?product=${query}`);
        const prices = await response.json();
        this.displayPriceComparison(prices);
      } catch (error) {
        showNotification('Price comparison unavailable', 'warning');
      }
    },

    displaySuggestions(results) {
      const container = document.getElementById('suggestions-container');
      container.innerHTML = results.map(result => `
        <div class="suggestion-item">${result.name}</div>
      `).join('');
    },

    displayPriceComparison(prices) {
      const container = document.getElementById('price-comparison');
      container.innerHTML = prices.map(shop => `
        <div class="shop-price">
          <h3>${shop.retailer}</h3>
          <p>$${shop.price}</p>
          <button onclick="SmartShopping.cart.addItem('${shop.id}')">
            Add to Cart
          </button>
        </div>
      `).join('');
    }
  };

  // ========================
  // SHOPPING CART SYSTEM
  // ========================
  const cart = {
    addItem(productId) {
      const product = state.searchResults.find(p => p.id === productId);
      if (product) {
        state.cart.push({ ...product, quantity: 1 });
        this.updateCartUI();
        this.persistCart();
      }
    },

    removeItem(index) {
      state.cart.splice(index, 1);
      this.updateCartUI();
      this.persistCart();
    },

    updateCartUI() {
      const cartCount = document.getElementById('cart-count');
      cartCount.textContent = state.cart.length;
      
      const cartItems = document.getElementById('cart-items');
      cartItems.innerHTML = state.cart.map((item, index) => `
        <div class="cart-item">
          <span>${item.name}</span>
          <button onclick="SmartShopping.cart.removeItem(${index})">
            Remove
          </button>
        </div>
      `).join('');
    },

    persistCart() {
      localStorage.setItem(
        config.localStorageKeys.cart,
        JSON.stringify(state.cart)
      );
    }
  };

  // ========================
  // PAYMENT SYSTEM
  // ========================
  const payment = {
    async processPayment(amount) {
      try {
        const response = await fetch('/api/payment', {
          method: 'POST',
          body: JSON.stringify({
            amount,
            user: state.user?.id
          })
        });
        return await response.json();
      } catch (error) {
        showNotification('Payment processing failed', 'error');
        throw error;
      }
    },

    generateQR(data) {
      const qrContainer = document.getElementById('qr-modal');
      // QR generation logic here
      qrContainer.innerHTML = `<img src="${data.qrUrl}" alt="Payment QR">`;
    }
  };

  // ========================
  // HELPER FUNCTIONS
  // ========================
  function loadPersistedData() {
    state.user = JSON.parse(localStorage.getItem(config.localStorageKeys.user));
    state.cart = JSON.parse(localStorage.getItem(config.localStorageKeys.cart)) || [];
    cart.updateCartUI();
    auth.updateAuthUI();
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, config.notificationDuration);
  }

  function initEventListeners() {
    document.getElementById('search-input')
      .addEventListener('input', (e) => search.handleInput(e.target.value));
    
    document.getElementById('payment-form')
      ?.addEventListener('submit', handlePaymentSubmit);
  }

  async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Public API
  return {
    init,
    auth,
    search,
    cart,
    payment,
    showNotification
  };
})();

// Initialize application
window.addEventListener('DOMContentLoaded', SmartShopping.init);