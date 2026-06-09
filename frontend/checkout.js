const shell = window.StorefrontShell || {};
const API_BASE = window.API_BASE || shell.API_BASE || "";
const token = shell.token || localStorage.getItem("token") || "";
const STORE_CONTACT = window.STORE_CONTACT || {
  phoneDisplay: "+91 98765 43210",
  phoneDigits: "919876543210",
  phoneHref: "tel:+919876543210",
  whatsappUrl: "https://wa.me/919876543210",
};

const checkoutItems = document.getElementById("checkoutItems");
const payInfo = document.getElementById("payInfo");
const amountInfo = document.getElementById("amountInfo");
const paymentMethodState = document.getElementById("paymentMethodState");
const upiIdLabel = document.getElementById("upiIdLabel");
const copyUpiBtn = document.getElementById("copyUpiBtn");
const qrImage = document.getElementById("qrImage");
const payNowBtn = document.getElementById("payNowBtn");
const payNowHint = document.getElementById("payNowHint");
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

const state = {
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
};

const COPY = {
  English: {
    title: "Order Support | E-Book Market",
    heroEyebrow: "Contact-first order help",
    heroTitle: "Send your selected books on <span>WhatsApp</span>.",
    heroCopy: "Review the books you want, then message or call the store team to confirm price, access, and delivery.",
    selectedLabel: "Selected products",
    totalLabel: "Selected total",
    reviewSpeedLabel: "Response channel",
    reviewSpeedValue: "WhatsApp + Call",
    selectTitle: "Choose books to include",
    editCart: "Edit Cart",
    proofTitle: "Contact to order",
    proofCopy: "No online payment is collected on this page. Orders are confirmed manually through WhatsApp or phone.",
    directOrderHint: "This request came from a single book page. Message us to confirm this title.",
    cartOrderHint: "Your paid cart items are preselected. Uncheck any title you do not want to include.",
    guestOrderHint: "Sign in to view your saved cart, or open any paid book page and contact us directly from there.",
    emptyTitle: "No paid products selected",
    emptyMessage: "Add paid products to your cart or open a paid book page, then contact the store team.",
    exploreProducts: "Explore Products",
    openCart: "Open Cart",
    paidProduct: "Paid product",
    included: "Included in this message",
    excluded: "Not included",
    digitalProduct: "Digital product",
    selectAtLeastOne: "Select at least one paid product to continue.",
    selectProductWarning: "Select at least one product before opening WhatsApp or calling.",
    orderSummary: "Selected total: {total} for {count} product{suffix}.",
    openProduct: "Open",
    contactBadge: "WhatsApp support",
    contactMode: "Manual confirmation",
    contactNote: "We confirm price, availability, and delivery manually through chat or phone.",
    founderPaymentOwner: "Order contact",
    founderSupportFallback: "Reach the store team on WhatsApp or call the phone number below.",
    contactReady: "Ready to contact",
    phoneReady: "Phone support available",
    noCoverPreview: "Cover preview is shown here when a selected book is available.",
    copyNumber: "Copy Number",
    copySuccess: "Phone number copied to clipboard.",
    copyFailed: "Could not copy the phone number on this device.",
    whatsappButton: "Open WhatsApp",
    whatsappHint: "The selected books and total will be added to your WhatsApp message automatically.",
    callNow: "Call Now",
    callHint: "Use the same number if WhatsApp does not open or you want faster order help.",
    openingWhatsApp: "Opening WhatsApp with your selected books...",
    callingNow: "Calling {phone}...",
    loadFailed: "Could not prepare the contact page.",
    unpaidDirectBook: "This product does not need contact ordering",
    whatsappUnavailable: "WhatsApp could not be opened right now.",
  },
  Hindi: {
    title: "Order Support | E-Book Market",
    heroEyebrow: "Contact-first order help",
    heroTitle: "Apni selected books <span>WhatsApp</span> par bhejiye.",
    heroCopy: "Jo books aap chahte hain unhe review kijiye, phir price, access aur delivery confirm karne ke liye store team ko message ya call kijiye.",
    selectedLabel: "Selected products",
    totalLabel: "Selected total",
    reviewSpeedLabel: "Response channel",
    reviewSpeedValue: "WhatsApp + Call",
    selectTitle: "Include karne ke liye books chuniye",
    editCart: "Cart edit kijiye",
    proofTitle: "Contact karke order kijiye",
    proofCopy: "Is page par online payment collect nahin hota. Orders WhatsApp ya phone ke through manually confirm hote hain.",
    directOrderHint: "Yeh request single book page se aayi hai. Is title ko confirm karne ke liye hume message kijiye.",
    cartOrderHint: "Aapke paid cart items pehle se selected hain. Jise include nahin karna chahte use uncheck kijiye.",
    guestOrderHint: "Saved cart dekhne ke liye sign in kijiye, ya kisi paid book page se seedha contact kijiye.",
    emptyTitle: "Koi paid product select nahin hai",
    emptyMessage: "Paid products cart me add kijiye ya paid book page kholiye, phir store team se contact kijiye.",
    exploreProducts: "Products explore karein",
    openCart: "Cart kholiye",
    paidProduct: "Paid product",
    included: "Is message me include hai",
    excluded: "Is message me include nahin hai",
    digitalProduct: "Digital product",
    selectAtLeastOne: "Continue karne ke liye kam se kam ek paid product select kijiye.",
    selectProductWarning: "WhatsApp ya call kholne se pehle kam se kam ek product select kijiye.",
    orderSummary: "Selected total: {total} for {count} product{suffix}.",
    openProduct: "Open",
    contactBadge: "WhatsApp support",
    contactMode: "Manual confirmation",
    contactNote: "Price, availability aur delivery chat ya phone ke through manually confirm hoti hai.",
    founderPaymentOwner: "Order contact",
    founderSupportFallback: "Store team se WhatsApp ya neeche diye gaye phone number par contact kijiye.",
    contactReady: "Contact ke liye ready",
    phoneReady: "Phone support available",
    noCoverPreview: "Jab selected book milegi tab uska cover preview yahan dikhega.",
    copyNumber: "Number Copy Kijiye",
    copySuccess: "Phone number clipboard me copy ho gaya.",
    copyFailed: "Is device par phone number copy nahin ho paaya.",
    whatsappButton: "WhatsApp Kholiye",
    whatsappHint: "Selected books aur total aapke WhatsApp message me automatically add ho jayenge.",
    callNow: "Abhi Call Kijiye",
    callHint: "Agar WhatsApp open nahin ho raha ya jaldi help chahiye, to isi number par call kijiye.",
    openingWhatsApp: "Selected books ke saath WhatsApp khola ja raha hai...",
    callingNow: "{phone} par call ki ja rahi hai...",
    loadFailed: "Contact page prepare nahin ho paaya.",
    unpaidDirectBook: "Is product ko contact ordering ki zaroorat nahin hai",
    whatsappUnavailable: "Abhi WhatsApp open nahin ho pa raha hai.",
  },
};

