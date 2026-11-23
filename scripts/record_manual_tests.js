const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const http = require('http');

function startStaticServer(port = 3000) {
  const PUBLIC_DIR = path.join(__dirname, '..');
  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`[Manual Runner] Internal test server started on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runManualTestEvidence() {
  const server = await startStaticServer(3000);
  const evidenceDir = path.join(__dirname, '..', 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const logResults = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('=== Starting Manual Test Run & Evidence Collection ===\n');

  // --------------------------------------------------------------------------
  // Scenario 1: Empty Cart Manual Test
  // --------------------------------------------------------------------------
  console.log('[Manual Test 1] Testing Empty Cart Checkout Attempt...');
  await page.goto('http://localhost:3000');

  // Customer enters Name while cart is empty
  const testName1 = 'Eleanor Vance';
  const testEmail1 = 'eleanor.vance@hillhouse.example';
  await page.locator('#customer-name').fill(testName1);
  await page.locator('#customer-email').fill(testEmail1);

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_1_empty_cart_before_submit.png') });

  // Customer clicks "Place Order"
  await page.locator('#place-order-btn').click();
  await page.waitForTimeout(300);

  const isAlertVisible = await page.locator('#cart-alert').isVisible();
  const alertText = await page.locator('#cart-alert-message').innerText();
  const preservedName = await page.locator('#customer-name').inputValue();
  const preservedEmail = await page.locator('#customer-email').inputValue();
  const isConfirmationVisible = await page.locator('#confirmation-view').isVisible();

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_1_empty_cart_validation_shown.png') });

  const m1Result = {
    testId: 'MANUAL-TC-01',
    name: 'Empty Cart Checkout Validation & Input Preservation',
    steps: [
      '1. Open checkout page at http://localhost:3000',
      '2. Leave cart empty ($0.00, 0 items)',
      '3. Enter "Eleanor Vance" in Full Name field and "eleanor.vance@hillhouse.example" in Email field',
      '4. Click "Place Order" button'
    ],
    expected: 'Checkout is blocked. Alert banner displays "Your cart is empty. Please add at least one product before placing your order." No confirmation is generated. Customer name and email remain intact.',
    actual: {
      alertDisplayed: isAlertVisible,
      alertMessageText: alertText,
      confirmationDisplayed: isConfirmationVisible,
      namePreserved: preservedName === testName1,
      emailPreserved: preservedEmail === testEmail1,
      actualPreservedName: preservedName,
      actualPreservedEmail: preservedEmail
    },
    passed: isAlertVisible && !isConfirmationVisible && preservedName === testName1 && preservedEmail === testEmail1,
    evidenceScreenshots: [
      'evidence/manual_test_1_empty_cart_before_submit.png',
      'evidence/manual_test_1_empty_cart_validation_shown.png'
    ]
  };
  logResults.push(m1Result);
  console.log(`[Manual Test 1 Result] ${m1Result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(` - Alert: "${alertText}"`);
  console.log(` - Name preserved: "${preservedName}"`);

  // --------------------------------------------------------------------------
  // Scenario 2: Rapid Double-Click Manual Test
  // --------------------------------------------------------------------------
  console.log('\n[Manual Test 2] Testing Rapid Double-Click on Place Order...');
  // Fresh page load for clean state
  await page.goto('http://localhost:3000');

  // Customer adds 1 product: Wireless Ergonomic Mouse ($35.00)
  await page.locator('[data-testid="add-prod-1-btn"]').click();
  const testName2 = 'Marcus Holloway';
  await page.locator('#customer-name').fill(testName2);

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_2_ready_to_double_click.png') });

  // Perform rapid consecutive clicks (< 30ms) on Place Order button
  const submitBtn = page.locator('#place-order-btn');
  
  // Rapid dispatch of two successive click events
  await Promise.all([
    submitBtn.click({ clickCount: 1 }),
    submitBtn.click({ clickCount: 1, delay: 10 })
  ]);

  await page.waitForTimeout(500);

  const isConfirmShown = await page.locator('#confirmation-view').isVisible();
  const confirmationCountState = await page.evaluate(() => window.__CHECKOUT_STATE__.confirmationCount);
  const confirmationHeadingsCount = await page.getByTestId('confirmation-heading').count();
  const orderRef = await page.locator('#confirm-order-ref').innerText();
  const totalAmountPaid = await page.locator('#confirm-total-amount').innerText();
  const isFormHidden = await page.locator('#checkout-view').isHidden();

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_2_single_confirmation_produced.png') });

  const m2Result = {
    testId: 'MANUAL-TC-02',
    name: 'Rapid Double-Click Idempotency & Duplicate Order Prevention',
    steps: [
      '1. Open checkout page at http://localhost:3000 from clean state',
      '2. Add Wireless Ergonomic Mouse ($35.00) to cart',
      '3. Enter "Marcus Holloway" in Full Name field',
      '4. Rapidly double-click "Place Order" button in quick succession (< 30ms interval)'
    ],
    expected: 'Only one order is processed. Exactly one confirmation is displayed with a single unique order reference. State confirmation count equals 1. No second order reference or duplicate UI is generated.',
    actual: {
      confirmationViewVisible: isConfirmShown,
      stateConfirmationCount: confirmationCountState,
      domConfirmationHeadersCount: confirmationHeadingsCount,
      orderReferenceGenerated: orderRef,
      totalAmountPaid: totalAmountPaid,
      checkoutFormHidden: isFormHidden
    },
    passed: isConfirmShown && confirmationCountState === 1 && confirmationHeadingsCount === 1 && /^ORD-[A-Z0-9]{8}$/.test(orderRef),
    evidenceScreenshots: [
      'evidence/manual_test_2_ready_to_double_click.png',
      'evidence/manual_test_2_single_confirmation_produced.png'
    ]
  };
  logResults.push(m2Result);
  console.log(`[Manual Test 2 Result] ${m2Result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(` - Confirmation count: ${confirmationCountState}`);
  console.log(` - Order Ref: "${orderRef}"`);
  console.log(` - Total Paid: "${totalAmountPaid}"`);

  // --------------------------------------------------------------------------
  // Scenario 3: Missing Required Field Manual Test
  // --------------------------------------------------------------------------
  console.log('\n[Manual Test 3] Testing Blank Required Field Checkout Attempt...');
  await page.goto('http://localhost:3000');

  // Customer adds Mechanical Keyboard ($75.00)
  await page.locator('[data-testid="add-prod-2-btn"]').click();
  // Leaves Name blank, enters only whitespace "   "
  await page.locator('#customer-name').fill('   ');
  await page.locator('#customer-email').fill('dev@test.local');

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_3_missing_name_before_click.png') });

  await page.locator('#place-order-btn').click();
  await page.waitForTimeout(300);

  const isNameErrorVisible = await page.locator('#name-error').isVisible();
  const nameErrorText = await page.locator('#name-error').innerText();
  const isNameInvalidAttr = await page.locator('#customer-name').getAttribute('aria-invalid');
  const preservedWhitespace = await page.locator('#customer-name').inputValue();
  const preservedEmail3 = await page.locator('#customer-email').inputValue();
  const isConfirmShown3 = await page.locator('#confirmation-view').isVisible();

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_3_missing_name_error_shown.png') });

  const m3Result = {
    testId: 'MANUAL-TC-03',
    name: 'Whitespace / Blank Required Field Validation',
    steps: [
      '1. Open checkout page at http://localhost:3000 from clean state',
      '2. Add Mechanical Compact Keyboard ($75.00) to cart',
      '3. Enter only whitespace ("   ") into Full Name input and "dev@test.local" into Email',
      '4. Click "Place Order" button'
    ],
    expected: 'Checkout is blocked. Inline field error shows "Please enter your full name." aria-invalid is set to true. Confirmation is NOT displayed. Customer input is preserved.',
    actual: {
      nameErrorVisible: isNameErrorVisible,
      nameErrorText: nameErrorText,
      ariaInvalid: isNameInvalidAttr,
      preservedWhitespaceInput: preservedWhitespace,
      preservedEmail: preservedEmail3,
      confirmationDisplayed: isConfirmShown3
    },
    passed: isNameErrorVisible && !isConfirmShown3 && isNameInvalidAttr === 'true' && preservedEmail3 === 'dev@test.local',
    evidenceScreenshots: [
      'evidence/manual_test_3_missing_name_before_click.png',
      'evidence/manual_test_3_missing_name_error_shown.png'
    ]
  };
  logResults.push(m3Result);
  console.log(`[Manual Test 3 Result] ${m3Result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(` - Field error: "${nameErrorText}"`);

  // --------------------------------------------------------------------------
  // Scenario 4: Dynamic Quantity Change & Exact Calculations
  // --------------------------------------------------------------------------
  console.log('\n[Manual Test 4] Testing Quantity Change and Total Calculations...');
  await page.goto('http://localhost:3000');

  // Add Product 1 ($35.00) and Product 2 ($75.00)
  await page.locator('[data-testid="add-prod-1-btn"]').click();
  await page.locator('[data-testid="add-prod-2-btn"]').click();

  // Increase Product 1 quantity to 3
  await page.locator('[data-testid="increase-qty-prod-1"]').click();
  await page.locator('[data-testid="increase-qty-prod-1"]').click();

  const prod1LineTotal = await page.locator('[data-testid="line-total-prod-1"]').innerText();
  const prod2LineTotal = await page.locator('[data-testid="line-total-prod-2"]').innerText();
  const overallTotal = await page.locator('#order-total-amount').innerText();

  await page.screenshot({ path: path.join(evidenceDir, 'manual_test_4_quantity_change_and_totals.png') });

  const m4Result = {
    testId: 'MANUAL-TC-04',
    name: 'Dynamic Quantity Modification & Exact Arithmetic Calculations',
    steps: [
      '1. Open checkout page at http://localhost:3000 from clean state',
      '2. Add Wireless Ergonomic Mouse ($35.00) and Mechanical Keyboard ($75.00)',
      '3. Increment Mouse quantity twice (from 1 to 3)'
    ],
    expected: 'Mouse line total is $105.00 (3 * $35.00), Keyboard line total is $75.00, Order Total is $180.00 ($105.00 + $75.00).',
    actual: {
      prod1LineTotal,
      prod2LineTotal,
      overallTotal
    },
    passed: prod1LineTotal === '$105.00' && prod2LineTotal === '$75.00' && overallTotal === '$180.00',
    evidenceScreenshots: [
      'evidence/manual_test_4_quantity_change_and_totals.png'
    ]
  };
  logResults.push(m4Result);
  console.log(`[Manual Test 4 Result] ${m4Result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(` - Mouse line total: "${prod1LineTotal}"`);
  console.log(` - Keyboard line total: "${prod2LineTotal}"`);
  console.log(` - Overall total: "${overallTotal}"`);

  // Write manual test report json
  fs.writeFileSync(
    path.join(evidenceDir, 'manual_test_results.json'),
    JSON.stringify(logResults, null, 2),
    'utf-8'
  );

  await browser.close();
  server.close();
  console.log('\n=== Manual Test Run Completed. Evidence saved to /evidence directory ===\n');
}

runManualTestEvidence().catch(err => {
  console.error('Error during manual test execution:', err);
  process.exit(1);
});
