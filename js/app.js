/**
 * Mini Checkout Application Logic
 */

(function () {
  'use strict';

  // Products catalog definition (fixed prices)
  const PRODUCTS = [
    {
      id: 'prod-1',
      name: 'Wireless Ergonomic Mouse',
      price: 35.00,
      description: 'Precision optical sensor, silent clicks, and contoured grip.'
    },
    {
      id: 'prod-2',
      name: 'Mechanical Compact Keyboard',
      price: 75.00,
      description: 'Custom tactile switches, durable PBT keycaps, compact 75% layout.'
    }
  ];

  // State
  const state = {
    cart: {}, // productId -> { product, quantity }
    isSubmitting: false,
    orderPlaced: false,
    confirmationCount: 0,
    lastConfirmedOrder: null
  };

  // DOM Elements
  const cartAlert = document.getElementById('cart-alert');
  const cartAlertMessage = document.getElementById('cart-alert-message');
  const cartEmptyMessage = document.getElementById('cart-empty-message');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartCountBadge = document.getElementById('cart-count-badge');
  const subtotalAmount = document.getElementById('subtotal-amount');
  const orderTotalAmount = document.getElementById('order-total-amount');
  const checkoutForm = document.getElementById('checkout-form');
  const customerNameInput = document.getElementById('customer-name');
  const customerEmailInput = document.getElementById('customer-email');
  const nameError = document.getElementById('name-error');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const checkoutView = document.getElementById('checkout-view');
  const confirmationView = document.getElementById('confirmation-view');
  const confirmCustomerName = document.getElementById('confirm-customer-name');
  const confirmOrderRef = document.getElementById('confirm-order-ref');
  const confirmItemsList = document.getElementById('confirm-items-list');
  const confirmTotalAmount = document.getElementById('confirm-total-amount');
  const startNewOrderBtn = document.getElementById('start-new-order-btn');

  // Format currency utility
  function formatCurrency(amount) {
    return '$' + amount.toFixed(2);
  }

  // Calculate cart summary
  function getCartSummary() {
    let totalItems = 0;
    let totalAmount = 0;
    const items = [];

    for (const [productId, item] of Object.entries(state.cart)) {
      if (item.quantity > 0) {
        totalItems += item.quantity;
        const lineTotal = item.quantity * item.product.price;
        totalAmount += lineTotal;
        items.push({
          id: productId,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          lineTotal: lineTotal
        });
      }
    }

    return {
      totalItems,
      totalAmount,
      items
    };
  }

  // Render Cart UI
  function renderCart() {
    const summary = getCartSummary();

    // Update count badge
    cartCountBadge.textContent = `${summary.totalItems} ${summary.totalItems === 1 ? 'item' : 'items'}`;

    // Update totals
    subtotalAmount.textContent = formatCurrency(summary.totalAmount);
    orderTotalAmount.textContent = formatCurrency(summary.totalAmount);

    if (summary.totalItems === 0) {
      cartEmptyMessage.classList.remove('hidden');
      cartItemsContainer.classList.add('hidden');
      cartItemsContainer.innerHTML = '';
      return;
    }

    cartEmptyMessage.classList.add('hidden');
    cartItemsContainer.classList.remove('hidden');

    // Build cart items HTML
    cartItemsContainer.innerHTML = summary.items.map(item => `
      <div class="cart-item-row" data-product-id="${item.id}" data-testid="cart-item-${item.id}">
        <div class="cart-item-info">
          <div class="cart-item-title" data-testid="cart-item-name-${item.id}">${item.name}</div>
          <div class="cart-item-unit-price">${formatCurrency(item.price)} each</div>
        </div>
        <div class="cart-item-controls">
          <button 
            type="button" 
            class="qty-btn" 
            data-action="decrease" 
            data-id="${item.id}"
            data-testid="decrease-qty-${item.id}"
            aria-label="Decrease quantity of ${item.name}">-</button>
          <input 
            type="number" 
            class="qty-input" 
            min="1" 
            max="99" 
            value="${item.quantity}" 
            data-id="${item.id}"
            data-testid="qty-input-${item.id}"
            aria-label="Quantity of ${item.name}" />
          <button 
            type="button" 
            class="qty-btn" 
            data-action="increase" 
            data-id="${item.id}"
            data-testid="increase-qty-${item.id}"
            aria-label="Increase quantity of ${item.name}">+</button>
          <button 
            type="button" 
            class="remove-btn" 
            data-action="remove" 
            data-id="${item.id}"
            data-testid="remove-item-${item.id}"
            title="Remove item"
            aria-label="Remove ${item.name} from cart">&times;</button>
        </div>
        <div class="cart-item-total" data-testid="line-total-${item.id}">
          ${formatCurrency(item.lineTotal)}
        </div>
      </div>
    `).join('');

    // Attach event listeners for dynamic controls
    attachCartEventListeners();
  }

  // Cart operations
  function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    if (!state.cart[productId]) {
      state.cart[productId] = {
        product: product,
        quantity: 1
      };
    } else {
      state.cart[productId].quantity += 1;
    }

    clearCartAlert();
    renderCart();
  }

  function updateQuantity(productId, newQty) {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (state.cart[productId]) {
      state.cart[productId].quantity = qty;
      renderCart();
    }
  }

  function removeFromCart(productId) {
    if (state.cart[productId]) {
      delete state.cart[productId];
      renderCart();
    }
  }

  function clearCartAlert() {
    cartAlert.classList.add('hidden');
    cartAlertMessage.textContent = '';
  }

  function showCartAlert(message) {
    cartAlertMessage.textContent = message;
    cartAlert.classList.remove('hidden');
    cartAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearFieldError() {
    nameError.classList.add('hidden');
    customerNameInput.classList.remove('is-invalid');
    customerNameInput.removeAttribute('aria-invalid');
  }

  function showFieldError(message) {
    nameError.textContent = message;
    nameError.classList.remove('hidden');
    customerNameInput.classList.add('is-invalid');
    customerNameInput.setAttribute('aria-invalid', 'true');
    customerNameInput.focus();
  }

  function generateOrderReference() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ORD-${code}`;
  }

  // Attach event listeners to cart controls
  function attachCartEventListeners() {
    cartItemsContainer.querySelectorAll('.qty-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const id = e.currentTarget.getAttribute('data-id');
        if (!state.cart[id]) return;

        if (action === 'increase') {
          updateQuantity(id, state.cart[id].quantity + 1);
        } else if (action === 'decrease') {
          updateQuantity(id, state.cart[id].quantity - 1);
        }
      });
    });

    cartItemsContainer.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        updateQuantity(id, e.currentTarget.value);
      });
    });

    cartItemsContainer.querySelectorAll('.remove-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        removeFromCart(id);
      });
    });
  }

  // Process checkout submission
  function handleCheckout(e) {
    if (e) {
      e.preventDefault();
    }

    // 1. Guard against double-click / concurrent submissions
    if (state.isSubmitting || state.orderPlaced) {
      console.warn('[Checkout] Submission blocked: duplicate click or order already placed.');
      return false;
    }

    clearCartAlert();
    clearFieldError();

    const summary = getCartSummary();
    const enteredName = customerNameInput.value;
    const trimmedName = enteredName.trim();

    // 2. Validate Cart Not Empty
    if (summary.totalItems === 0) {
      showCartAlert('Your cart is empty. Please add at least one product before placing your order.');
      // Important: customer input is preserved, not touched
      return false;
    }

    // 3. Validate Required Field: Name
    if (!trimmedName) {
      showFieldError('Please enter your full name.');
      // Important: customer input is preserved (even if only whitespace or empty)
      return false;
    }

    // 4. Set submission lock immediately to prevent duplicate orders
    state.isSubmitting = true;
    placeOrderBtn.disabled = true;
    const btnText = placeOrderBtn.querySelector('.btn-text');
    const btnSpinner = placeOrderBtn.querySelector('.btn-spinner');
    if (btnText) btnText.textContent = 'Processing Order...';
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    // Generate Order
    const orderRef = generateOrderReference();
    const orderData = {
      orderReference: orderRef,
      customerName: trimmedName,
      customerEmail: customerEmailInput.value.trim(),
      items: JSON.parse(JSON.stringify(summary.items)),
      totalAmount: summary.totalAmount,
      placedAt: new Date().toISOString()
    };

    // Increment confirmation count and mark order placed
    state.confirmationCount += 1;
    state.orderPlaced = true;
    state.lastConfirmedOrder = orderData;

    // Render Order Confirmation
    displayConfirmation(orderData);
    return true;
  }

  function displayConfirmation(order) {
    confirmCustomerName.textContent = order.customerName;
    confirmOrderRef.textContent = order.orderReference;
    confirmTotalAmount.textContent = formatCurrency(order.totalAmount);

    confirmItemsList.innerHTML = order.items.map(item => `
      <div class="confirm-item-row" data-testid="confirm-item-${item.id}">
        <span class="item-name">${item.name} &times; ${item.quantity}</span>
        <span class="item-line-total">${formatCurrency(item.lineTotal)}</span>
      </div>
    `).join('');

    // Hide checkout view, show confirmation view
    checkoutView.classList.add('hidden');
    confirmationView.classList.remove('hidden');
    confirmationView.scrollIntoView({ behavior: 'smooth' });
  }

  function resetToNewOrder() {
    state.cart = {};
    state.isSubmitting = false;
    state.orderPlaced = false;
    state.lastConfirmedOrder = null;

    customerNameInput.value = '';
    customerEmailInput.value = '';
    clearCartAlert();
    clearFieldError();

    placeOrderBtn.disabled = false;
    const btnText = placeOrderBtn.querySelector('.btn-text');
    const btnSpinner = placeOrderBtn.querySelector('.btn-spinner');
    if (btnText) btnText.textContent = 'Place Order';
    if (btnSpinner) btnSpinner.classList.add('hidden');

    renderCart();

    confirmationView.classList.add('hidden');
    checkoutView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Initialize
  function init() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.currentTarget.getAttribute('data-id');
        addToCart(productId);
      });
    });

    // Real-time input error clearing on user typing
    customerNameInput.addEventListener('input', () => {
      if (customerNameInput.value.trim().length > 0) {
        clearFieldError();
      }
    });

    // Form submit
    checkoutForm.addEventListener('submit', handleCheckout);

    // Explicit click on place order button (in case form submit doesn't trigger)
    placeOrderBtn.addEventListener('click', (e) => {
      // Form submit event handles the submission, but if type="submit" was clicked, prevent duplicate dispatch
    });

    // Start new order button
    startNewOrderBtn.addEventListener('click', resetToNewOrder);

    // Initial render
    renderCart();

    // Expose internal state for testing and inspection
    window.__CHECKOUT_STATE__ = state;
    window.__CHECKOUT_ACTIONS__ = {
      addToCart,
      updateQuantity,
      removeFromCart,
      handleCheckout,
      resetToNewOrder,
      getCartSummary
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
