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
  taxNote: "Manual proof orders stay India-first. Card taxes can still be calculated in Stripe when enabled.",
  fxSource: "seed-defaults",
};

const DEFAULT_PAYMENT_CONFIG = {
  selectedMarket: DEFAULT_MARKET,
  defaultMarket: DEFAULT_MARKET,
  supportedMarkets: [DEFAULT_MARKET],
  stripe: {
    enabled: true,
    automaticTaxEnabled: false,
    note: "Stripe checkout is available.",
  },
  manualCheckout: {
    enabled: true,
    note: DEFAULT_MARKET.manualCheckoutNote,
  },
  pricing: {
    baseCurrency: "INR",
    fxSource: "seed-defaults",
    note: "International checkout prices are converted from INR base prices using the platform FX settings.",
  },
};

const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const cartSummaryTotal = document.getElementById("cartSummaryTotal");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartItemsCount = document.getElementById("cartItemsCount");
const cartPaidCount = document.getElementById("cartPaidCount");
const cartSummaryCount = document.getElementById("cartSummaryCount");
const marketCountrySelect = document.getElementById("marketCountrySelect");
const cartCurrencyValue = document.getElementById("cartCurrencyValue");
const cartTaxValue = document.getElementById("cartTaxValue");
const clearBtn = document.getElementById("clearBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const manualCheckoutBtn = document.getElementById("manualCheckoutBtn");
const cartMessage = document.getElementById("cartMessage");
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
    title: "Cart | E-Book Market",
    heroEyebrow: "Revenue-ready checkout flow",
    heroTitle: "Your purchase cart for <span>knowledge products</span>.",
    heroCopy: "Review digital products, compare Stripe and UPI checkout options, and move from discovery to creator earnings without breaking the flow.",
    itemsLabel: "Products in cart",
    paidLabel: "Paid products ready",
    subtotalLabel: "Order subtotal",
    orderTitle: "Your order",
    orderCopy: "Everything here will unlock after card payment or manual proof verification.",
    addMore: "Add more products",
    summaryTitle: "Checkout summary",
    summaryCopy: "Choose the payment flow that fits your audience and operations.",
    itemsReady: "Items ready",
    summarySubtotal: "Subtotal",
    platformLabel: "Platform checkout",
    platformValue: "Secure",
    totalLabel: "Total to pay",
    checkoutStripe: "Checkout With Stripe",
    checkoutManual: "Manual UPI Checkout",
    clearCart: "Clear Cart",
    stripeHelper: "Stripe gives instant unlocks through the automated payment pipeline.",
    manualHelper: "Manual checkout now supports multi-item UPI proof submission for Indian buyers.",
    emptyTitle: "Your cart is empty",
    emptyMessage: "Add creator products from the marketplace to start a Stripe or UPI checkout flow.",
    exploreProducts: "Explore Products",
    emptyStatus: "Your cart is empty. Explore the marketplace to add products.",
    unlockAfterApproval: "Unlocks after payment approval",
    openProduct: "Open",
    removeProduct: "Remove",
    paidProduct: "Paid product",
    creatorResource: "Creator resource",
    removedSuccess: "Product removed from cart.",
    removedFailed: "Could not remove the item.",
    chooseCheckout: "Choose Stripe for instant unlocks or UPI proof checkout for India-first payments.",
    cartUnavailable: "Cart unavailable",
    cartUnavailableFallback: "Could not load the cart right now.",
    cartLoadFailed: "Cart load failed.",
    cartCleared: "Cart cleared successfully.",
    cartClearFailed: "Could not clear the cart.",
    creatingStripe: "Creating Stripe checkout session...",
    checkoutFailed: "Checkout failed.",
    checkoutFailedShort: "Checkout failed",
    cartEmptyShort: "Your cart is empty.",
    noPayableItems: "No payable items found.",
    marketLabel: "Buyer market",
    currencyLabel: "Checkout currency",
    taxLabel: "Tax handling",
    taxAuto: "Stripe auto tax",
    taxOff: "Captured in checkout",
    platformStripe: "Card-first global",
    platformHybrid: "Card + UPI",
    marketNoteInr: "Creators price in INR and this market keeps the India-first checkout stack active.",
    marketNoteGlobal: "Displayed total {converted} is converted from the INR base price of {base}. Taxes and billing details are finalized inside Stripe.",
    marketNoteFxFallback: "FX source: seeded defaults until live exchange rates are configured in env.",
    marketNoteFxConfigured: "FX source: platform-configured exchange settings.",
    stripeHelperInr: "Stripe still supports instant unlocks in India, while manual UPI stays available for QR-based proof flows.",
    stripeHelperGlobal: "Stripe card checkout handles global buyers in {currency} and returns instant unlocks after payment success.",
    manualHelperEnabled: "Manual UPI proof checkout is live for this market and supports grouped cart approval.",
    manualHelperDisabled: "Manual proof checkout is disabled for {country}. Use Stripe card checkout for this buyer market.",
    manualUnavailable: "Manual proof checkout is only enabled for India-first orders right now.",
    stripeUnavailable: "Stripe checkout is not configured yet.",
    stripeFallbackRedirect: "Stripe card checkout is temporarily unavailable. Redirecting you to manual proof checkout for this order.",
  },
  Hindi: {
    title: "Cart | E-Book Market",
    heroEyebrow: "Revenue-ready checkout flow",
    heroTitle: "Aapka purchase cart <span>knowledge products</span> ke liye.",
    heroCopy: "Digital products review kijiye, Stripe aur UPI checkout compare kijiye, aur discovery se creator earnings tak ka flow bina break ke complete kijiye.",
    itemsLabel: "Cart me products",
    paidLabel: "Paid products ready",
    subtotalLabel: "Order subtotal",
    orderTitle: "Aapka order",
    orderCopy: "Yahan sab kuch card payment ya manual proof verification ke baad unlock hoga.",
    addMore: "Aur products jodiye",
    summaryTitle: "Checkout summary",
    summaryCopy: "Wahi payment flow chuniye jo aapke audience aur operations ke liye fit ho.",
    itemsReady: "Ready items",
    summarySubtotal: "Subtotal",
    platformLabel: "Platform checkout",
    platformValue: "Secure",
    totalLabel: "Total payment",
    checkoutStripe: "Stripe Se Checkout",
    checkoutManual: "Manual UPI Checkout",
    clearCart: "Cart saaf karein",
    stripeHelper: "Stripe automated payment pipeline ke through instant unlock deta hai.",
    manualHelper: "Manual checkout ab Indian buyers ke liye multi-item UPI proof submission support karta hai.",
    emptyTitle: "Aapka cart abhi khaali hai",
    emptyMessage: "Stripe ya UPI checkout shuru karne ke liye marketplace se creator products add kijiye.",
    exploreProducts: "Products explore karein",
    emptyStatus: "Aapka cart khaali hai. Products add karne ke liye marketplace explore kijiye.",
    unlockAfterApproval: "Payment approval ke baad unlock hoga",
    openProduct: "Open",
    removeProduct: "Hataiye",
    paidProduct: "Paid product",
    creatorResource: "Creator resource",
    removedSuccess: "Product cart se hata diya gaya.",
    removedFailed: "Item hataaya nahin ja saka.",
    chooseCheckout: "Instant unlock ke liye Stripe ya India-first payment ke liye UPI proof checkout chuniye.",
    cartUnavailable: "Cart unavailable",
    cartUnavailableFallback: "Abhi cart load nahin ho pa raha hai.",
    cartLoadFailed: "Cart load nahin hua.",
    cartCleared: "Cart safalta se saaf ho gaya.",
    cartClearFailed: "Cart saaf nahin ho paaya.",
    creatingStripe: "Stripe checkout session ban raha hai...",
    checkoutFailed: "Checkout nahin ho paaya.",
    checkoutFailedShort: "Checkout failed",
    cartEmptyShort: "Aapka cart khaali hai.",
    noPayableItems: "Koi payable item nahin mila.",
    marketLabel: "Buyer market",
    currencyLabel: "Checkout currency",
    taxLabel: "Tax handling",
    taxAuto: "Stripe auto tax",
    taxOff: "Checkout me capture hoga",
    platformStripe: "Global card-first",
    platformHybrid: "Card + UPI",
    marketNoteInr: "Creators INR me price karte hain aur is market me India-first checkout stack active rehta hai.",
    marketNoteGlobal: "Dikhaya gaya total {converted}, INR base price {base} se convert hua hai. Final tax aur billing details Stripe ke andar complete hoti hain.",
    marketNoteFxFallback: "FX source: live exchange env set hone tak seeded defaults use ho rahe hain.",
    marketNoteFxConfigured: "FX source: platform-configured exchange settings.",
    stripeHelperInr: "India me bhi Stripe instant unlock deta hai, jabki manual UPI QR proof flow alag se available rehta hai.",
    stripeHelperGlobal: "Stripe card checkout global buyers ko {currency} me handle karta hai aur payment success ke baad instant unlock deta hai.",
    manualHelperEnabled: "Is market ke liye manual UPI proof checkout live hai aur grouped cart approval support karta hai.",
    manualHelperDisabled: "{country} ke liye manual proof checkout disabled hai. Is buyer market ke liye Stripe card checkout use kijiye.",
    manualUnavailable: "Manual proof checkout abhi sirf India-first orders ke liye enabled hai.",
    stripeUnavailable: "Stripe checkout abhi configure nahin hai.",
    stripeFallbackRedirect: "Stripe card checkout abhi unavailable hai. Is order ke liye aapko manual proof checkout par bheja ja raha hai.",
  },
};

