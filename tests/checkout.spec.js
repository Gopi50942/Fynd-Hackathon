const { test, expect } = require('@playwright/test');

test.describe('Mini Checkout - Customer Journey & Core Rules', () => {

  test.beforeEach(async ({ page }) => {
    // Start each check from a clean state
    await page.goto('/');
    // Assert page loaded cleanly with initial empty state
    await expect(page.getByTestId('cart-empty-message')).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('$0.00');
  });

  /**
   * Check 1: Verify a successful checkout produces a confirmation
   * Criteria:
   * - Starts from clean state
   * - Adds item to cart
   * - Fills required customer name
   * - Clicks Place Order
   * - Asserts confirmation screen is visible with reference, customer name, and exact total
   */
  test('Check 1: Successful checkout produces a valid order confirmation', async ({ page }) => {
    // 1. Customer adds Wireless Ergonomic Mouse ($35.00) to cart
    await page.getByTestId('add-prod-1-btn').click();

    // Verify item appears in cart with correct initial total
    await expect(page.getByTestId('cart-item-prod-1')).toBeVisible();
    await expect(page.getByTestId('line-total-prod-1')).toHaveText('$35.00');
    await expect(page.getByTestId('order-total')).toHaveText('$35.00');

    // 2. Customer fills required field: Full Name
    const customerName = 'Alex Morgan';
    await page.getByTestId('customer-name-input').fill(customerName);
    await expect(page.getByTestId('customer-name-input')).toHaveValue(customerName);

    // 3. Customer places order
    await page.getByTestId('place-order-btn').click();

    // 4. Assert on what the customer sees: Confirmation view is displayed
    const confirmationView = page.getByTestId('order-confirmation');
    await expect(confirmationView).toBeVisible();

    // Assert confirmation heading
    await expect(page.getByTestId('confirmation-heading')).toHaveText('Order Confirmed!');

    // Assert customer name is displayed in confirmation
    await expect(page.getByTestId('confirm-customer-name')).toHaveText(customerName);

    // Assert order reference is generated in expected format (e.g., ORD-XXXXXXXX)
    const orderRefLocator = page.getByTestId('order-reference');
    await expect(orderRefLocator).toBeVisible();
    await expect(orderRefLocator).toHaveText(/^ORD-[A-Z0-9]{8}$/);

    // Assert ordered items and total amount paid
    await expect(page.getByTestId('confirm-item-prod-1')).toBeVisible();
    await expect(page.getByTestId('confirm-item-prod-1')).toContainText('Wireless Ergonomic Mouse × 1');
    await expect(page.getByTestId('confirm-total-amount')).toHaveText('$35.00');

    // Assert checkout form is hidden to prevent duplicate actions
    await expect(page.locator('#checkout-view')).toBeHidden();
  });

  /**
   * Check 2: Verify a missing field blocks checkout
   * Criteria:
   * - Starts from clean state
   * - Adds item to cart
   * - Leaves required field blank (or only whitespace)
   * - Attempts to checkout
   * - Asserts checkout is blocked, no confirmation is displayed
   * - Asserts clear validation message is shown and customer input is preserved
   */
  test('Check 2: Missing required field blocks checkout with clear validation and preserves inputs', async ({ page }) => {
    // 1. Customer adds Mechanical Compact Keyboard ($75.00) to cart
    await page.getByTestId('add-prod-2-btn').click();
    await expect(page.getByTestId('cart-item-prod-2')).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('$75.00');

    // 2. Customer leaves Name blank, but fills in optional Email
    const optionalEmail = 'alex.morgan@example.com';
    await page.getByTestId('customer-email-input').fill(optionalEmail);

    // 3. Customer attempts to place order without entering name
    await page.getByTestId('place-order-btn').click();

    // 4. Assert checkout is blocked: Confirmation view must NOT be visible
    await expect(page.getByTestId('order-confirmation')).toBeHidden();

    // 5. Assert clear validation message is shown to customer
    const errorMsg = page.getByTestId('name-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText('Please enter your full name.');

    // 6. Assert input visual indicator shows invalid state
    const nameInput = page.getByTestId('customer-name-input');
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');

    // 7. Assert customer input preservation: Email field value is still intact
    await expect(page.getByTestId('customer-email-input')).toHaveValue(optionalEmail);

    // 8. Assert cart state is preserved
    await expect(page.getByTestId('order-total')).toHaveText('$75.00');
  });

  /**
   * Check 3: Verify a quantity change updates the exact total
   * Criteria:
   * - Starts from clean state
   * - Adds multiple items
   * - Changes quantities (increment, decrement)
   * - Asserts line totals and order total update accurately without fixed waits
   */
  test('Check 3: Quantity change updates line totals and order total with exact arithmetic', async ({ page }) => {
    // 1. Add Wireless Ergonomic Mouse ($35.00)
    await page.getByTestId('add-prod-1-btn').click();
    await expect(page.getByTestId('line-total-prod-1')).toHaveText('$35.00');
    await expect(page.getByTestId('order-total')).toHaveText('$35.00');

    // 2. Add Mechanical Compact Keyboard ($75.00)
    await page.getByTestId('add-prod-2-btn').click();
    await expect(page.getByTestId('line-total-prod-2')).toHaveText('$75.00');
    // Combined subtotal: 35 + 75 = 110.00
    await expect(page.getByTestId('order-total')).toHaveText('$110.00');

    // 3. Increase quantity of Mouse to 3 (click '+' button twice)
    const mouseIncreaseBtn = page.getByTestId('increase-qty-prod-1');
    await mouseIncreaseBtn.click();
    // After 1 click: qty 2, line total $70.00, order total $145.00
    await expect(page.getByTestId('line-total-prod-1')).toHaveText('$70.00');
    await expect(page.getByTestId('order-total')).toHaveText('$145.00');

    await mouseIncreaseBtn.click();
    // After 2nd click: qty 3, line total $105.00, order total $180.00
    await expect(page.getByTestId('line-total-prod-1')).toHaveText('$105.00');
    await expect(page.getByTestId('order-total')).toHaveText('$180.00');

    // 4. Decrease quantity of Mouse by 1 (click '-' button)
    const mouseDecreaseBtn = page.getByTestId('decrease-qty-prod-1');
    await mouseDecreaseBtn.click();
    // After 1 decrement: qty 2, line total $70.00, order total $145.00
    await expect(page.getByTestId('line-total-prod-1')).toHaveText('$70.00');
    await expect(page.getByTestId('order-total')).toHaveText('$145.00');

    // 5. Test direct quantity input update (e.g. keyboard qty set to 2)
    const keyboardQtyInput = page.getByTestId('qty-input-prod-2');
    await keyboardQtyInput.fill('2');
    await keyboardQtyInput.dispatchEvent('change');

    // Keyboard line total: 2 * $75.00 = $150.00
    await expect(page.getByTestId('line-total-prod-2')).toHaveText('$150.00');
    // Total: $70.00 + $150.00 = $220.00
    await expect(page.getByTestId('order-total')).toHaveText('$220.00');
  });

  /**
   * Additional Core Rule Check: Empty cart blocks checkout & preserves customer entered info
   */
  test('Check 4: Empty cart blocks checkout with clear message and preserves customer input', async ({ page }) => {
    // 1. Do not add any items - cart is empty ($0.00)
    await expect(page.getByTestId('cart-empty-message')).toBeVisible();

    // 2. Customer types their name
    const customerName = 'Jordan Rivera';
    await page.getByTestId('customer-name-input').fill(customerName);

    // 3. Customer attempts to place order with empty cart
    await page.getByTestId('place-order-btn').click();

    // 4. Assert checkout is blocked: confirmation must NOT be shown
    await expect(page.getByTestId('order-confirmation')).toBeHidden();

    // 5. Assert clear cart alert message is displayed
    const cartAlert = page.getByTestId('cart-alert');
    await expect(cartAlert).toBeVisible();
    await expect(cartAlert).toContainText('Your cart is empty. Please add at least one product before placing your order.');

    // 6. Assert customer name input is strictly preserved!
    await expect(page.getByTestId('customer-name-input')).toHaveValue(customerName);
  });

  /**
   * Additional Core Rule Check: Double-click prevention
   * Once an order is placed, clicking Place Order twice must not produce two confirmations.
   */
  test('Check 5: Rapid double-click on Place Order produces exactly one confirmation', async ({ page }) => {
    // 1. Add item and fill required name
    await page.getByTestId('add-prod-1-btn').click();
    await page.getByTestId('customer-name-input').fill('Sam Taylor');

    // 2. Double-click the Place Order button rapidly
    const placeOrderBtn = page.getByTestId('place-order-btn');
    await placeOrderBtn.dblclick();

    // 3. Verify confirmation screen is displayed
    await expect(page.getByTestId('order-confirmation')).toBeVisible();

    // 4. Assert only one confirmation element exists in DOM
    const confirmationHeaders = page.getByTestId('confirmation-heading');
    await expect(confirmationHeaders).toHaveCount(1);

    // 5. Assert application state confirms exactly 1 order was placed
    const stateConfirmationCount = await page.evaluate(() => window.__CHECKOUT_STATE__.confirmationCount);
    expect(stateConfirmationCount).toBe(1);

    // 6. Assert button is disabled or view is hidden
    await expect(page.locator('#checkout-view')).toBeHidden();
  });

  /**
   * Additional UX Flow: Placing another order resets state cleanly
   */
  test('Check 6: "Place Another Order" resets the checkout to a clean initial state', async ({ page }) => {
    // Place an order first
    await page.getByTestId('add-prod-1-btn').click();
    await page.getByTestId('customer-name-input').fill('Taylor Swift');
    await page.getByTestId('place-order-btn').click();
    await expect(page.getByTestId('order-confirmation')).toBeVisible();

    // Click "Place Another Order"
    await page.getByTestId('start-new-order-btn').click();

    // Verify reset to clean state
    await expect(page.locator('#checkout-view')).toBeVisible();
    await expect(page.getByTestId('order-confirmation')).toBeHidden();
    await expect(page.getByTestId('cart-empty-message')).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('$0.00');
    await expect(page.getByTestId('customer-name-input')).toHaveValue('');
  });

});
