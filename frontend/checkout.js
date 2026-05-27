const shell = window.StorefrontShell || {};
const API_BASE = window.API_BASE || shell.API_BASE || "";
const token = shell.token || localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const DEFAULT_MARKET = {
  countryCode: "IN",
  countryName: "India",
  currency: "INR",
  currencySymbol: "₹",
  locale: "en-IN",
  conversionRateFromInr: 1,
  manualCheckoutEnabled: true,
  headline: "UPI-first with manual proof support",
  manualCheckoutNote: "Manual screenshot approval and UPI checkout are available for this market.",
};

const DEFAULT_PAYMENT_CONFIG = {
  methods: {
    UPI: {
      label: "UPI Payment",
      details: "Pay from any UPI app using the QR below.",
      upiId: "",
      qrImage: "assets/payment/gpay-qr.PNG",
      configured: true,
    },
    GPay: {
      label: "Google Pay",
      details: "Scan this QR in Google Pay and confirm the exact order total.",
      upiId: "",
      qrImage: "assets/payment/gpay-qr.PNG",
      configured: true,
    },
    PayPal: {
      label: "PayPal",
      details: "Scan the PayPal QR or pay from the linked merchant account.",
      upiId: "",
      qrImage: "assets/payment/paypal-qr.PNG",
      configured: true,
    },
  },
  founder: {
    merchantName: "E-Book Market",
    supportNote: "",
    availableMethods: ["UPI", "GPay", "PayPal"],
  },
  selectedMarket: DEFAULT_MARKET,
  manualCheckout: {
    enabled: true,
    note: DEFAULT_MARKET.manualCheckoutNote,
    availableMethods: ["UPI", "GPay", "PayPal"],
    hasConfiguredRail: true,
    reasonCode: "enabled",
  },
};

const checkoutItems = document.getElementById("checkoutItems");
const methodSelect = document.getElementById("methodSelect");
const payInfo = document.getElementById("payInfo");
const amountInfo = document.getElementById("amountInfo");
const paymentMethodState = document.getElementById("paymentMethodState");
const upiIdLabel = document.getElementById("upiIdLabel");
const copyUpiBtn = document.getElementById("copyUpiBtn");
const qrImage = document.getElementById("qrImage");
const payNowBtn = document.getElementById("payNowBtn");
const payNowHint = document.getElementById("payNowHint");
const transactionIdInput = document.getElementById("transactionId");
const screenshotInput = document.getElementById("screenshot");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");
const orderHint = document.getElementById("orderHint");
const selectedCountEl = document.getElementById("selectedCount");
const selectedTotalEl = document.getElementById("selectedTotal");
const checkoutMarketBadge = document.getElementById("checkoutMarketBadge");
const checkoutMarketMode = document.getElementById("checkoutMarketMode");
const checkoutMarketNote = document.getElementById("checkoutMarketNote");
const checkoutFounderMerchant = document.getElementById("checkoutFounderMerchant");
const checkoutFounderSupport = document.getElementById("checkoutFounderSupport");
const CHECKOUT_NOTICE_KEY = "ebook-market-checkout-notice";

const state = {
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
  paymentConfig: { ...DEFAULT_PAYMENT_CONFIG },
  market: loadStoredMarket(),
};