async function initCart() {
  setLoadingState();
  await loadPreferences();
  await loadPaymentConfig();
  applyInterfaceLanguage(state.preferences.interfaceLanguage);
  await render();
}

function setLoadingState() {
  cartItemsCount.textContent = "--";
  cartPaidCount.textContent = "--";
  cartSubtotal.textContent = "--";
  cartTotal.textContent = "--";
  cartSummaryTotal.textContent = "--";
  cartSummaryCount.textContent = "--";
  cartList.innerHTML = `
    <div class="empty-panel">
      <h2>Loading your cart...</h2>
      <p>Fetching your latest products and checkout totals.</p>
    </div>
  `;
  setCheckoutState(false);
  setStatus("Loading your cart...");
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
    console.error("Cart preference load failed:", error);
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
    };
    state.market = normalizeMarket(
      data.selectedMarket ||
      data.defaultMarket ||
      state.market
    );
  } catch (error) {
    console.error("Cart payment config fallback:", error);
    state.paymentConfig = { ...DEFAULT_PAYMENT_CONFIG };
    state.market = normalizeMarket(state.market);
  }

  persistLocalPreferences();
  renderMarketSelector();
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
    taxNote: String(market.taxNote || DEFAULT_MARKET.taxNote),
    fxSource: String(market.fxSource || DEFAULT_MARKET.fxSource),
  };
}

