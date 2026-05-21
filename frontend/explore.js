const shell = window.StorefrontShell || {};
const API_BASE = window.API_BASE || shell.API_BASE || "";
const token = shell.token || localStorage.getItem("token");

const booksGrid = document.getElementById("booksGrid");
const personalizedGrid = document.getElementById("personalizedGrid");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const languageSelect = document.getElementById("languageSelect");
const sortSelect = document.getElementById("sortSelect");
const applyBtn = document.getElementById("applyBtn");
const resultsMeta = document.getElementById("resultsMeta");
const resultsSignal = document.getElementById("resultsSignal");
const personalizedMeta = document.getElementById("personalizedMeta");
const personalizedSignal = document.getElementById("personalizedSignal");

const state = {
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
};

const COPY = {
  English: {
    heroEyebrow: "AI marketplace for students, creators, teachers, and freelancers",
    heroTitle: "Discover digital products built for <span>earning online</span>.",
    heroCopy: "Explore notes, ebooks, prompts, templates, and creator-made knowledge products with an India-ready purchase flow and real monetization rails.",
    heroCartCta: "Go To Cart",
    heroDashboardCta: "Launch Creator Hub",
    forYouTitle: "For You",
    filtersTitle: "Marketplace Filters",
    filtersCopy: "Find high-intent student products, creator resources, and trending digital assets.",
    searchLabel: "Search",
    categoryLabel: "Category",
    languageLabel: "Language",
    sortLabel: "Sort",
    applyBtn: "Apply Filters",
    searchPlaceholder: "Search prompts, notes, AI templates, exam guides...",
    resultsTitle: "Live Marketplace",
    allCategories: "All Categories",
    allLanguages: "All Languages",
    sortTrending: "Trending",
    sortNewest: "Newest",
    sortPriceLow: "Price Low to High",
    sortPriceHigh: "Price High to Low",
    signInRequired: "Sign in required",
    guestFeedTitle: "Your AI discovery feed is waiting",
    guestFeedMessage: "Log in to see personalized recommendations across notes, prompts, templates, and creator-made study products.",
    signInForAiPicks: "Sign In For AI Picks",
    becomeCreator: "Become A Creator",
    loadingRecommendations: "Loading recommendations from the AI discovery layer...",
    feedLearningSignal: "Signal learning",
    noPersonalizedTitle: "No personalized picks yet",
    noPersonalizedMessage: "The recommendation engine needs a little more browsing history before it can rank the best creator products for you.",
    feedLearningMeta: "Browse a few live products and the feed will start adapting to your interests.",
    feedLearningStatus: "Need more behavior",
    personalizedLiveMeta: "AI-ranked picks based on the marketplace signals around your account.",
    personalizedLiveStatus: "Personalized live",
    personalizedUnavailableTitle: "Personalized feed unavailable",
    personalizedUnavailableMessage: "Try again in a moment.",
    personalizedUnavailableStatus: "Feed retry needed",
    loadingCatalogMeta: "Refreshing marketplace inventory...",
    loadingCatalogStatus: "Scanning live catalog",
    noProductsTitle: "No products matched",
    noProductsMessage: "Try a broader search, another category, or switch the sort mode to discover more creator products.",
    marketplaceUnavailableTitle: "Marketplace unavailable",
    marketplaceUnavailableMeta: "We could not load live products right now.",
    marketplaceUnavailableStatus: "Retry needed",
    productsSummary: "{total} products live across creator categories",
    searchSummary: "{total} matching products for \"{search}\"",
    languageSummary: "{total} products live in {language}",
    sortTrendingStatus: "Trending now",
    sortNewestStatus: "Newest drops",
    sortPriceLowStatus: "Budget-first",
    sortPriceHighStatus: "Premium-first",
    viewDetails: "View Details",
    addToCart: "Add To Cart",
    signInToBuy: "Sign In To Buy",
    openFreeProduct: "Open Free Product",
    freeAccess: "Free access",
    newListing: "New marketplace listing",
    reviewsSuffix: "reviews",
    featuredPrefix: "Featured creator pick",
    followedReason: "From a creator you follow",
    addedToCartSignal: "Added to cart",
    cartFailedSignal: "Cart update failed",
    addedToCartMeta: "{message} You can continue browsing or open the cart.",
    noProductsFound: "No products found",
    noProductsFallback: "Try another filter or check back soon.",
  },
  Hindi: {
    heroEyebrow: "स्टूडेंट्स, क्रिएटर्स, टीचर्स और फ्रीलांसर्स के लिए AI मार्केटप्लेस",
    heroTitle: "डिजिटल प्रोडक्ट खोजें जो <span>ऑनलाइन कमाई</span> के लिए बने हैं।",
    heroCopy: "नोट्स, ईबुक्स, प्रॉम्प्ट्स, टेम्पलेट्स और creator-made knowledge products को India-ready payment flow और real monetization rails के साथ खोजें।",
    heroCartCta: "कार्ट खोलें",
    heroDashboardCta: "क्रिएटर हब शुरू करें",
    forYouTitle: "आपके लिए",
    filtersTitle: "मार्केटप्लेस फ़िल्टर्स",
    filtersCopy: "छात्रों के लिए high-intent products, creator resources और trending digital assets खोजें।",
    searchLabel: "खोजें",
    categoryLabel: "कैटेगरी",
    languageLabel: "भाषा",
    sortLabel: "सॉर्ट",
    applyBtn: "फ़िल्टर लागू करें",
    searchPlaceholder: "प्रॉम्प्ट्स, नोट्स, AI टेम्पलेट्स, exam guides खोजें...",
    resultsTitle: "लाइव मार्केटप्लेस",
    allCategories: "सभी कैटेगरी",
    allLanguages: "सभी भाषाएँ",
    sortTrending: "ट्रेंडिंग",
    sortNewest: "नवीनतम",
    sortPriceLow: "कम कीमत पहले",
    sortPriceHigh: "ज्यादा कीमत पहले",
    signInRequired: "साइन इन ज़रूरी",
    guestFeedTitle: "आपकी AI discovery feed तैयार है",
    guestFeedMessage: "लॉग इन करके notes, prompts, templates और creator-made study products की personalized recommendations देखें।",
    signInForAiPicks: "AI Picks के लिए Sign In",
    becomeCreator: "Creator बनें",
    loadingRecommendations: "AI discovery layer से recommendations लोड हो रही हैं...",
    feedLearningSignal: "Signal सीख रहा है",
    noPersonalizedTitle: "अभी personalized picks नहीं हैं",
    noPersonalizedMessage: "Recommendation engine को बेहतर ranking के लिए आपकी थोड़ी और browsing history चाहिए।",
    feedLearningMeta: "कुछ live products browse करें और feed आपके interests के हिसाब से adapt होने लगेगी।",
    feedLearningStatus: "और activity चाहिए",
    personalizedLiveMeta: "आपके account signals के आधार पर AI-ranked picks।",
    personalizedLiveStatus: "Personalized live",
    personalizedUnavailableTitle: "Personalized feed उपलब्ध नहीं है",
    personalizedUnavailableMessage: "थोड़ी देर में फिर कोशिश करें।",
    personalizedUnavailableStatus: "Feed retry चाहिए",
    loadingCatalogMeta: "मार्केटप्लेस inventory refresh हो रही है...",
    loadingCatalogStatus: "Live catalog scan हो रहा है",
    noProductsTitle: "कोई product match नहीं हुआ",
    noProductsMessage: "थोड़ी broader search करें, दूसरी category चुनें, या sort बदलकर और creator products खोजें।",
    marketplaceUnavailableTitle: "मार्केटप्लेस उपलब्ध नहीं है",
    marketplaceUnavailableMeta: "अभी live products लोड नहीं हो पाए।",
    marketplaceUnavailableStatus: "Retry चाहिए",
    productsSummary: "{total} products creator categories में live हैं",
    searchSummary: "\"{search}\" के लिए {total} matching products",
    languageSummary: "{language} में {total} products live हैं",
    sortTrendingStatus: "अभी ट्रेंडिंग",
    sortNewestStatus: "नए ड्रॉप्स",
    sortPriceLowStatus: "Budget-first",
    sortPriceHighStatus: "Premium-first",
    viewDetails: "डिटेल्स देखें",
    addToCart: "कार्ट में जोड़ें",
    signInToBuy: "खरीदने के लिए Sign In",
    openFreeProduct: "फ्री प्रोडक्ट खोलें",
    freeAccess: "फ्री एक्सेस",
    newListing: "नई marketplace listing",
    reviewsSuffix: "reviews",
    featuredPrefix: "Featured creator pick",
    followedReason: "जिस creator को आप follow करते हैं उससे",
    addedToCartSignal: "कार्ट में जुड़ गया",
    cartFailedSignal: "कार्ट अपडेट नहीं हो पाया",
    addedToCartMeta: "{message} आप browsing जारी रख सकते हैं या cart खोल सकते हैं।",
    noProductsFound: "कोई product नहीं मिला",
    noProductsFallback: "दूसरा filter आज़माएँ या बाद में फिर देखें।",
  },
};

