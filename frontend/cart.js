const shell = window.StorefrontShell || {};
const API_BASE = window.API_BASE || shell.API_BASE || "";
const token = shell.token || localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const STORE_CONTACT = window.STORE_CONTACT || {
  phoneDisplay: "+91 98765 43210",
  phoneDigits: "919876543210",
  phoneHref: "tel:+919876543210",
  whatsappUrl: "https://wa.me/919876543210",
};

const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const cartSummaryTotal = document.getElementById("cartSummaryTotal");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartItemsCount = document.getElementById("cartItemsCount");
const cartPaidCount = document.getElementById("cartPaidCount");
const cartSummaryCount = document.getElementById("cartSummaryCount");
const clearBtn = document.getElementById("clearBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const manualCheckoutBtn = document.getElementById("manualCheckoutBtn");
const cartMessage = document.getElementById("cartMessage");

const state = {
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
};

const COPY = {
  English: {
    title: "Cart | E-Book Market",
    heroEyebrow: "Contact-first order support",
    heroTitle: "Your book cart for <span>WhatsApp ordering</span>.",
    heroCopy: "Review the books you want, then send the cart on WhatsApp or call the store team to confirm access and delivery.",
    itemsLabel: "Products in cart",
    paidLabel: "Paid products ready",
    subtotalLabel: "Cart subtotal",
    orderTitle: "Your selected books",
    orderCopy: "No online payment is collected here. We confirm paid-book orders through WhatsApp or phone.",
    addMore: "Add more products",
    summaryTitle: "Contact summary",
    summaryCopy: "Send your full cart on WhatsApp or call the store team for a manual confirmation.",
    itemsReady: "Items ready",
    summarySubtotal: "Subtotal",
    contactLabel: "WhatsApp",
    contactValue: STORE_CONTACT.phoneDisplay,
    responseLabel: "Order flow",
    responseValue: "WhatsApp + Call",
    totalLabel: "Selected total",
    checkoutStripe: "Send on WhatsApp",
    checkoutManual: "Call to Order",
    clearCart: "Clear Cart",
    helperPrimary: "We include every cart title and the total in your WhatsApp message for faster confirmation.",
    helperSecondary: "Call the same number if you want quick help, bundle support, or WhatsApp is not opening.",
    emptyTitle: "Your cart is empty",
    emptyMessage: "Add paid creator products from the marketplace, then contact the store team when you are ready.",
    exploreProducts: "Explore Products",
    emptyStatus: "Your cart is empty. Explore the marketplace to add paid books.",
    unlockAfterApproval: "Unlocked after manual confirmation",
    openProduct: "Open",
    removeProduct: "Remove",
    paidProduct: "Paid product",
    creatorResource: "Creator resource",
    removedSuccess: "Product removed from cart.",
    removedFailed: "Could not remove the item.",
    readyToContact: "Your cart is ready to send on WhatsApp or confirm by phone.",
    cartUnavailable: "Cart unavailable",
    cartUnavailableFallback: "Could not load the cart right now.",
    cartLoadFailed: "Cart load failed.",
    cartCleared: "Cart cleared successfully.",
    cartClearFailed: "Could not clear the cart.",
    openingWhatsApp: "Opening WhatsApp with your cart details...",
    cartEmptyShort: "Your cart is empty.",
    noPayableItems: "No paid items found in your cart.",
    marketNote: "The cart total and selected titles are added to the WhatsApp message automatically.",
    callingNow: "Calling {phone}...",
  },
  Hindi: {
    title: "Cart | E-Book Market",
    heroEyebrow: "Contact-first order support",
    heroTitle: "Aapka book cart <span>WhatsApp ordering</span> ke liye.",
    heroCopy: "Jo books aap chahte hain unhe review kijiye, phir cart ko WhatsApp par bhejiye ya store team ko call karke access aur delivery confirm kijiye.",
    itemsLabel: "Cart me products",
    paidLabel: "Paid products ready",
    subtotalLabel: "Cart subtotal",
    orderTitle: "Aapki selected books",
    orderCopy: "Yahan online payment collect nahin hota. Paid-book orders WhatsApp ya phone ke through confirm hote hain.",
    addMore: "Aur products jodiye",
    summaryTitle: "Contact summary",
    summaryCopy: "Pura cart WhatsApp par bhejiye ya manual confirmation ke liye store team ko call kijiye.",
    itemsReady: "Ready items",
    summarySubtotal: "Subtotal",
    contactLabel: "WhatsApp",
    contactValue: STORE_CONTACT.phoneDisplay,
    responseLabel: "Order flow",
    responseValue: "WhatsApp + Call",
    totalLabel: "Selected total",
    checkoutStripe: "WhatsApp Par Bhejiye",
    checkoutManual: "Call Karke Order Kijiye",
    clearCart: "Cart saaf karein",
    helperPrimary: "Har cart title aur total aapke WhatsApp message me automatically jata hai taaki confirmation fast ho.",
    helperSecondary: "Agar aapko jaldi support chahiye ya WhatsApp open nahin ho raha, to isi number par call kijiye.",
    emptyTitle: "Aapka cart abhi khaali hai",
    emptyMessage: "Marketplace se paid creator products add kijiye, phir ready hone par store team se contact kijiye.",
    exploreProducts: "Products explore karein",
    emptyStatus: "Aapka cart khaali hai. Paid books add karne ke liye marketplace explore kijiye.",
    unlockAfterApproval: "Manual confirmation ke baad unlock hoga",
    openProduct: "Open",
    removeProduct: "Hataiye",
    paidProduct: "Paid product",
    creatorResource: "Creator resource",
    removedSuccess: "Product cart se hata diya gaya.",
    removedFailed: "Item hataaya nahin ja saka.",
    readyToContact: "Aapka cart WhatsApp ya phone confirmation ke liye ready hai.",
    cartUnavailable: "Cart unavailable",
    cartUnavailableFallback: "Abhi cart load nahin ho pa raha hai.",
    cartLoadFailed: "Cart load nahin hua.",
    cartCleared: "Cart safalta se saaf ho gaya.",
    cartClearFailed: "Cart saaf nahin ho paaya.",
    openingWhatsApp: "Cart details ke saath WhatsApp khola ja raha hai...",
    cartEmptyShort: "Aapka cart khaali hai.",
    noPayableItems: "Cart me koi paid item nahin mila.",
    marketNote: "Cart total aur selected titles WhatsApp message me automatically add ho jaate hain.",
    callingNow: "{phone} par call ki ja rahi hai...",
  },
};

async function initCart() {
  setLoadingState();
  await loadPreferences();
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
      <p>Preparing your selected books and contact options.</p>
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

function persistLocalPreferences() {
  localStorage.setItem("marketplace-interface-language", state.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", state.preferences.marketplaceLanguage || "All");
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
  setText("cartContactLabel", t("contactLabel"));
  setText("cartContactValue", t("contactValue"));
  setText("cartResponseLabel", t("responseLabel"));
  setText("cartResponseValue", t("responseValue"));
  setText("cartTotalLabel", t("totalLabel"));
  setText("checkoutBtn", t("checkoutStripe"));
  setText("manualCheckoutBtn", t("checkoutManual"));
  setText("clearBtn", t("clearCart"));
  setText("cartHelperStripe", t("helperPrimary"));
  setText("cartHelperManual", t("helperSecondary"));
  setText("cartMarketNote", t("marketNote"));
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
            <strong>${formatCurrency(item.priceAtAdd || item.book?.price || 0)}</strong>
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
    setStatus(t("readyToContact"), "info");
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

function setSummary(items, total) {
  const itemCount = items.length;
  const formattedTotal = formatCurrency(total);
  cartTotal.textContent = formattedTotal;
  cartSummaryTotal.textContent = formattedTotal;
  cartSubtotal.textContent = formattedTotal;
  cartItemsCount.textContent = String(itemCount);
  cartPaidCount.textContent = String(itemCount);
  cartSummaryCount.textContent = String(itemCount);
}

function setCheckoutState(hasItems) {
  if (checkoutBtn) {
    checkoutBtn.disabled = !hasItems;
  }
  if (manualCheckoutBtn) {
    manualCheckoutBtn.disabled = !hasItems;
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

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildCartInquiryMessage(items, total) {
  const lines = [
    "Hello E-Book Market, I want to order these books:",
    "",
  ];

  items.forEach((item, index) => {
    const title = item.book?.title || "Book";
    const price = formatCurrency(item.priceAtAdd || item.book?.price || 0);
    lines.push(`${index + 1}. ${title} - ${price}`);
  });

  lines.push("");
  lines.push(`Total: ${formatCurrency(total)}`);
  lines.push(`Cart page: ${window.location.href}`);
  return lines.join("\n");
}

function openWhatsApp(message, payload = {}) {
  const url = typeof window.buildStoreWhatsAppUrl === "function"
    ? window.buildStoreWhatsAppUrl(message)
    : `${STORE_CONTACT.whatsappUrl}?text=${encodeURIComponent(String(message || ""))}`;

  if (typeof window.trackStoreContactIntent === "function") {
    window.trackStoreContactIntent("whatsapp", {
      itemCount: Number(payload.itemCount || 0),
      value: Number(payload.value || 0),
      itemName: payload.itemName || "Cart order",
      sourcePage: "/cart.html",
    });
  }

  setStatus(t("openingWhatsApp"), "info");
  const popup = window.open(url, "_blank", "noopener");
  if (!popup) {
    window.location.href = url;
  }
}

function callStore(payload = {}) {
  const phone = STORE_CONTACT.phoneDisplay || "+91 98765 43210";
  if (typeof window.trackStoreContactIntent === "function") {
    window.trackStoreContactIntent("phone", {
      itemCount: Number(payload.itemCount || 0),
      value: Number(payload.value || 0),
      itemName: payload.itemName || "Cart order",
      sourcePage: "/cart.html",
    });
  }
  setStatus(fillTemplate(t("callingNow"), { phone }), "info");
  window.location.href = STORE_CONTACT.phoneHref || "tel:+919876543210";
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
    const cart = await fetchCart();
    const items = (cart.items || []).filter((item) => item.book && Number(item.priceAtAdd || item.book.price || 0) > 0);
    if (!items.length) {
      setStatus(t("noPayableItems"), "warning");
      return;
    }

    openWhatsApp(buildCartInquiryMessage(items, Number(cart.total || 0)), {
      itemCount: items.length,
      value: Number(cart.total || 0),
      itemName: "Cart order",
    });
  } catch (error) {
    setStatus(error.message || t("cartLoadFailed"), "error");
  }
});

manualCheckoutBtn?.addEventListener("click", async () => {
  try {
    const cart = await fetchCart();
    const items = (cart.items || []).filter((item) => item.book && Number(item.priceAtAdd || item.book.price || 0) > 0);
    if (!items.length) {
      setStatus(t("cartEmptyShort"), "warning");
      return;
    }
    callStore({
      itemCount: items.length,
      value: Number(cart.total || 0),
      itemName: "Cart order",
    });
  } catch (error) {
    setStatus(error.message || t("cartLoadFailed"), "error");
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

initCart();