function normalizeRate(value, fallback) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) {
    return fallback;
  }
  return rate;
}

function renderMarketSelector() {
  if (!marketCountrySelect) {
    return;
  }

  const supportedMarkets = Array.isArray(state.paymentConfig.supportedMarkets) && state.paymentConfig.supportedMarkets.length
    ? state.paymentConfig.supportedMarkets.map((market) => normalizeMarket(market))
    : [DEFAULT_MARKET];

  marketCountrySelect.innerHTML = supportedMarkets.map((market) => `
    <option value="${escapeAttribute(market.countryCode)}"${market.countryCode === state.market.countryCode ? " selected" : ""}>
      ${escapeHTML(`${market.countryName} · ${market.currency}`)}
    </option>
  `).join("");
}

function persistLocalPreferences() {
  localStorage.setItem("marketplace-interface-language", state.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", state.preferences.marketplaceLanguage || "All");
  localStorage.setItem("marketplace-market-country", state.market.countryCode || "IN");
  localStorage.setItem("marketplace-market-currency", state.market.currency || "INR");
}

function applyInterfaceLanguage(language) {
  state.preferences.interfaceLanguage = language === "Hindi" ? "Hindi" : "English";
  persistLocalPreferences();
  document.title = t("title");

  setText("cartHeroEyebrow", t("heroEyebrow"));
  setHTML("cartHeroTitle", t("heroTitle"));
  setText("cartHeroCopy", t("heroCopy"));
  setText("cartItemsLabel", t("itemsLabel"));
  setText("cartPaidLabel", t("paidLabel"));
  setText("cartSubtotalLabel", t("subtotalLabel"));
  setText("cartOrderTitle", t("orderTitle"));
  setText("cartOrderCopy", t("orderCopy"));
  setText("cartAddMoreLink", t("addMore"));
  setText("cartSummaryTitle", t("summaryTitle"));
  setText("cartSummaryCopy", t("summaryCopy"));
  setText("cartItemsReadyLabel", t("itemsReady"));
  setText("cartSubtotalRowLabel", t("summarySubtotal"));
  setText("cartPlatformLabel", t("platformLabel"));
  setText("cartTotalLabel", t("totalLabel"));
  setText("checkoutBtn", t("checkoutStripe"));
  setText("manualCheckoutBtn", t("checkoutManual"));
  setText("clearBtn", t("clearCart"));
  setText("cartMarketLabel", t("marketLabel"));
  setText("cartCurrencyRowLabel", t("currencyLabel"));
  setText("cartTaxRowLabel", t("taxLabel"));
  updateMarketCopy();
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

async function removeItem(bookId) {
  const response = await fetch(`${API_BASE}/api/cart/${bookId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to remove item");
  }
  return response.json().catch(() => ({}));
}

async function clearCart() {
  const response = await fetch(`${API_BASE}/api/cart`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to clear cart");
  }
  return response.json().catch(() => ({}));
}

async function render() {
  try {
    const data = await fetchCart();
    const items = Array.isArray(data.items) ? data.items : [];
    const total = Number(data.total || 0);

    cartList.innerHTML = "";
    setSummary(items, total);
    await shell.refreshCartCount?.();

    if (!items.length) {
      cartList.innerHTML = `
        <div class="empty-panel">
          <h2>${escapeHTML(t("emptyTitle"))}</h2>
          <p>${escapeHTML(t("emptyMessage"))}</p>
          <div class="hero-actions" style="justify-content:center;margin-top:18px;">
            <a class="marketplace-button" href="explore.html">${escapeHTML(t("exploreProducts"))}</a>
          </div>
        </div>
      `;
      setCheckoutState(false);
      setStatus(t("emptyStatus"), "warning");
      return;
    }

    items.forEach((item) => {
      const bookId = String(item.book?._id || "");
      const cover = resolveAssetUrl(
        item.book?.coverImage || item.book?.cover,
        "assets/covers/Ebook_AI.png"
      );
      const row = document.createElement("article");
      row.className = "cart-item-card";
      row.innerHTML = `
        <img class="item-thumb" src="${escapeAttribute(cover)}" alt="${escapeAttribute(item.book?.title || "Book")}" />
        <div class="item-copy">
          <div class="inline-badges">
            <span class="mini-badge">${escapeHTML(item.book?.type || "Product")}</span>
            <span class="mini-badge">${escapeHTML(item.book?.category || "Book")}</span>
            ${item.book?.language ? `<span class="mini-badge">${escapeHTML(item.book.language)}</span>` : ""}
            <span class="mini-badge premium">${escapeHTML(t("paidProduct"))}</span>
          </div>
          <h3>${escapeHTML(item.book?.title || "Book")}</h3>
          <p>${escapeHTML(item.book?.bookAuthor || item.book?.authorName || t("creatorResource"))}</p>
          <div class="item-meta">
            <span>${escapeHTML(t("unlockAfterApproval"))}</span>
            <strong>${formatMarketCurrency(item.priceAtAdd || 0)}</strong>
          </div>
        </div>
        <div class="product-actions" style="justify-content:flex-end;">
          ${bookId
            ? `<a class="marketplace-ghost-button" href="book_view.html?id=${encodeURIComponent(bookId)}">${escapeHTML(t("openProduct"))}</a>`
            : ""
          }
          ${bookId
            ? `<button class="marketplace-button" type="button" data-book-id="${escapeAttribute(bookId)}">${escapeHTML(t("removeProduct"))}</button>`
            : ""
          }
        </div>
      `;
      cartList.appendChild(row);
    });

    cartList.querySelectorAll("[data-book-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          const result = await removeItem(button.dataset.bookId);
          if (typeof shell.setVisibleCartCount === "function" && Number.isFinite(Number(result?.cartCount))) {
            shell.setVisibleCartCount(Number(result.cartCount));
          }
          setStatus(t("removedSuccess"), "success");
          await render();
        } catch (error) {
          setStatus(error.message || t("removedFailed"), "error");
        }
      });
    });

    setCheckoutState(true);
    setStatus(getDefaultStatusMessage(), "info");
  } catch (error) {
    cartList.innerHTML = `
      <div class="empty-panel">
        <h2>${escapeHTML(t("cartUnavailable"))}</h2>
        <p>${escapeHTML(error.message || t("cartUnavailableFallback"))}</p>
      </div>
    `;
    setCheckoutState(false);
    setStatus(error.message || t("cartLoadFailed"), "error");
  }
}

function setSummary(items, totalInInr) {
  const itemCount = items.length;
  const formattedTotal = formatMarketCurrency(totalInInr);
  cartTotal.textContent = formattedTotal;
  cartSummaryTotal.textContent = formattedTotal;
  cartSubtotal.textContent = formattedTotal;
  cartItemsCount.textContent = String(itemCount);
  cartPaidCount.textContent = String(itemCount);
  cartSummaryCount.textContent = String(itemCount);
  updateMarketCopy(totalInInr, itemCount);
}

function updateMarketCopy(totalInInr = 0) {
  const stripeEnabled = Boolean(state.paymentConfig?.stripe?.enabled);
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);
  const convertedTotal = formatMarketCurrency(totalInInr);
  const baseTotal = formatBaseCurrency(totalInInr);

  setText("cartPlatformValue", manualEnabled ? t("platformHybrid") : t("platformStripe"));
  setText("cartCurrencyValue", `${state.market.currency} - ${state.market.countryCode}`);
  setText("cartTaxValue", state.paymentConfig?.stripe?.automaticTaxEnabled ? t("taxAuto") : t("taxOff"));
  setText(
    "cartHelperStripe",
    state.market.currency === "INR"
      ? t("stripeHelperInr")
      : fillTemplate(t("stripeHelperGlobal"), { currency: state.market.currency })
  );
  setText(
    "cartHelperManual",
    manualEnabled
      ? t("manualHelperEnabled")
      : fillTemplate(t("manualHelperDisabled"), { country: state.market.countryName })
  );

  const marketNote = state.market.currency === "INR"
    ? t("marketNoteInr")
    : fillTemplate(t("marketNoteGlobal"), {
      converted: convertedTotal,
      base: baseTotal,
    });
  const fxNote = state.market.fxSource === "configured"
    ? t("marketNoteFxConfigured")
    : t("marketNoteFxFallback");
  setText("cartMarketNote", `${marketNote} ${fxNote}`);

  if (!stripeEnabled) {
    setText("cartPlatformValue", t("stripeUnavailable"));
  }
}

function setCheckoutState(hasItems) {
  const stripeEnabled = Boolean(state.paymentConfig?.stripe?.enabled);
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);

  if (checkoutBtn) {
    checkoutBtn.disabled = !hasItems || !stripeEnabled;
  }
  if (manualCheckoutBtn) {
    manualCheckoutBtn.disabled = !hasItems || !manualEnabled;
  }
  if (clearBtn) {
    clearBtn.disabled = !hasItems;
  }
}

function setStatus(message, tone = "") {
  cartMessage.textContent = message || "";
  cartMessage.className = "status-message";
  if (tone && tone !== "info") {
    cartMessage.classList.add(tone);
  }
}

function getDefaultStatusMessage() {
  const manualEnabled = Boolean(state.paymentConfig?.manualCheckout?.enabled && state.market.manualCheckoutEnabled);
  if (!state.paymentConfig?.stripe?.enabled) {
    return t("stripeUnavailable");
  }
  if (!manualEnabled) {
    return fillTemplate(t("manualHelperDisabled"), { country: state.market.countryName });
  }
  return t("chooseCheckout");
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

function formatBaseCurrency(value) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
  }
}

clearBtn?.addEventListener("click", async () => {
  try {
    const result = await clearCart();
    if (typeof shell.setVisibleCartCount === "function" && Number.isFinite(Number(result?.cartCount))) {
      shell.setVisibleCartCount(Number(result.cartCount));
    }
    setStatus(t("cartCleared"), "success");
    await render();
  } catch (error) {
    setStatus(error.message || t("cartClearFailed"), "error");
  }
});

checkoutBtn?.addEventListener("click", async () => {
  try {
    if (!state.paymentConfig?.stripe?.enabled) {
      setStatus(t("stripeUnavailable"), "warning");
      return;
    }

    checkoutBtn.disabled = true;
    setStatus(t("creatingStripe"));
    const cart = await fetchCart();
    const bookIds = (cart.items || []).map((item) => item.book?._id).filter(Boolean);
    if (!bookIds.length) {
      setStatus(t("cartEmptyShort"), "warning");
      return;
    }

    const response = await fetch(`${API_BASE}/api/payments/create-checkout-cart`, {
      method: "POST",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        bookIds,
        country: state.market.countryCode,
        currency: state.market.currency,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || t("checkoutFailedShort"));
    }

    if (data.checkoutMode === "manual_fallback" && data.url) {
      persistCheckoutNotice(data.message || t("stripeFallbackRedirect"), "warning");
      window.location.href = data.url;
      return;
    }

    if (!data.url) {
      setStatus(data.message || t("noPayableItems"), "warning");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    setStatus(error.message || t("checkoutFailed"), "error");
  } finally {
    checkoutBtn.disabled = false;
  }
});

manualCheckoutBtn?.addEventListener("click", () => {
  if (!state.paymentConfig?.manualCheckout?.enabled || !state.market.manualCheckoutEnabled) {
    setStatus(t("manualUnavailable"), "warning");
    return;
  }

  window.location.href = "checkout.html";
});

marketCountrySelect?.addEventListener("change", async () => {
  const selectedCountry = String(marketCountrySelect.value || "IN").trim().toUpperCase();
  const supportedMarkets = Array.isArray(state.paymentConfig.supportedMarkets)
    ? state.paymentConfig.supportedMarkets.map((market) => normalizeMarket(market))
    : [DEFAULT_MARKET];
  const nextMarket = supportedMarkets.find((market) => market.countryCode === selectedCountry) || DEFAULT_MARKET;

  state.market = normalizeMarket(nextMarket);
  persistLocalPreferences();
  await loadPaymentConfig();
  applyInterfaceLanguage(state.preferences.interfaceLanguage);
  await render();
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

function persistCheckoutNotice(message, tone = "warning") {
  try {
    sessionStorage.setItem(CHECKOUT_NOTICE_KEY, JSON.stringify({
      message: String(message || ""),
      tone: String(tone || "warning"),
    }));
  } catch {
    // Ignore storage failures and continue with the redirect.
  }
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

initCart();