document.addEventListener("DOMContentLoaded", initExplore);

async function initExplore() {
  bindEvents();
  await loadPreferences();
  applyInterfaceLanguage(state.preferences.interfaceLanguage);
  if (languageSelect) {
    languageSelect.value = state.preferences.marketplaceLanguage || "All";
  }
  await handleRefresh({ syncPreferences: false });
}

function bindEvents() {
  applyBtn?.addEventListener("click", () => {
    handleRefresh();
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleRefresh();
    }
  });

  document.querySelectorAll("[data-interface-language]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextLanguage = button.dataset.interfaceLanguage || "English";
      state.preferences.interfaceLanguage = nextLanguage;
      await savePreferences({ interfaceLanguage: nextLanguage }, false);
      applyInterfaceLanguage(nextLanguage);
      await handleRefresh({ syncPreferences: false });
    });
  });
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
    console.error("Preference load failed:", error);
  }
}

async function savePreferences(partial, includeNotifications = false) {
  state.preferences = {
    ...state.preferences,
    ...partial,
  };
  persistLocalPreferences();

  if (!token) {
    return;
  }

  const payload = {
    interfaceLanguage: state.preferences.interfaceLanguage,
    marketplaceLanguage: state.preferences.marketplaceLanguage,
  };

  if (!includeNotifications) {
    delete payload.notifications;
  }

  try {
    await fetch(`${API_BASE}/api/profile/preferences`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Preference save failed:", error);
  }
}

function persistLocalPreferences() {
  localStorage.setItem("marketplace-interface-language", state.preferences.interfaceLanguage || "English");
  localStorage.setItem("marketplace-market-language", state.preferences.marketplaceLanguage || "All");
}

function applyInterfaceLanguage(language) {
  const selectedLanguage = language === "Hindi" ? "Hindi" : "English";
  state.preferences.interfaceLanguage = selectedLanguage;
  persistLocalPreferences();

  setText("heroEyebrow", t("heroEyebrow"));
  setHTML("heroTitle", t("heroTitle"));
  setText("heroCopy", t("heroCopy"));
  setText("heroCartCta", t("heroCartCta"));
  setText("heroDashboardCta", t("heroDashboardCta"));
  setText("forYouTitle", t("forYouTitle"));
  setText("filtersTitle", t("filtersTitle"));
  setText("filtersCopy", t("filtersCopy"));
  setText("searchLabel", t("searchLabel"));
  setText("categoryLabel", t("categoryLabel"));
  setText("languageLabel", t("languageLabel"));
  setText("sortLabel", t("sortLabel"));
  setText("applyBtn", t("applyBtn"));
  setText("resultsTitle", t("resultsTitle"));

  if (searchInput) {
    searchInput.placeholder = t("searchPlaceholder");
  }

  if (categorySelect) {
    const firstOption = categorySelect.querySelector("option[value='']");
    if (firstOption) {
      firstOption.textContent = t("allCategories");
    }
  }

  if (languageSelect) {
    const allOption = languageSelect.querySelector("option[value='All']");
    if (allOption) {
      allOption.textContent = t("allLanguages");
    }
  }

  if (sortSelect) {
    const labels = {
      trending: t("sortTrending"),
      newest: t("sortNewest"),
      "price-low": t("sortPriceLow"),
      "price-high": t("sortPriceHigh"),
    };
    [...sortSelect.options].forEach((option) => {
      option.textContent = labels[option.value] || option.textContent;
    });
  }

  document.querySelectorAll("[data-interface-language]").forEach((button) => {
    button.classList.toggle(
      "active",
      String(button.dataset.interfaceLanguage || "") === selectedLanguage
    );
  });
}

async function handleRefresh({ syncPreferences = true } = {}) {
  if (syncPreferences && languageSelect) {
    state.preferences.marketplaceLanguage = languageSelect.value || "All";
    await savePreferences({ marketplaceLanguage: state.preferences.marketplaceLanguage });
  }

  await Promise.all([
    loadPersonalizedFeed(),
    loadBooks(),
  ]);
}

async function loadPersonalizedFeed() {
  if (!personalizedGrid || !personalizedMeta || !personalizedSignal) {
    return;
  }

  if (!token) {
    personalizedMeta.textContent = t("guestFeedMessage");
    personalizedSignal.textContent = t("signInRequired");
    personalizedGrid.innerHTML = `
      <div class="empty-panel" style="grid-column:1/-1;">
        <h2>${escapeHTML(t("guestFeedTitle"))}</h2>
        <p>${escapeHTML(t("guestFeedMessage"))}</p>
        <div class="product-actions" style="justify-content:center;margin-top:18px;">
          <a class="marketplace-button" href="login.html">${escapeHTML(t("signInForAiPicks"))}</a>
          <a class="marketplace-ghost-button" href="register.html">${escapeHTML(t("becomeCreator"))}</a>
        </div>
      </div>
    `;
    return;
  }

  try {
    personalizedMeta.textContent = t("loadingRecommendations");
    personalizedSignal.textContent = t("feedLearningSignal");

    const response = await fetch(`${API_BASE}/api/ai/recommendations?limit=6`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to load personalized recommendations");
    }

    const books = Array.isArray(data.books) ? data.books : [];
    if (!books.length) {
      personalizedMeta.textContent = t("feedLearningMeta");
      personalizedSignal.textContent = t("feedLearningStatus");
      renderProductGrid(personalizedGrid, [], {
        emptyTitle: t("noPersonalizedTitle"),
        emptyMessage: t("noPersonalizedMessage"),
      });
      return;
    }

    personalizedMeta.textContent = t("personalizedLiveMeta");
    personalizedSignal.textContent = t("personalizedLiveStatus");
    renderProductGrid(personalizedGrid, books, {
      emptyTitle: t("noPersonalizedTitle"),
      emptyMessage: t("noPersonalizedMessage"),
    });
  } catch (error) {
    personalizedMeta.textContent = error.message || t("personalizedUnavailableMessage");
    personalizedSignal.textContent = t("personalizedUnavailableStatus");
    renderProductGrid(personalizedGrid, [], {
      emptyTitle: t("personalizedUnavailableTitle"),
      emptyMessage: error.message || t("personalizedUnavailableMessage"),
    });
  }
}

async function loadBooks() {
  try {
    if (applyBtn) {
      applyBtn.disabled = true;
    }

    resultsMeta.textContent = t("loadingCatalogMeta");
    resultsSignal.textContent = t("loadingCatalogStatus");

    const search = searchInput?.value.trim() || "";
    const category = categorySelect?.value.trim() || "";
    const sort = sortSelect?.value || "trending";
    const language = languageSelect?.value || state.preferences.marketplaceLanguage || "All";

    const params = new URLSearchParams({
      limit: "60",
      sort,
    });

    if (search) {
      params.set("search", search);
    }

    if (category) {
      params.set("category", category);
    }

    if (language && language !== "All") {
      params.set("language", language);
    }

    const response = await fetch(`${API_BASE}/api/books?${params.toString()}`, {
      headers: token ? getAuthHeaders() : {},
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch books");
    }

    renderCategoryOptions(data.filters?.categories || []);
    renderMarketplaceSummary(data);
    renderProductGrid(booksGrid, data.books || [], {
      emptyTitle: t("noProductsTitle"),
      emptyMessage: t("noProductsMessage"),
    });
  } catch (error) {
    renderProductGrid(booksGrid, [], {
      emptyTitle: t("marketplaceUnavailableTitle"),
      emptyMessage: error.message || t("marketplaceUnavailableMeta"),
    });
    resultsMeta.textContent = t("marketplaceUnavailableMeta");
    resultsSignal.textContent = t("marketplaceUnavailableStatus");
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
    }
  }
}

function renderCategoryOptions(categories) {
  if (!categorySelect) {
    return;
  }

  const active = categorySelect.value;
  const options = [
    `<option value="">${escapeHTML(t("allCategories"))}</option>`,
    ...categories.map((category) => `
      <option value="${escapeAttribute(category.name)}">
        ${escapeHTML(category.name)} (${Number(category.count || 0).toLocaleString("en-IN")})
      </option>
    `),
  ];

  categorySelect.innerHTML = options.join("");
  categorySelect.value = active;
}

function renderMarketplaceSummary(data) {
  const summary = data.summary || {};
  setText("statTotalProducts", Number(summary.totalApprovedBooks || data.total || 0).toLocaleString("en-IN"));
  setText("statPaidProducts", Number(summary.totalPaidBooks || 0).toLocaleString("en-IN"));
  setText("statCategories", Number(summary.totalCategories || 0).toLocaleString("en-IN"));

  const total = Number(data.total || 0).toLocaleString("en-IN");
  const search = searchInput?.value.trim() || "";
  const appliedLanguage = String(summary.appliedLanguage || languageSelect?.value || "All");
  resultsMeta.textContent = search
    ? fillTemplate(t("searchSummary"), { total, search })
    : appliedLanguage !== "All"
      ? fillTemplate(t("languageSummary"), { total, language: appliedLanguage })
      : fillTemplate(t("productsSummary"), { total });

  const sort = sortSelect?.value || "trending";
  const sortLabelMap = {
    trending: t("sortTrendingStatus"),
    newest: t("sortNewestStatus"),
    "price-low": t("sortPriceLowStatus"),
    "price-high": t("sortPriceHighStatus"),
  };
  resultsSignal.textContent = sortLabelMap[sort] || t("sortTrendingStatus");
}

function renderProductGrid(container, books, options = {}) {
  if (!container) {
    return;
  }

  const {
    emptyTitle = t("noProductsFound"),
    emptyMessage = t("noProductsFallback"),
  } = options;

  container.innerHTML = "";

  if (!books.length) {
    container.innerHTML = `
      <div class="empty-panel" style="grid-column:1/-1;">
        <h2>${escapeHTML(emptyTitle)}</h2>
        <p>${escapeHTML(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  books.forEach((book) => {
    container.appendChild(buildProductCard(book));
  });
}

function buildProductCard(book) {
  const cover = resolveAssetUrl(
    book.coverUrl || book.cover || book.coverImage,
    "assets/covers/Ebook_AI.png"
  );
  const salePrice = Number(book.discountPrice || book.price || 0);
  const originalPrice = Number(book.originalPrice || salePrice || 0);
  const creatorLink = buildCreatorLink(book.authorUsername);
  const isPaid = Number(book.price || 0) > 0;
  const ratingCount = Number(book.ratingCount || 0);
  const ratingAverage = Number(book.ratingAverage || 0);
  const ratingSignal = ratingCount > 0
    ? `${ratingAverage.toFixed(1)} / 5 · ${ratingCount.toLocaleString("en-IN")} ${t("reviewsSuffix")}`
    : t("newListing");
  const authorMarkup = creatorLink
    ? `<a href="${creatorLink}" class="marketplace-link" style="padding:0;background:none;color:#d9ecff;">${escapeHTML(book.authorName || "Creator")}</a>`
    : escapeHTML(book.authorName || "Creator");
  const reason = String(book.recommendationReason || "").trim();

  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <div class="product-cover">
      <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}" />
    </div>
    <div class="product-badges">
      <span class="product-badge">${escapeHTML(book.type || "Product")}</span>
      <span class="product-badge">${escapeHTML(book.category || "Book")}</span>
      ${book.language ? `<span class="product-badge language">${escapeHTML(book.language)}</span>` : ""}
      ${book.subcategory ? `<span class="product-badge">${escapeHTML(book.subcategory)}</span>` : ""}
      ${book.isPremium ? `<span class="product-badge premium">Premium</span>` : ""}
      ${!isPaid ? `<span class="product-badge free">Free</span>` : ""}
    </div>
    <div class="product-copy">
      <h3>${escapeHTML(book.title)}</h3>
      <p>${escapeHTML(book.bookAuthor || `${book.type || "Digital product"} by creator`)} · Sold by ${authorMarkup}</p>
    </div>
    ${reason ? `<div class="product-reason">${escapeHTML(reason)}</div>` : ""}
    <div class="product-meta">
      <div class="price-stack">
        <strong>${isPaid ? `Rs. ${salePrice.toLocaleString("en-IN")}` : escapeHTML(t("freeAccess"))}</strong>
        ${isPaid && originalPrice > salePrice ? `<span>Rs. ${originalPrice.toLocaleString("en-IN")}</span>` : ""}
      </div>
      <span class="marketplace-chip subtle">${escapeHTML(book.isFeatured ? `${t("featuredPrefix")} - ${ratingSignal}` : ratingSignal)}</span>
    </div>
    <div class="product-actions">
      <a class="marketplace-ghost-button" href="book_view.html?id=${encodeURIComponent(book._id)}">${escapeHTML(t("viewDetails"))}</a>
      ${isPaid
        ? `<button class="marketplace-button" type="button" data-add-cart="${escapeAttribute(book._id)}">${escapeHTML(token ? t("addToCart") : t("signInToBuy"))}</button>`
        : `<a class="marketplace-button" href="book_view.html?id=${encodeURIComponent(book._id)}">${escapeHTML(t("openFreeProduct"))}</a>`
      }
    </div>
  `;

  card.querySelector("[data-add-cart]")?.addEventListener("click", () => addToCart(book._id));
  return card;
}

async function addToCart(bookId) {
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ bookId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Could not add the product to cart");
    }

    resultsSignal.textContent = t("addedToCartSignal");
    resultsMeta.textContent = fillTemplate(t("addedToCartMeta"), {
      message: data.message || "Product added to cart.",
    });
    shell.refreshCartCount?.();
    shell.refreshNotifications?.();
  } catch (error) {
    resultsSignal.textContent = t("cartFailedSignal");
    resultsMeta.textContent = error.message || t("cartFailedSignal");
  }
}

function buildCreatorLink(username) {
  const safeUsername = String(username || "").trim();
  if (!safeUsername) {
    return "";
  }

  return `creator/creator.html?username=${encodeURIComponent(safeUsername)}`;
}

function fillTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  ));
}

function t(key) {
  const language = state.preferences.interfaceLanguage === "Hindi" ? "Hindi" : "English";
  return COPY[language]?.[key] || COPY.English[key] || key;
}

function getAuthHeaders(extra = {}) {
  if (!token) {
    return extra;
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
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
  if (typeof shell.escapeHTML === "function") {
    return shell.escapeHTML(value);
  }
  return String(value || "");
}

function escapeAttribute(value) {
  if (typeof shell.escapeAttribute === "function") {
    return shell.escapeAttribute(value);
  }
  return String(value || "");
}

function resolveAssetUrl(value, fallback = "") {
  if (typeof shell.resolveAssetUrl === "function") {
    return shell.resolveAssetUrl(value, fallback);
  }
  return fallback || String(value || "");
}