const COPY = {
  English: {
    title: "Manual Checkout | E-Book Market",
    heroEyebrow: "India-ready proof checkout",
    heroTitle: "Submit one payment proof for <span>multiple products</span>.",
    heroCopy: "Select the items you want to pay for, scan the QR, pay the exact total, and upload one screenshot plus UTR so the order can be approved as a batch.",
    selectedLabel: "Selected products",
    totalLabel: "Manual order total",
    reviewSpeedLabel: "Review speed",
    reviewSpeedValue: "Admin verified",
    selectTitle: "Select products for this payment",
    editCart: "Edit Cart",
    proofTitle: "Submit payment proof",
    proofCopy: "Works for UPI, Google Pay, and PayPal QR based payments.",
    paymentMethodLabel: "Payment method",
    transactionLabel: "Transaction ID / UTR",
    screenshotLabel: "Payment screenshot",
    copyUpi: "Copy UPI ID",
    submitProof: "Submit Proof For Verification",
    proofTip: "Use the exact same UTR or reference number that appears in the proof screenshot. One proof now covers every selected product in this order.",
    transactionPlaceholder: "Enter the payment reference visible in your UPI or PayPal app",
    directOrderHint: "This order came from a direct product purchase. The proof you upload applies to this product only.",
    cartOrderHint: "All paid cart items are selected. Deselect anything you are not paying for in this proof.",
    noPaidProductsHint: "Your cart does not contain any paid products right now.",
    emptyTitle: "No paid products selected",
    emptyMessage: "Add products to your cart from the marketplace before submitting a manual payment proof.",
    exploreProducts: "Explore Products",
    openCart: "Open Cart",
    paidProduct: "Paid product",
    included: "Included in this proof",
    excluded: "Excluded from this proof",
    digitalProduct: "Digital product",
    upiIncludedInQr: "UPI ID is included in the QR code",
    payExactAmount: "Pay exact order total: {total} for {count} product{suffix}.",
    selectAtLeastOne: "Select at least one paid product to continue.",
    selectProductWarning: "Select at least one product for this payment proof.",
    transactionWarning: "Enter the transaction ID or UTR from your payment app.",
    screenshotWarning: "Upload the payment screenshot before submitting.",
    submittingProof: "Submitting payment proof for verification...",
    submittedProof: "Submitted proof for {count} product{suffix}. Awaiting admin verification.",
    directSubmittedHint: "Proof submitted. You can return to explore or open your dashboard while the admin verifies the payment.",
    submissionFailed: "Submission failed",
    copySuccess: "UPI ID copied to clipboard.",
    copyFailed: "Could not copy the UPI ID on this device.",
    loadFailed: "Failed to load checkout data.",
    unpaidDirectBook: "This product does not require manual checkout",
    paymentQrAlt: "{label} QR",
    openProduct: "Open",
    marketModeIndia: "UPI-first",
    marketModeGlobal: "Card-first",
    marketNoteIndia: "Manual proof checkout is active for this market. This works best for India-first buyers using UPI or QR payment rails.",
    marketNoteGlobal: "Manual proof checkout is disabled for {country}. Return to cart or product page and use Stripe card checkout for global buyers.",
    manualDisabledAmount: "This buyer market uses Stripe card checkout instead of manual proof approval.",
    manualDisabledSubmit: "Manual proof checkout is not available for this buyer market.",
    stripeFallbackNotice: "Stripe card checkout is temporarily unavailable right now, so you were redirected to manual proof checkout for this market.",
    founderPaymentOwner: "Founder payment owner",
    founderSupportFallback: "This payment goes to the founder-managed marketplace rail configured in admin settings.",
    paymentMethodReady: "Ready for proof checkout",
    paymentMethodMissing: "This payment method is not configured yet.",
    manualDisabledFounder: "Manual proof checkout is paused by founder settings right now.",
    manualDisabledRails: "Manual proof checkout is unavailable until the founder adds at least one payment QR or UPI rail.",
    noConfiguredMethods: "No payment method is configured yet. Open admin settings and upload a QR or add a payment handle first.",
    payNow: "Pay {amount} in {method}",
    payNowGeneric: "Pay exact amount in selected app",
    payNowHint: "Use this on mobile to open the payment app with the exact amount filled in.",
    payNowUnavailable: "Direct app payment is unavailable for this method. Use the QR and pay the exact total shown above.",
  },
  Hindi: {
    title: "Manual Checkout | E-Book Market",
    heroEyebrow: "India-ready proof checkout",
    heroTitle: "Ek payment proof se <span>multiple products</span> submit kijiye.",
    heroCopy: "Jin items ka payment karna hai unhe select kijiye, QR scan kijiye, exact total pay kijiye, aur ek screenshot plus UTR upload kijiye taaki order batch me approve ho sake.",
    selectedLabel: "Selected products",
    totalLabel: "Manual order total",
    reviewSpeedLabel: "Review speed",
    reviewSpeedValue: "Admin verified",
    selectTitle: "Is payment ke liye products select kijiye",
    editCart: "Cart edit karein",
    proofTitle: "Payment proof submit kijiye",
    proofCopy: "Yeh UPI, Google Pay aur PayPal QR based payments ke saath kaam karta hai.",
    paymentMethodLabel: "Payment method",
    transactionLabel: "Transaction ID / UTR",
    screenshotLabel: "Payment screenshot",
    copyUpi: "UPI ID copy karein",
    submitProof: "Proof verification ke liye bhejein",
    proofTip: "Jo UTR ya reference number screenshot me dikhta hai wahi use kijiye. Ab ek proof is order ke har selected product ko cover karta hai.",
    transactionPlaceholder: "Apne UPI ya PayPal app me dikhne wala payment reference daaliye",
    directOrderHint: "Yeh order direct product purchase se aaya hai. Aap jo proof upload karenge woh sirf isi product par apply hoga.",
    cartOrderHint: "Cart ke sab paid items select hain. Jinka payment nahin kar rahe unhe is proof se hata dijiye.",
    noPaidProductsHint: "Aapke cart me abhi koi paid product nahin hai.",
    emptyTitle: "Koi paid product select nahin hai",
    emptyMessage: "Manual payment proof bhejne se pehle marketplace se products cart me add kijiye.",
    exploreProducts: "Products explore karein",
    openCart: "Cart kholiye",
    paidProduct: "Paid product",
    included: "Is proof me include hai",
    excluded: "Is proof me include nahin hai",
    digitalProduct: "Digital product",
    upiIncludedInQr: "UPI ID QR code me diya gaya hai",
    payExactAmount: "Exact order total pay kijiye: {total} for {count} product{suffix}.",
    selectAtLeastOne: "Continue karne ke liye kam se kam ek paid product select kijiye.",
    selectProductWarning: "Is payment proof ke liye kam se kam ek product select kijiye.",
    transactionWarning: "Apne payment app ka transaction ID ya UTR dijiye.",
    screenshotWarning: "Submit karne se pehle payment screenshot upload kijiye.",
    submittingProof: "Verification ke liye payment proof submit ho raha hai...",
    submittedProof: "{count} product{suffix} ke liye proof submit ho gaya. Admin verification ka intezar kijiye.",
    directSubmittedHint: "Proof submit ho gaya. Admin verification tak aap explore ya dashboard khol sakte hain.",
    submissionFailed: "Submission failed",
    copySuccess: "UPI ID clipboard me copy ho gayi.",
    copyFailed: "Is device par UPI ID copy nahin ho saki.",
    loadFailed: "Checkout data load nahin ho paaya.",
    unpaidDirectBook: "Is product ko manual checkout ki zaroorat nahin hai",
    paymentQrAlt: "{label} QR",
    openProduct: "Open",
    marketModeIndia: "UPI-first",
    marketModeGlobal: "Card-first",
    marketNoteIndia: "Is market ke liye manual proof checkout active hai. Yeh India-first buyers ke liye UPI aur QR payment rails ke saath best kaam karta hai.",
    marketNoteGlobal: "{country} ke liye manual proof checkout disabled hai. Cart ya product page par wapas jaakar global buyers ke liye Stripe card checkout use kijiye.",
    manualDisabledAmount: "Is buyer market me manual proof approval ke bajay Stripe card checkout use hota hai.",
    manualDisabledSubmit: "Is buyer market ke liye manual proof checkout available nahin hai.",
    stripeFallbackNotice: "Stripe card checkout abhi temporarily unavailable hai, isliye aapko is market ke liye manual proof checkout par redirect kiya gaya hai.",
    founderPaymentOwner: "Founder payment owner",
    founderSupportFallback: "Yeh payment admin settings me configured founder-managed marketplace rail par jaata hai.",
    paymentMethodReady: "Proof checkout ke liye ready",
    paymentMethodMissing: "Yeh payment method abhi configure nahin hai.",
    manualDisabledFounder: "Manual proof checkout abhi founder settings se pause hai.",
    manualDisabledRails: "Manual proof checkout tab tak unavailable rahega jab tak founder kam se kam ek payment QR ya UPI rail add nahin karta.",
    noConfiguredMethods: "Abhi koi payment method configure nahin hai. Pehle admin settings me QR upload kijiye ya payment handle add kijiye.",
    payNow: "{method} me {amount} pay kijiye",
    payNowGeneric: "Selected app me exact amount pay kijiye",
    payNowHint: "Mobile par yeh button payment app ko exact amount ke saath kholne ki koshish karega.",
    payNowUnavailable: "Is method ke liye direct app payment available nahin hai. QR use kijiye aur upar dikhaya gaya exact total pay kijiye.",
  },
};

