# QuickStore - Mini Checkout and Browser Test Suite

A lightweight single-page checkout application and automated browser test suite built with pure semantic HTML5, modern CSS, vanilla JavaScript, and Playwright.

---

## 🌟 Overview & Key Features

This project fulfills all requirements for the Mini Checkout scenario:
1. **Single-Page Checkout**:
   - Two synthetic products with fixed prices:
     - **Wireless Ergonomic Mouse**: `$35.00`
     - **Mechanical Compact Keyboard**: `$75.00`
   - Customers can add items, remove items, and adjust quantities using `+` / `-` buttons or direct numeric input.
   - Dynamic real-time calculation of item line totals (`quantity * price`) and total order amount.
   - Required customer field: **Full Name** (with optional Email to demonstrate input preservation).
   - Clear order confirmation display showing personalized thank-you message, unique Order Reference (e.g., `ORD-XXXXXXXX`), itemized receipt, and total paid.
2. **Handling Common Mistakes**:
   - **Empty Cart Prevention**: Blocks checkout when cart is empty ($0.00 / 0 items), displays a prominent alert banner, and **strictly preserves** any customer details already entered.
   - **Missing Field Validation**: Blocks checkout when the required name is omitted or whitespace-only, displays clear field-level error messages (`role="alert"`), highlights the field with `aria-invalid="true"`, and **preserves** customer inputs.
   - **Double-Click Idempotency**: Clicking "Place Order" twice rapidly disables the button immediately and blocks subsequent requests, ensuring **only one confirmation** is produced.
3. **Automated Browser Test Suite (Playwright)**:
   - Automated checks verifying:
     - Check 1: Successful checkout produces an order confirmation with unique reference.
     - Check 2: Missing required field blocks checkout with clear validation and preserves inputs.
     - Check 3: Quantity change updates line totals and overall total with exact arithmetic.
     - Check 4: Empty cart blocks checkout and preserves customer entered details.
     - Check 5: Rapid double-click produces exactly one confirmation.
     - Check 6: "Place Another Order" cleanly resets the checkout session.
   - Clean state isolation: Each test starts with a fresh browser context.
   - User-centric assertions: Relies on what the customer sees on screen rather than arbitrary wait times.
4. **Test Plan & Quality Report**:
   - Complete risk prioritization matrix, manual test records (empty cart & rapid double-click), and screenshots in [`TEST_PLAN.md`](./TEST_PLAN.md).

---

## 📁 Repository Structure

```
fynd-hackathon/
├── index.html                  # Single-page checkout markup (semantic & accessible)
├── css/
│   └── styles.css              # Responsive UI styles, badges, alerts, confirmation card
├── js/
│   └── app.js                  # Cart calculations, validation, state management, double-click lock
├── server.js                   # Zero-dependency local static HTTP server (Node http module)
├── tests/
│   └── checkout.spec.js        # Playwright automated test suite (6 end-to-end tests)
├── scripts/
│   └── record_manual_tests.js  # Manual test runner capturing high-res screenshot evidence
├── evidence/                   # Manual test screenshots and JSON execution logs
│   ├── manual_test_1_empty_cart_before_submit.png
│   ├── manual_test_1_empty_cart_validation_shown.png
│   ├── manual_test_2_ready_to_double_click.png
│   ├── manual_test_2_single_confirmation_produced.png
│   ├── manual_test_3_missing_name_before_click.png
│   ├── manual_test_3_missing_name_error_shown.png
│   ├── manual_test_4_quantity_change_and_totals.png
│   └── manual_test_results.json
├── playwright.config.js        # Playwright configuration with automated webServer
├── package.json                # Project dependencies and test scripts
├── TEST_PLAN.md                # Test plan, risk prioritization, defect analysis & logs
└── README.md                   # Setup guide and documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm (v9+ or higher)

### 1. Installation
Clone or navigate to the repository directory and install dependencies:
```bash
npm install
```

*(Note: Playwright Chromium browser is pre-installed. If running in a new environment, install the browser binary via `npx playwright install chromium`)*.

---

## 💻 Running the Application Locally

To start the local web server:
```bash
npm start
```
The application will be running at:
👉 **`http://localhost:3000`**

Open `http://localhost:3000` in your web browser to interact with the checkout experience.

---

## 🧪 Running Automated Browser Tests

The Playwright test suite automatically boots `server.js`, runs tests against the live app, and shuts down cleanly.

### Run All Tests (Headless)
```bash
npm test
```

### Run Tests in Interactive UI Mode
```bash
npm run test:ui
```

### Run Tests in Headed Browser
```bash
npm run test:headed
```

### View HTML Test Report
```bash
npm run test:report
```

---

## 📸 Running Manual Test Evidence Collection

To re-run the manual test scenarios and regenerate high-resolution screenshot evidence:
```bash
node scripts/record_manual_tests.js
```

Evidence output will be stored in the [`/evidence`](./evidence) directory:
- `manual_test_1_empty_cart_validation_shown.png` — Confirms empty cart error banner and input preservation.
- `manual_test_2_single_confirmation_produced.png` — Confirms single confirmation upon rapid double-clicking.
- `manual_test_3_missing_name_error_shown.png` — Confirms inline validation for required name.
- `manual_test_4_quantity_change_and_totals.png` — Confirms line totals and order total calculation.
- `manual_test_results.json` — Structured JSON report containing all test steps, expectations, and actual values.

---

## 📋 Summary of Automated Test Results

```
Running 6 tests using 1 worker

  ✓ Check 1: Successful checkout produces a valid order confirmation (839ms)
  ✓ Check 2: Missing required field blocks checkout with clear validation and preserves inputs (687ms)
  ✓ Check 3: Quantity change updates line totals and order total with exact arithmetic (885ms)
  ✓ Check 4: Empty cart blocks checkout with clear message and preserves customer input (757ms)
  ✓ Check 5: Rapid double-click on Place Order produces exactly one confirmation (792ms)
  ✓ Check 6: "Place Another Order" resets the checkout to a clean initial state (980ms)

  6 passed (6.3s)
```

Refer to [`TEST_PLAN.md`](./TEST_PLAN.md) for detailed risk analysis, test specifications, manual test execution records, and defect analysis.