let checkoutBooks = [];
let selectedBookIds = new Set();
let isDirectCheckout = false;

async function initCheckout() {
  setLoadingState();
  await loadPreferences();
  applyInterfaceLanguage(state.preferences.interfaceLanguage);
  try {
    await loadBooksForCheckout();
    renderContactSummary();
  } catch (error) {
    setStatus(error.message || t("loadFailed"), "error");
  }
}

function setLoadingState() {
  selectedCountEl.textContent = "--";
  selectedTotalEl.textContent = "--";
  checkoutItems.innerHTML = `
    <div class="empty-panel">
      <h2>Preparing your order help...</h2>
      <p>Loading selected books and contact options.</p>
    </div>
  `;
  orderHint.textContent = "Loading your selected books...";
  payInfo.textContent = "Preparing order summary...";
  amountInfo.textContent = "Preparing selected total...";
  paymentMethodState.textContent = "Preparing contact options...";
  upiIdLabel.textContent = STORE_CONTACT.phoneDisplay;
  copyUpiBtn.textContent = "Copy Number";
  copyUpiBtn.disabled = false;
  payNowBtn.textContent = "Open WhatsApp";
  payNowBtn.href = "#";
  payNowHint.textContent = "The selected books will be added to your message automatically.";
  submitBtn.textContent = "Call Now";
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

function persistLocalPreferences() {
  localStorage.setItem("marketplace-interface-language", state.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", state.preferences.marketplaceLanguage || "All");
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
  setText("copyUpiBtn", t("copyNumber"));
  setText("payNowBtn", t("whatsappButton"));
  setText("payNowHint", t("whatsappHint"));
  setText("submitBtn", t("callNow"));
  setText("proofTip", t("callHint"));
  renderContactSummary();
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
    return;
  }

  if (!token) {
    checkoutBooks = [];
    selectedBookIds = new Set();
    orderHint.textContent = t("guestOrderHint");
    renderCheckoutItems();
    return;
  }

  const cart = await fetchCart();
  const items = (cart.items || []).filter((item) => item.book && Number(item.priceAtAdd || item.book.price || 0) > 0);
  checkoutBooks = items.map(normalizeCartItem);
  selectedBookIds = new Set(checkoutBooks.map((book) => String(book._id)));
  orderHint.textContent = checkoutBooks.length ? t("cartOrderHint") : t("guestOrderHint");
  renderCheckoutItems();
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
    renderContactSummary();
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
          <strong>${formatCurrency(book.price || 0)}</strong>
        </div>
      </div>
      <div class="product-actions" style="justify-content:flex-end;">
        <a class="marketplace-ghost-button" href="book_view.html?id=${encodeURIComponent(book._id)}">${escapeHTML(t("openProduct"))}</a>
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
      renderContactSummary();
    });
  });

  renderContactSummary();
}

