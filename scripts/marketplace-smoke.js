const crypto = require("crypto");

const BASE_URL = (process.env.MARKETPLACE_BASE_URL || "https://ebook-website-theta-nine.vercel.app").replace(/\/$/, "");
const API_URL = (process.env.MARKETPLACE_API_BASE_URL || BASE_URL).replace(/\/$/, "");
const FRONTEND_URL = (process.env.MARKETPLACE_FRONTEND_URL || BASE_URL).replace(/\/$/, "");
const BOOK_ID = process.env.SMOKE_BOOK_ID || "6a15cf8a120f0f9b32a6069c";
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || "Testpass123";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function main() {
  const email = `smoke-${Date.now()}-${crypto.randomBytes(2).toString("hex")}@example.com`;
  const report = {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    frontendUrl: FRONTEND_URL,
    bookId: BOOK_ID,
    email,
    checks: [],
  };

  const pushCheck = (name, passed, details) => {
    report.checks.push({ name, passed, details });
  };

  const register = await fetchJson(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Marketplace Smoke",
      email,
      password: PASSWORD,
      role: "reader",
    }),
  });

  assert(register.status === 201 && register.data.success && register.data.token, "Registration failed");
  pushCheck("register", true, {
    status: register.status,
    success: register.data.success,
  });

  const token = register.data.token;
  const authHeaders = {
    authorization: `Bearer ${token}`,
  };

  const book = await fetchJson(`${API_URL}/api/books/${BOOK_ID}`);
  assert(book.ok && book.data.book, "Book lookup failed");
  assert(book.data.access?.canPreview === true, "Paid book preview should be enabled");
  assert(book.data.access?.canDownload === false, "Paid book should not download before purchase");
  pushCheck("book access", true, {
    status: book.status,
    title: book.data.book.title,
    canPreview: book.data.access?.canPreview,
    canDownload: book.data.access?.canDownload,
    previewPages: book.data.book.previewPages,
  });

  const downloadBeforePay = await fetchJson(`${API_URL}/api/books/${BOOK_ID}/download`, {
    headers: authHeaders,
  });
  assert(downloadBeforePay.status === 403, "Download should be blocked before purchase");
  pushCheck("download locked", true, {
    status: downloadBeforePay.status,
    message: downloadBeforePay.data.message,
  });

  const addToCart = await fetchJson(`${API_URL}/api/cart/add`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify({ bookId: BOOK_ID }),
  });
  assert(addToCart.ok && addToCart.data.success, "Add to cart failed");
  pushCheck("add to cart", true, {
    status: addToCart.status,
    cartCount: addToCart.data.cartCount,
    message: addToCart.data.message,
  });

  const cart = await fetchJson(`${API_URL}/api/cart`, {
    headers: authHeaders,
  });
  assert(cart.ok && Array.isArray(cart.data.items) && cart.data.items.length === 1, "Cart should contain one item");
  assert(Number(cart.data.total || 0) === Number(book.data.book.price || 0), "Cart total should match book price");
  pushCheck("cart totals", true, {
    status: cart.status,
    cartCount: cart.data.cartCount,
    total: cart.data.total,
  });

  const checkout = await fetchJson(`${API_URL}/api/payments/create-checkout-cart`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      bookIds: [BOOK_ID],
      country: "IN",
      currency: "INR",
    }),
  });
  assert(checkout.ok && checkout.data.success, "Checkout creation failed");
  assert(
    checkout.data.checkoutMode === "manual_fallback" || Boolean(checkout.data.url),
    "Checkout should return a payment route"
  );
  pushCheck("checkout route", true, {
    status: checkout.status,
    checkoutMode: checkout.data.checkoutMode || "stripe",
    url: checkout.data.url || null,
    message: checkout.data.message || null,
  });

  const paymentConfig = await fetchJson(`${API_URL}/api/payments/config?country=IN&currency=INR`);
  assert(paymentConfig.ok && paymentConfig.data.success, "Payment config failed");
  assert(paymentConfig.data.manualCheckout?.enabled === true, "Manual checkout should be enabled");
  assert(paymentConfig.data.methods?.UPI?.upiId, "UPI ID should be configured");
  pushCheck("payment config", true, {
    status: paymentConfig.status,
    reasonCode: paymentConfig.data.manualCheckout?.reasonCode,
    availableMethods: paymentConfig.data.founder?.availableMethods || [],
    upiId: paymentConfig.data.methods?.UPI?.upiId || "",
  });

  const homepageResponse = await fetch(`${FRONTEND_URL}/index.html`, { cache: "no-store" });
  const homepageHtml = await homepageResponse.text();
  assert(homepageResponse.ok, "Homepage request failed");
  assert(homepageHtml.includes('id="heroPrimaryCard"'), "Homepage hero card missing");
  assert(homepageHtml.includes('href="explore.html" class="book-card featured hero-tilt-card" id="heroPrimaryCard"'), "Homepage hero fallback link is not safe");
  pushCheck("homepage fallback", true, {
    status: homepageResponse.status,
    heroFallbackSafe: true,
  });

  const homepageScriptResponse = await fetch(`${FRONTEND_URL}/script.js`, { cache: "no-store" });
  const homepageScript = await homepageScriptResponse.text();
  assert(homepageScriptResponse.ok, "Homepage script request failed");
  assert(homepageScript.includes('const primary = document.getElementById("heroPrimaryCard");'), "Homepage hero hydration is missing");
  pushCheck("homepage hydration", true, {
    status: homepageScriptResponse.status,
    heroHydrationLive: true,
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        apiUrl: API_URL,
        frontendUrl: FRONTEND_URL,
        bookId: BOOK_ID,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