let checkoutBooks = [];
let selectedBookIds = new Set();
let isDirectCheckout = false;

async function initCheckout() {
  await loadPreferences();
  await loadPaymentConfig();
  applyInterfaceLanguage(state.preferences.interfaceLanguage);
  showCheckoutNotice();
  try {
    await loadBooksForCheckout();
    renderPaymentMethod();
  } catch (error) {
    setStatus(error.message || t("loadFailed"), "error");
  }
}

async function loadPreferences() {
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile/preferences`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load preferences");
    }

    state.preferences.interfaceLanguage = data.preferences?.interfaceLanguage || state.preferences.interfaceLanguage;
    state.preferences.marketplaceLanguage = data.preferences?.marketplaceLanguage || state.preferences.marketplaceLanguage;
    persistLocalPreferences();
  } catch (error) {
    console.error("Checkout preference load failed:", error);
  }
}

async function loadPaymentConfig() {
  const params = new URLSearchParams();
  if (state.market.countryCode) {
    params.set("country", state.market.countryCode);
  }
  if (state.market.currency) {
    params.set("currency", state.market.currency);
  }

  try {
    const response = await fetch(`${API_BASE}/api/payments/config?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to load payment config");
    }

    state.paymentConfig = {
      ...DEFAULT_PAYMENT_CONFIG,
      ...data,
      founder: {
        ...DEFAULT_PAYMENT_CONFIG.founder,
        ...(data.founder || {}),
      },
      methods: {
        ...DEFAULT_PAYMENT_CONFIG.methods,
        ...(data.methods || {}),
      },
      manualCheckout: {
        ...DEFAULT_PAYMENT_CONFIG.manualCheckout,
        ...(data.manualCheckout || {}),
      },
    };
    state.market = normalizeMarket(data.selectedMarket || state.market);
  } catch (error) {
    console.error("Payment config fallback:", error);
    state.paymentConfig = { ...DEFAULT_PAYMENT_CONFIG };
    state.market = normalizeMarket(state.market);
  }

  persistLocalPreferences();
  renderMethodOptions();
}