function renderContactSummary() {
  const selectedBooks = getSelectedBooks();
  const total = selectedBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const leadCover = selectedBooks[0]?.cover || checkoutBooks[0]?.cover || "";

  selectedCountEl.textContent = String(selectedBooks.length);
  selectedTotalEl.textContent = formatCurrency(total);

  setText("checkoutMarketBadge", t("contactBadge"));
  setText("checkoutMarketMode", STORE_CONTACT.phoneDisplay || t("contactMode"));
  setText("checkoutMarketNote", t("contactNote"));
  setText("checkoutFounderMerchant", STORE_CONTACT.phoneDisplay);
  setText("checkoutFounderSupport", t("founderSupportFallback"));

  payInfo.textContent = selectedBooks.length
    ? t("contactReady")
    : t("selectAtLeastOne");
  paymentMethodState.textContent = t("phoneReady");
  amountInfo.textContent = selectedBooks.length
    ? fillTemplate(t("orderSummary"), {
      total: formatCurrency(total),
      count: selectedBooks.length,
      suffix: selectedBooks.length === 1 ? "" : "s",
    })
    : t("selectAtLeastOne");
  upiIdLabel.textContent = STORE_CONTACT.phoneDisplay;
  copyUpiBtn.disabled = false;
  payNowBtn.textContent = t("whatsappButton");
  payNowBtn.href = selectedBooks.length ? buildWhatsAppUrl(selectedBooks, total) : "#";
  payNowBtn.setAttribute("aria-disabled", selectedBooks.length ? "false" : "true");
  payNowHint.textContent = t("whatsappHint");
  submitBtn.textContent = t("callNow");
  submitBtn.disabled = false;

  if (leadCover) {
    qrImage.hidden = false;
    qrImage.src = resolveAssetUrl(leadCover, "assets/covers/Ebook_AI.png");
    qrImage.alt = selectedBooks[0]?.title || "Selected book cover";
  } else {
    qrImage.hidden = true;
    qrImage.removeAttribute("src");
    qrImage.alt = t("noCoverPreview");
  }
}

function getSelectedBooks() {
  return checkoutBooks.filter((book) => selectedBookIds.has(String(book._id)));
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildWhatsAppMessage(selectedBooks, total) {
  const lines = [
    "Hello E-Book Market, I want to order these books:",
    "",
  ];

  selectedBooks.forEach((book, index) => {
    lines.push(`${index + 1}. ${book.title} - ${formatCurrency(book.price || 0)}`);
  });

  lines.push("");
  lines.push(`Total: ${formatCurrency(total)}`);
  lines.push(`Page: ${window.location.href}`);
  return lines.join("\n");
}

function buildWhatsAppUrl(selectedBooks, total) {
  const message = buildWhatsAppMessage(selectedBooks, total);
  return typeof window.buildStoreWhatsAppUrl === "function"
    ? window.buildStoreWhatsAppUrl(message)
    : `${STORE_CONTACT.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

function openWhatsAppForSelection() {
  const selectedBooks = getSelectedBooks();
  if (!selectedBooks.length) {
    setStatus(t("selectProductWarning"), "warning");
    return;
  }

  const total = selectedBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const url = buildWhatsAppUrl(selectedBooks, total);
  if (!url) {
    setStatus(t("whatsappUnavailable"), "error");
    return;
  }

  if (typeof window.trackStoreContactIntent === "function") {
    window.trackStoreContactIntent("whatsapp", {
      itemCount: selectedBooks.length,
      value: total,
      itemName: selectedBooks.length === 1 ? selectedBooks[0].title : "Checkout order",
      itemId: selectedBooks.length === 1 ? selectedBooks[0]._id : "",
      sourcePage: "/checkout.html",
    });
  }

  setStatus(t("openingWhatsApp"), "info");
  const popup = window.open(url, "_blank", "noopener");
  if (!popup) {
    window.location.href = url;
  }
}

function callStore() {
  const selectedBooks = getSelectedBooks();
  if (!selectedBooks.length) {
    setStatus(t("selectProductWarning"), "warning");
    return;
  }

  const total = selectedBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
  const phone = STORE_CONTACT.phoneDisplay || "+91 98765 43210";
  if (typeof window.trackStoreContactIntent === "function") {
    window.trackStoreContactIntent("phone", {
      itemCount: selectedBooks.length,
      value: total,
      itemName: selectedBooks.length === 1 ? selectedBooks[0].title : "Checkout order",
      itemId: selectedBooks.length === 1 ? selectedBooks[0]._id : "",
      sourcePage: "/checkout.html",
    });
  }
  setStatus(fillTemplate(t("callingNow"), { phone }), "info");
  window.location.href = STORE_CONTACT.phoneHref || "tel:+919876543210";
}

function setStatus(message, tone = "") {
  statusEl.textContent = message || "";
  statusEl.className = "status-message";
  if (tone) {
    statusEl.classList.add(tone);
  }
}

payNowBtn?.addEventListener("click", (event) => {
  const href = String(payNowBtn.getAttribute("href") || "").trim();
  if (!href || href === "#") {
    event.preventDefault();
    setStatus(t("selectProductWarning"), "warning");
    return;
  }

  event.preventDefault();
  openWhatsAppForSelection();
});

submitBtn?.addEventListener("click", callStore);

copyUpiBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(STORE_CONTACT.phoneDisplay || "+91 98765 43210");
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