function loadStoredMarket() {
  return normalizeMarket({
    countryCode: localStorage.getItem("marketplace-market-country") || "IN",
    currency: localStorage.getItem("marketplace-market-currency") || "INR",
  });
}

function normalizeMarket(market = {}) {
  return {
    ...DEFAULT_MARKET,
    ...market,
    countryCode: String(market.countryCode || market.country || DEFAULT_MARKET.countryCode).trim().toUpperCase(),
    countryName: String(market.countryName || DEFAULT_MARKET.countryName),
    currency: String(market.currency || DEFAULT_MARKET.currency).trim().toUpperCase(),
    currencySymbol: String(market.currencySymbol || DEFAULT_MARKET.currencySymbol),
    locale: String(market.locale || DEFAULT_MARKET.locale),
    conversionRateFromInr: normalizeRate(market.conversionRateFromInr, DEFAULT_MARKET.conversionRateFromInr),
    manualCheckoutEnabled: market.manualCheckoutEnabled !== false,
    headline: String(market.headline || DEFAULT_MARKET.headline),
    manualCheckoutNote: String(market.manualCheckoutNote || DEFAULT_MARKET.manualCheckoutNote),
  };
}

function normalizeRate(value, fallback) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) {
    return fallback;
  }
  return rate;
}

function persistLocalPreferences() {
  localStorage.setItem("marketplace-interface-language", state.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", state.preferences.marketplaceLanguage || "All");
  localStorage.setItem("marketplace-market-country", state.market.countryCode || "IN");
  localStorage.setItem("marketplace-market-currency", state.market.currency || "INR");
}

function getConfiguredPaymentMethodKeys() {
  const methods = state.paymentConfig?.methods || {};
  return Object.keys(methods).filter((methodKey) => {
    const method = methods[methodKey] || {};
    if (method.configured === false) {
      return false;
    }

    return Boolean(String(method.upiId || "").trim() || String(method.qrImage || "").trim());
  });
}

function getManualCheckoutReasonMessage() {
  const reasonCode = String(state.paymentConfig?.manualCheckout?.reasonCode || "").trim().toLowerCase();
  if (reasonCode === "founder_paused") {
    return t("manualDisabledFounder");
  }
  if (reasonCode === "no_payment_rails") {
    return t("manualDisabledRails");
  }
  return fillTemplate(t("marketNoteGlobal"), { country: state.market.countryName });
}

function getSelectedTotalInInr() {
  return getSelectedBooks().reduce((sum, book) => sum + Number(book.price || 0), 0);
}

function getSelectedPaymentConfig() {
  const method = String(methodSelect?.value || "").trim();
  return {
    method,
    config: state.paymentConfig?.methods?.[method] || null,
  };
}

function formatInrAmountForUpi(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function buildUpiIntentUrl({ upiId = "", merchantName = "", amount = 0, note = "" } = {}) {
  const cleanUpiId = String(upiId || "").trim();
  if (!cleanUpiId) {
    return "";
  }

  const params = new URLSearchParams({
    pa: cleanUpiId,
    pn: String(merchantName || state.paymentConfig?.founder?.merchantName || "E-Book Market").trim(),
    am: formatInrAmountForUpi(amount),
    cu: "INR",
  });

  const cleanNote = String(note || "").trim();
  if (cleanNote) {
    params.set("tn", cleanNote);
  }

  return `upi://pay?${params.toString()}`;
}

function renderMethodOptions() {
  if (!methodSelect) {
    return;
  }

  const availableMethods = getConfiguredPaymentMethodKeys();
  const previousValue = String(methodSelect.value || "").trim();

  if (!availableMethods.length) {
    methodSelect.innerHTML = `<option value="">${escapeHTML(t("noConfiguredMethods"))}</option>`;
    methodSelect.disabled = true;
    return;
  }

  methodSelect.disabled = false;
  methodSelect.innerHTML = availableMethods.map((methodKey) => (
    `<option value="${escapeAttribute(methodKey)}">${escapeHTML(methodKey === "GPay" ? "Google Pay" : methodKey)}</option>`
  )).join("");

  const nextValue = availableMethods.includes(previousValue) ? previousValue : availableMethods[0];
  methodSelect.value = nextValue;
}

function updatePayNowAction() {
  if (!payNowBtn || !payNowHint) {
    return;
  }

  const { method, config } = getSelectedPaymentConfig();
  const totalInInr = getSelectedTotalInInr();
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);
  const canLaunchUpi = Boolean(manualEnabled && config?.upiId && totalInInr > 0 && (method === "UPI" || method === "GPay"));
  const methodLabel = method === "GPay" ? "Google Pay" : method || "UPI";

  if (canLaunchUpi) {
    const productCount = getSelectedBooks().length;
    const note = productCount === 1
      ? `E-Book Market order for ${getSelectedBooks()[0]?.title || "product"}`
      : `E-Book Market order for ${productCount} products`;
    payNowBtn.href = buildUpiIntentUrl({
      upiId: config.upiId,
      merchantName: state.paymentConfig?.founder?.merchantName,
      amount: totalInInr,
      note,
    });
    payNowBtn.setAttribute("aria-disabled", "false");
    payNowBtn.classList.remove("marketplace-ghost-button");
    payNowBtn.classList.add("marketplace-button");
    payNowBtn.textContent = fillTemplate(t("payNow"), {
      amount: formatMarketCurrency(totalInInr),
      method: methodLabel,
    });
    payNowHint.textContent = t("payNowHint");
    return;
  }

  payNowBtn.href = "#";
  payNowBtn.setAttribute("aria-disabled", "true");
  payNowBtn.classList.remove("marketplace-button");
  payNowBtn.classList.add("marketplace-ghost-button");
  payNowBtn.textContent = t("payNowGeneric");
  payNowHint.textContent = !manualEnabled
    ? getManualCheckoutReasonMessage()
    : t("payNowUnavailable");
}

function applyInterfaceLanguage(language) {
  state.preferences.interfaceLanguage = language === "Hindi" ? "Hindi" : "English";
  persistLocalPreferences();
  document.title = t("title");

  setText("checkoutHeroEyebrow", t("heroEyebrow"));
  setHTML("checkoutHeroTitle", t("heroTitle"));
  setText("checkoutHeroCopy", t("heroCopy"));
  setText("checkoutSelectedLabel", t("selectedLabel"));
  setText("checkoutTotalLabel", t("totalLabel"));
  setText("checkoutReviewSpeedLabel", t("reviewSpeedLabel"));
  setText("checkoutReviewSpeedValue", t("reviewSpeedValue"));
  setText("checkoutSelectTitle", t("selectTitle"));
  setText("checkoutEditCartLink", t("editCart"));
  setText("checkoutProofTitle", t("proofTitle"));
  setText("checkoutProofCopy", t("proofCopy"));
  setText("paymentMethodLabel", t("paymentMethodLabel"));
  setText("transactionLabel", t("transactionLabel"));
  setText("screenshotLabel", t("screenshotLabel"));
  setText("copyUpiBtn", t("copyUpi"));
  setText("payNowBtn", t("payNowGeneric"));
  setText("payNowHint", t("payNowHint"));
  setText("submitBtn", t("submitProof"));
  setText("proofTip", t("proofTip"));

  if (transactionIdInput) {
    transactionIdInput.placeholder = t("transactionPlaceholder");
  }

  renderMarketContext();
  renderMethodOptions();
  renderPaymentMethod();
  updatePayNowAction();
}

async function fetchCart() {
  const response = await fetch(`${API_BASE}/api/cart`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load cart");
  }
  return typeof shell.normalizeCartPayload === "function"
    ? shell.normalizeCartPayload(data)
    : data;
}

async function fetchBook(bookId) {
  const response = await fetch(`${API_BASE}/api/books/${bookId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load book");
  }
  return data.book;
}

async function loadBooksForCheckout() {
  const params = new URLSearchParams(window.location.search);
  const directBookId = params.get("bookId");
  isDirectCheckout = Boolean(directBookId);

  if (directBookId) {
    const book = await fetchBook(directBookId);
    if (!book || Number(book.price || 0) <= 0) {
      throw new Error(t("unpaidDirectBook"));
    }

    checkoutBooks = [normalizeDirectBook(book)];
    selectedBookIds = new Set([String(book._id)]);
    orderHint.textContent = t("directOrderHint");
    renderCheckoutItems();
    renderAmountInfo();
    return;
  }

  const cart = await fetchCart();
  const items = (cart.items || []).filter((item) => item.book && Number(item.priceAtAdd || item.book.price || 0) > 0);
  checkoutBooks = items.map(normalizeCartItem);
  selectedBookIds = new Set(checkoutBooks.map((book) => String(book._id)));
  orderHint.textContent = checkoutBooks.length
    ? t("cartOrderHint")
    : t("noPaidProductsHint");

  renderCheckoutItems();
  renderAmountInfo();
}

function normalizeDirectBook(book) {
  return {
    _id: String(book._id),
    title: book.title || "Book",
    type: book.type || "Product",
    category: book.category || "Book",
    language: book.language || "",
    price: Number(book.price || 0),
    bookAuthor: book.bookAuthor || book.authorName || "Creator resource",
    cover: book.coverUrl || book.coverImage || book.cover || "assets/covers/Ebook_AI.png",
  };
}

function normalizeCartItem(item) {
  return {
    _id: String(item.book._id),
    title: item.book.title || "Book",
    type: item.book.type || "Product",
    category: item.book.category || "Book",
    language: item.book.language || "",
    price: Number(item.priceAtAdd || item.book.price || 0),
    bookAuthor: item.book.bookAuthor || item.book.authorName || "Creator resource",
    cover: item.book.coverImage || item.book.cover || "assets/covers/Ebook_AI.png",
  };
}

function renderCheckoutItems() {
  checkoutItems.innerHTML = "";

  if (!checkoutBooks.length) {
    checkoutItems.innerHTML = `
      <div class="empty-panel">
        <h2>${escapeHTML(t("emptyTitle"))}</h2>
        <p>${escapeHTML(t("emptyMessage"))}</p>
        <div class="hero-actions" style="justify-content:center;margin-top:18px;">
          <a class="marketplace-button" href="explore.html">${escapeHTML(t("exploreProducts"))}</a>
          <a class="marketplace-ghost-button" href="cart.html">${escapeHTML(t("openCart"))}</a>
        </div>
      </div>
    `;
    submitBtn.disabled = true;
    return;
  }

  checkoutBooks.forEach((book) => {
    const isSelected = selectedBookIds.has(String(book._id));
    const cover = resolveAssetUrl(book.cover, "assets/covers/Ebook_AI.png");
    const row = document.createElement("article");
    row.className = `checkout-item-card${isSelected ? " selected" : ""}`;
    row.innerHTML = `
      <label class="checkout-item-toggle">
        <input type="checkbox" data-book-toggle="${escapeAttribute(book._id)}" ${isSelected ? "checked" : ""} />
        <img class="item-thumb" src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}" />
      </label>
      <div class="item-copy">
        <div class="inline-badges">
          <span class="mini-badge">${escapeHTML(book.type || "Product")}</span>
          <span class="mini-badge">${escapeHTML(book.category)}</span>
          ${book.language ? `<span class="mini-badge">${escapeHTML(book.language)}</span>` : ""}
          <span class="mini-badge premium">${escapeHTML(t("paidProduct"))}</span>
        </div>
        <h3>${escapeHTML(book.title)}</h3>
        <p>${escapeHTML(book.bookAuthor || t("digitalProduct"))}</p>
        <div class="item-meta">
          <span>${escapeHTML(isSelected ? t("included") : t("excluded"))}</span>
          <strong>${formatMarketCurrency(book.price || 0)}</strong>
        </div>
      </div>
    `;
    checkoutItems.appendChild(row);
  });

  checkoutItems.querySelectorAll("[data-book-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const bookId = String(input.dataset.bookToggle || "");
      if (!bookId) {
        return;
      }

      if (input.checked) {
        selectedBookIds.add(bookId);
      } else {
        selectedBookIds.delete(bookId);
      }

      renderCheckoutItems();
      renderAmountInfo();
    });
  });
}

function renderMarketContext() {
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);
  setText("checkoutMarketBadge", `${state.market.countryName} · ${state.market.currency}`);
  setText("checkoutMarketMode", manualEnabled ? t("marketModeIndia") : t("marketModeGlobal"));
  setText(
    "checkoutMarketNote",
    manualEnabled
      ? t("marketNoteIndia")
      : getManualCheckoutReasonMessage()
  );
  setText("checkoutFounderMerchant", state.paymentConfig?.founder?.merchantName || DEFAULT_PAYMENT_CONFIG.founder.merchantName);
  setText("checkoutFounderSupport", state.paymentConfig?.founder?.supportNote || t("founderSupportFallback"));
}

function renderPaymentMethod() {
  const method = String(methodSelect?.value || "").trim();
  const config = state.paymentConfig.methods?.[method];
  const configuredMethods = getConfiguredPaymentMethodKeys();
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);

  if (!config || !configuredMethods.length) {
    payInfo.textContent = t("noConfiguredMethods");
    amountInfo.textContent = t("manualDisabledRails");
    if (paymentMethodState) {
      paymentMethodState.textContent = t("paymentMethodMissing");
    }
    upiIdLabel.textContent = "";
    copyUpiBtn.disabled = true;
    qrImage.hidden = true;
    qrImage.removeAttribute("src");
    updatePayNowAction();
    return;
  }

  payInfo.textContent = `${config.label}: ${config.details}`;
  if (paymentMethodState) {
    paymentMethodState.textContent = !manualEnabled
      ? getManualCheckoutReasonMessage()
      : config.configured === false
        ? t("paymentMethodMissing")
        : t("paymentMethodReady");
  }

  const qrSource = resolveAssetUrl(config.qrImage, "");
  if (qrSource) {
    qrImage.hidden = false;
    qrImage.src = qrSource;
    qrImage.alt = fillTemplate(t("paymentQrAlt"), { label: config.label || "Payment" });
  } else {
    qrImage.hidden = true;
    qrImage.removeAttribute("src");
  }

  upiIdLabel.textContent = config.upiId
    ? `UPI ID: ${config.upiId}`
    : t("upiIncludedInQr");
  copyUpiBtn.disabled = !config.upiId;
  updatePayNowAction();
}

function renderAmountInfo() {
  const selectedBooks = getSelectedBooks();
  const total = selectedBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);
  const configuredMethods = getConfiguredPaymentMethodKeys();

  selectedCountEl.textContent = String(selectedBooks.length);
  selectedTotalEl.textContent = formatMarketCurrency(total);

  if (!selectedBooks.length) {
    amountInfo.textContent = t("selectAtLeastOne");
    submitBtn.disabled = true;
    updatePayNowAction();
    return;
  }

  if (!manualEnabled) {
    amountInfo.textContent = getManualCheckoutReasonMessage();
    submitBtn.disabled = true;
    updatePayNowAction();
    return;
  }

  if (!configuredMethods.length) {
    amountInfo.textContent = t("noConfiguredMethods");
    submitBtn.disabled = true;
    updatePayNowAction();
    return;
  }

  amountInfo.textContent = fillTemplate(t("payExactAmount"), {
    total: formatMarketCurrency(total),
    count: selectedBooks.length,
    suffix: selectedBooks.length === 1 ? "" : "s",
  });
  submitBtn.disabled = false;
  updatePayNowAction();
}

function getSelectedBooks() {
  return checkoutBooks.filter((book) => selectedBookIds.has(String(book._id)));
}

async function submitManualPayment() {
  const selectedBooks = getSelectedBooks();
  const paymentMethod = methodSelect.value;
  const transactionId = transactionIdInput.value.trim();
  const screenshot = screenshotInput.files[0];

  if (!state.paymentConfig?.manualCheckout?.enabled || !state.market.manualCheckoutEnabled) {
    return setStatus(getManualCheckoutReasonMessage(), "warning");
  }
  if (!paymentMethod || !getConfiguredPaymentMethodKeys().length) {
    return setStatus(t("noConfiguredMethods"), "warning");
  }
  if (!selectedBooks.length) {
    return setStatus(t("selectProductWarning"), "warning");
  }
  if (!transactionId) {
    return setStatus(t("transactionWarning"), "warning");
  }
  if (!screenshot) {
    return setStatus(t("screenshotWarning"), "warning");
  }

  const formData = new FormData();
  formData.append("bookIds", JSON.stringify(selectedBooks.map((book) => book._id)));
  formData.append("paymentMethod", paymentMethod);
  formData.append("transactionId", transactionId);
  formData.append("screenshot", screenshot);

  submitBtn.disabled = true;
  setStatus(t("submittingProof"));

  try {
    const response = await fetch(`${API_BASE}/api/payments/manual`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || t("submissionFailed"));
    }

    const count = Number(data.count || selectedBooks.length);
    setStatus(fillTemplate(t("submittedProof"), {
      count,
      suffix: count === 1 ? "" : "s",
    }), "success");
    transactionIdInput.value = "";
    screenshotInput.value = "";

    if (isDirectCheckout) {
      checkoutBooks = [];
      selectedBookIds = new Set();
      orderHint.textContent = t("directSubmittedHint");
      renderCheckoutItems();
      renderAmountInfo();
    } else {
      await loadBooksForCheckout();
      await shell.refreshCartCount?.();
    }
  } catch (error) {
    setStatus(error.message || t("submissionFailed"), "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function setStatus(message, tone = "") {
  statusEl.textContent = message || "";
  statusEl.className = "status-message";
  if (tone) {
    statusEl.classList.add(tone);
  }
}

function showCheckoutNotice() {
  const stored = consumeCheckoutNotice();
  if (stored?.message) {
    setStatus(stored.message, stored.tone || "warning");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const fallback = String(params.get("fallback") || "").trim().toLowerCase();
  if (fallback.startsWith("stripe")) {
    setStatus(t("stripeFallbackNotice"), "warning");
  }
}

function consumeCheckoutNotice() {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_NOTICE_KEY);
    if (!raw) {
      return null;
    }

    sessionStorage.removeItem(CHECKOUT_NOTICE_KEY);
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

function formatMarketCurrency(value) {
  const numericValue = Number(value || 0);
  const convertedValue = state.market.currency === "INR"
    ? numericValue
    : numericValue * Number(state.market.conversionRateFromInr || 1);

  try {
    return new Intl.NumberFormat(state.market.locale || "en-IN", {
      style: "currency",
      currency: state.market.currency || "INR",
      maximumFractionDigits: 2,
    }).format(convertedValue);
  } catch {
    return `${state.market.currencySymbol || state.market.currency || "Rs."} ${convertedValue.toFixed(2)}`;
  }
}

methodSelect.addEventListener("change", renderPaymentMethod);
submitBtn.addEventListener("click", submitManualPayment);
payNowBtn?.addEventListener("click", (event) => {
  const href = String(payNowBtn.getAttribute("href") || "").trim();
  if (!href || href === "#") {
    event.preventDefault();
    setStatus(payNowHint?.textContent || t("payNowUnavailable"), "warning");
  }
});
copyUpiBtn.addEventListener("click", async () => {
  const method = methodSelect.value;
  const upiId = (state.paymentConfig.methods?.[method] || state.paymentConfig.methods?.UPI || DEFAULT_PAYMENT_CONFIG.methods.UPI).upiId;
  if (!upiId) {
    return;
  }

  try {
    await navigator.clipboard.writeText(upiId);
    setStatus(t("copySuccess"), "success");
  } catch {
    setStatus(t("copyFailed"), "warning");
  }
});

function getAuthHeaders(extra = {}) {
  if (!token) {
    return extra;
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

function t(key) {
  const language = state.preferences.interfaceLanguage === "Hindi" ? "Hindi" : "English";
  return COPY[language]?.[key] || COPY.English[key] || key;
}

function fillTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  ));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setHTML(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = value;
  }
}

function escapeHTML(value) {
  return typeof shell.escapeHTML === "function" ? shell.escapeHTML(value) : String(value || "");
}

function escapeAttribute(value) {
  return typeof shell.escapeAttribute === "function" ? shell.escapeAttribute(value) : String(value || "");
}

function resolveAssetUrl(value, fallback = "") {
  return typeof shell.resolveAssetUrl === "function"
    ? shell.resolveAssetUrl(value, fallback)
    : fallback || String(value || "");
}

initCheckout();
