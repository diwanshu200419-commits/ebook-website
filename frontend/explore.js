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
const quickFilterRow = document.getElementById("quickFilterRow");
const resultsMeta = document.getElementById("resultsMeta");
const resultsSignal = document.getElementById("resultsSignal");
const personalizedMeta = document.getElementById("personalizedMeta");
const personalizedSignal = document.getElementById("personalizedSignal");
const commandDeck = document.getElementById("commandDeck");
const commandDeckSignal = document.getElementById("commandDeckSignal");
const savedRail = document.getElementById("savedRail");
const savedSignal = document.getElementById("savedSignal");
const recentRail = document.getElementById("recentRail");
const recentSignal = document.getElementById("recentSignal");
const marketPulseTrack = document.getElementById("marketPulseTrack");
const pulseTitle = document.getElementById("pulseTitle");
const pulseHeadline = document.getElementById("pulseHeadline");
const pulseCopy = document.getElementById("pulseCopy");
const pulseStatus = document.getElementById("pulseStatus");

const STORAGE_KEYS = {
  savedProducts: "marketplace-saved-products",
  recentProducts: "marketplace-recent-products",
};

const state = {
  preferences: {
    interfaceLanguage: localStorage.getItem("marketplace-interface-language") || "English",
    marketplaceLanguage: localStorage.getItem("marketplace-market-language") || "All",
  },
  catalogBooks: [],
  personalizedBooks: [],
  savedProducts: loadStoredCollection(STORAGE_KEYS.savedProducts),
  recentProducts: loadStoredCollection(STORAGE_KEYS.recentProducts),
};

let revealObserver = null;

const COPY = {
  English: {
    heroEyebrow: "AI marketplace for students, creators, teachers, and freelancers",
    heroTitle: "Discover digital products built for <span>earning online</span>.",
    heroCopy: "Explore notes, ebooks, prompts, templates, and creator-made knowledge products with an India-ready purchase flow and real monetization rails.",
    heroCartCta: "Go To Cart",
    heroDashboardCta: "Launch Creator Hub",
    pulseTitle: "Marketplace Pulse",
    pulseDefaultHeadline: "Live demand is moving toward creator-ready digital products.",
    pulseFilteredHeadline: "Your filters are shaping a sharper marketplace lane.",
    pulseSearchHeadline: "Search is narrowing the catalog to high-intent products.",
    pulseCopy: "We surface the strongest categories, pricing lanes, and language demand from the live catalog.",
    pulseStatusLive: "Market live",
    pulseStatusFiltered: "Filter active",
    statTotalProductsLabel: "Total live products",
    statPaidProductsLabel: "Paid earning assets",
    statCategoriesLabel: "Categories live",
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
    quickAll: "All",
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
    pulseCardFree: "Free library",
    pulseCardPremium: "Premium stock",
    pulseCardTopCategory: "Leading category",
    pulseCardLanguage: "Language lane",
    pulseCardFreeMeta: "Free products creators can use for reach and trust.",
    pulseCardPremiumMeta: "Paid products ready for monetization.",
    pulseCardTopCategoryMeta: "Most stocked lane in the live marketplace.",
    pulseCardLanguageMeta: "Catalog filtered to {language}.",
    pulseCardLanguageAllMeta: "Catalog open across all supported languages.",
    pulseCardSearchMeta: "Search focus: {search}",
    viewDetails: "View Details",
    addToCart: "Add To Cart",
    signInToBuy: "Sign In To Buy",
    openFreeProduct: "Open Free Product",
    freeAccess: "Free access",
    newListing: "New marketplace listing",
    reviewsSuffix: "reviews",
    featuredPrefix: "Featured creator pick",
    followedReason: "From a creator you follow",
    aiRankedMatch: "AI-ranked match",
    marketplaceListing: "Marketplace listing",
    salesSuffix: "sales",
    viewsSuffix: "views",
    readySuffix: "ready",
    ratingChipSuffix: "rating",
    addedToCartSignal: "Added to cart",
    cartFailedSignal: "Cart update failed",
    addedToCartMeta: "{message} You can continue browsing or open the cart.",
    noProductsFound: "No products found",
    noProductsFallback: "Try another filter or check back soon.",
    commandDeckTitle: "Marketplace Command Deck",
    commandDeckCopy: "Track saved ideas, recently viewed products, and the next revenue move from one buyer-friendly surface.",
    commandDeckSignal: "Behavior memory live",
    savedTitle: "Saved Ideas",
    savedCopy: "Keep promising creator products in one place before you buy, compare, or revisit them later.",
    savedSignalEmpty: "Empty watchlist",
    savedSignalLive: "{count} saved",
    recentTitle: "Recently Viewed",
    recentCopy: "Jump back into products you explored recently without losing your discovery trail.",
    recentSignalEmpty: "Fresh trail",
    recentSignalLive: "{count} revisits ready",
    commandSavedLabel: "Saved products",
    commandRecentLabel: "Recent views",
    commandCartLabel: "Cart-ready moves",
    commandSavedMeta: "Products you want to compare, revisit, or buy later.",
    commandRecentMeta: "Your latest discovery trail across the marketplace.",
    commandCartMeta: "Use saves and recents to keep the purchase flow moving.",
    commandSavedCta: "Open saved rail",
    commandRecentCta: "Open recent rail",
    commandCartCta: "Open cart",
    saveProduct: "Save",
    savedProduct: "Saved",
    removeSaved: "Remove",
    openProduct: "Open",
    memoryEmptySavedTitle: "No saved products yet",
    memoryEmptySavedCopy: "Tap Save on products you want to compare or buy later and they will stay here.",
    memoryEmptyRecentTitle: "No recent views yet",
    memoryEmptyRecentCopy: "Open a few products and your recent discovery trail will appear here.",
    savedToast: "Saved to your marketplace list.",
    removedSavedToast: "Removed from saved products.",
    viewedNow: "Viewed just now",
    viewedAt: "Viewed {time}",
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

Object.assign(COPY.Hindi, {
  heroEyebrow: "स्टूडेंट्स, क्रिएटर्स, टीचर्स और फ्रीलांसर्स के लिए AI मार्केटप्लेस",
  heroTitle: "डिजिटल प्रोडक्ट खोजें जो <span>ऑनलाइन कमाई</span> के लिए बने हैं।",
  heroCopy: "नोट्स, ईबुक्स, प्रॉम्प्ट्स, टेम्पलेट्स और creator-made knowledge products को India-ready payment flow और real monetization rails के साथ खोजें।",
  heroCartCta: "कार्ट खोलें",
  heroDashboardCta: "क्रिएटर हब शुरू करें",
  pulseTitle: "मार्केटप्लेस पल्स",
  pulseDefaultHeadline: "लाइव डिमांड creator-ready digital products की तरफ बढ़ रही है।",
  pulseFilteredHeadline: "आपके filters अब marketplace को और sharper बना रहे हैं।",
  pulseSearchHeadline: "Search अब catalog को high-intent products तक सीमित कर रही है।",
  pulseCopy: "हम live catalog से strongest categories, pricing lanes और language demand surface करते हैं।",
  pulseStatusLive: "मार्केट लाइव",
  pulseStatusFiltered: "फ़िल्टर सक्रिय",
  statTotalProductsLabel: "कुल लाइव प्रोडक्ट्स",
  statPaidProductsLabel: "पेड earning assets",
  statCategoriesLabel: "लाइव categories",
  forYouTitle: "आपके लिए",
  filtersTitle: "मार्केटप्लेस फ़िल्टर्स",
  filtersCopy: "High-intent student products, creator resources और trending digital assets खोजें।",
  searchLabel: "खोजें",
  categoryLabel: "कैटेगरी",
  languageLabel: "भाषा",
  sortLabel: "सॉर्ट",
  applyBtn: "फ़िल्टर लागू करें",
  searchPlaceholder: "प्रॉम्प्ट्स, नोट्स, AI टेम्पलेट्स, exam guides खोजें...",
  resultsTitle: "लाइव मार्केटप्लेस",
  allCategories: "सभी कैटेगरी",
  allLanguages: "सभी भाषाएँ",
  quickAll: "सभी",
  sortTrending: "ट्रेंडिंग",
  sortNewest: "नवीनतम",
  sortPriceLow: "कम कीमत पहले",
  sortPriceHigh: "ज़्यादा कीमत पहले",
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
  sortNewestStatus: "नए drops",
  sortPriceLowStatus: "Budget-first",
  sortPriceHighStatus: "Premium-first",
  pulseCardFree: "Free library",
  pulseCardPremium: "Premium stock",
  pulseCardTopCategory: "Leading category",
  pulseCardLanguage: "Language lane",
  pulseCardFreeMeta: "ऐसे free products जो reach और trust बनाने में मदद करते हैं।",
  pulseCardPremiumMeta: "Monetization के लिए ready paid products।",
  pulseCardTopCategoryMeta: "Live marketplace की सबसे stocked lane।",
  pulseCardLanguageMeta: "Catalog अभी {language} पर filtered है।",
  pulseCardLanguageAllMeta: "Catalog सभी supported languages में खुला है।",
  pulseCardSearchMeta: "Search focus: {search}",
  viewDetails: "डिटेल्स देखें",
  addToCart: "कार्ट में जोड़ें",
  signInToBuy: "खरीदने के लिए Sign In",
  openFreeProduct: "फ्री प्रोडक्ट खोलें",
  freeAccess: "फ्री एक्सेस",
  newListing: "नई marketplace listing",
  reviewsSuffix: "reviews",
  featuredPrefix: "Featured creator pick",
  followedReason: "जिस creator को आप follow करते हैं उससे",
  aiRankedMatch: "AI-ranked match",
  marketplaceListing: "Marketplace listing",
  salesSuffix: "sales",
  viewsSuffix: "views",
  readySuffix: "ready",
  ratingChipSuffix: "rating",
  addedToCartSignal: "कार्ट में जुड़ गया",
  cartFailedSignal: "कार्ट अपडेट नहीं हो पाया",
  addedToCartMeta: "{message} आप browsing जारी रख सकते हैं या cart खोल सकते हैं।",
  noProductsFound: "कोई product नहीं मिला",
  noProductsFallback: "दूसरा filter आज़माएँ या बाद में फिर देखें।",
  commandDeckTitle: "Marketplace Command Deck",
  commandDeckCopy: "Saved ideas, recent product views, aur अगला buying move ek hi jagah track kijiye.",
  commandDeckSignal: "Behavior memory live",
  savedTitle: "Saved Ideas",
  savedCopy: "Jo creator products aapko promising lagte hain unhe buy karne se pehle yahin save rakhiye.",
  savedSignalEmpty: "Saved list empty",
  savedSignalLive: "{count} saved",
  recentTitle: "Recently Viewed",
  recentCopy: "Jo products aapne abhi dekhe the un par bina trail खोए jaldi wapas jaiye.",
  recentSignalEmpty: "Fresh trail",
  recentSignalLive: "{count} revisits ready",
  commandSavedLabel: "Saved products",
  commandRecentLabel: "Recent views",
  commandCartLabel: "Cart-ready moves",
  commandSavedMeta: "Compare, revisit, ya baad me buy karne ke liye products yahan rakhiye.",
  commandRecentMeta: "Marketplace me aapka latest discovery trail.",
  commandCartMeta: "Saves aur recents se purchase flow ko fast rakhiye.",
  commandSavedCta: "Saved rail kholo",
  commandRecentCta: "Recent rail kholo",
  commandCartCta: "Cart kholo",
  saveProduct: "Save",
  savedProduct: "Saved",
  removeSaved: "Hataiye",
  memoryEmptySavedTitle: "Abhi koi saved product nahin hai",
  memoryEmptySavedCopy: "Jin products ko baad me compare ya buy karna hai unpar Save tap kijiye.",
  memoryEmptyRecentTitle: "Abhi koi recent view nahin hai",
  memoryEmptyRecentCopy: "Kuch products kholo aur recent discovery trail yahan dikhne lagega.",
  savedToast: "Product aapki saved list me aa gaya.",
  removedSavedToast: "Product saved list se hata diya gaya.",
  viewedNow: "Abhi dekha gaya",
  viewedAt: "{time} par dekha gaya",
});

function loadStoredCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistStoredCollection(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Could not persist ${key}:`, error);
  }
}

function bumpVisibleCartCount(delta = 1) {
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    const current = Number(node.textContent || 0);
    node.textContent = String(Math.max(current + Number(delta || 0), 0));
  });
}

document.addEventListener("DOMContentLoaded", initExplore);

async function initExplore() {
  initMotionSystem();
  armRevealElements(document);
  bindEvents();
  renderMarketplaceMemory();
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
  document.documentElement.lang = selectedLanguage === "Hindi" ? "hi" : "en";

  setText("heroEyebrow", t("heroEyebrow"));
  setHTML("heroTitle", t("heroTitle"));
  setText("heroCopy", t("heroCopy"));
  setText("heroCartCta", t("heroCartCta"));
  setText("heroDashboardCta", t("heroDashboardCta"));
  setText("pulseTitle", t("pulseTitle"));
  setText("pulseHeadline", t("pulseDefaultHeadline"));
  setText("pulseCopy", t("pulseCopy"));
  setText("pulseStatus", t("pulseStatusLive"));
  setText("statTotalProductsLabel", t("statTotalProductsLabel"));
  setText("statPaidProductsLabel", t("statPaidProductsLabel"));
  setText("statCategoriesLabel", t("statCategoriesLabel"));
  setText("commandDeckTitle", t("commandDeckTitle"));
  setText("commandDeckCopy", t("commandDeckCopy"));
  setText("forYouTitle", t("forYouTitle"));
  setText("savedTitle", t("savedTitle"));
  setText("savedCopy", t("savedCopy"));
  setText("recentTitle", t("recentTitle"));
  setText("recentCopy", t("recentCopy"));
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

  renderMarketplaceMemory();
}

function buildBookSnapshot(book) {
  if (!book?._id) {
    return null;
  }

  return {
    _id: String(book._id),
    title: book.title || "Product",
    type: book.type || "Product",
    category: book.category || "Book",
    language: book.language || "",
    price: Number(book.discountPrice || book.price || 0),
    originalPrice: Number(book.originalPrice || book.price || 0),
    authorName: book.authorName || "Creator",
    bookAuthor: book.bookAuthor || "",
    coverImage: book.coverUrl || book.cover || book.coverImage || "assets/covers/Ebook_AI.png",
    isPremium: Boolean(book.isPremium),
    isFeatured: Boolean(book.isFeatured),
    ratingAverage: Number(book.ratingAverage || 0),
    ratingCount: Number(book.ratingCount || 0),
    recommendationReason: book.recommendationReason || "",
    viewedAt: new Date().toISOString(),
  };
}

function mergeSnapshotWithLiveBook(snapshot, liveBook) {
  if (!liveBook) {
    return snapshot;
  }

  return {
    ...snapshot,
    ...buildBookSnapshot({ ...snapshot, ...liveBook }),
    viewedAt: snapshot?.viewedAt || new Date().toISOString(),
  };
}

function syncMemoryWithLiveBooks(books = []) {
  if (!Array.isArray(books) || !books.length) {
    return;
  }

  const liveMap = new Map(
    books
      .filter((book) => book?._id)
      .map((book) => [String(book._id), buildBookSnapshot(book)])
  );

  state.savedProducts = state.savedProducts
    .map((snapshot) => mergeSnapshotWithLiveBook(snapshot, liveMap.get(String(snapshot?._id || ""))))
    .filter((snapshot) => snapshot?._id);

  state.recentProducts = state.recentProducts
    .map((snapshot) => mergeSnapshotWithLiveBook(snapshot, liveMap.get(String(snapshot?._id || ""))))
    .filter((snapshot) => snapshot?._id);

  persistStoredCollection(STORAGE_KEYS.savedProducts, state.savedProducts);
  persistStoredCollection(STORAGE_KEYS.recentProducts, state.recentProducts);
}

function isBookSaved(bookId) {
  const safeId = String(bookId || "").trim();
  return state.savedProducts.some((book) => String(book?._id || "") === safeId);
}

function saveBookToMemory(book) {
  const snapshot = buildBookSnapshot(book);
  if (!snapshot) {
    return;
  }

  state.savedProducts = [
    snapshot,
    ...state.savedProducts.filter((item) => String(item?._id || "") !== snapshot._id),
  ].slice(0, 18);
  persistStoredCollection(STORAGE_KEYS.savedProducts, state.savedProducts);
}

function removeSavedBook(bookId) {
  const safeId = String(bookId || "").trim();
  state.savedProducts = state.savedProducts.filter((item) => String(item?._id || "") !== safeId);
  persistStoredCollection(STORAGE_KEYS.savedProducts, state.savedProducts);
}

function toggleSavedBook(book) {
  const safeId = String(book?._id || "").trim();
  if (!safeId) {
    return;
  }

  if (isBookSaved(safeId)) {
    removeSavedBook(safeId);
    resultsSignal.textContent = t("savedProduct");
    resultsMeta.textContent = t("removedSavedToast");
  } else {
    saveBookToMemory(book);
    resultsSignal.textContent = t("savedProduct");
    resultsMeta.textContent = t("savedToast");
  }

  renderMarketplaceMemory();
  rerenderActiveGrids();
}

function pushRecentBook(book) {
  const snapshot = buildBookSnapshot(book);
  if (!snapshot) {
    return;
  }

  state.recentProducts = [
    snapshot,
    ...state.recentProducts.filter((item) => String(item?._id || "") !== snapshot._id),
  ].slice(0, 10);
  persistStoredCollection(STORAGE_KEYS.recentProducts, state.recentProducts);
}

function recordProductView(book) {
  pushRecentBook(book);
  renderMarketplaceMemory();
}

function rerenderActiveGrids() {
  if (token) {
    renderProductGrid(personalizedGrid, state.personalizedBooks, {
      variant: "personalized",
      emptyTitle: t("noPersonalizedTitle"),
      emptyMessage: t("noPersonalizedMessage"),
    });
  }

  renderProductGrid(booksGrid, state.catalogBooks, {
    variant: "catalog",
    emptyTitle: t("noProductsTitle"),
    emptyMessage: t("noProductsMessage"),
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
    renderLoadingGrid(personalizedGrid, {
      variant: "personalized",
      count: 3,
    });

    const response = await fetch(`${API_BASE}/api/ai/recommendations?limit=6`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Failed to load personalized recommendations");
    }

    const books = filterOfficialPreviewBooks(Array.isArray(data.books) ? data.books : []);
    state.personalizedBooks = books;
    syncMemoryWithLiveBooks(books);
    renderMarketplaceMemory();
    if (!books.length) {
      personalizedMeta.textContent = t("feedLearningMeta");
      personalizedSignal.textContent = t("feedLearningStatus");
      renderProductGrid(personalizedGrid, [], {
        variant: "personalized",
        emptyTitle: t("noPersonalizedTitle"),
        emptyMessage: t("noPersonalizedMessage"),
      });
      return;
    }

    personalizedMeta.textContent = t("personalizedLiveMeta");
    personalizedSignal.textContent = t("personalizedLiveStatus");
    renderProductGrid(personalizedGrid, books, {
      variant: "personalized",
      emptyTitle: t("noPersonalizedTitle"),
      emptyMessage: t("noPersonalizedMessage"),
    });
  } catch (error) {
    state.personalizedBooks = [];
    personalizedMeta.textContent = error.message || t("personalizedUnavailableMessage");
    personalizedSignal.textContent = t("personalizedUnavailableStatus");
    renderProductGrid(personalizedGrid, [], {
      variant: "personalized",
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
    renderLoadingGrid(booksGrid, {
      variant: "catalog",
      count: 6,
    });

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

    const books = filterOfficialPreviewBooks(Array.isArray(data.books) ? data.books : []);
    state.catalogBooks = books;
    syncMemoryWithLiveBooks(books);
    renderMarketplaceMemory();
    renderCategoryOptions(data.filters?.categories || []);
    renderQuickFilters(data.filters?.categories || []);
    renderMarketplaceSummary({
      ...data,
      books,
      total: books.length,
      summary: {
        ...(data.summary || {}),
        totalApprovedBooks: books.length,
        totalFreeBooks: books.filter((book) => Number(book.price || 0) <= 0).length,
        totalPaidBooks: books.filter((book) => Number(book.price || 0) > 0).length,
      },
    });
    renderProductGrid(booksGrid, books, {
      variant: "catalog",
      emptyTitle: t("noProductsTitle"),
      emptyMessage: t("noProductsMessage"),
    });
  } catch (error) {
    state.catalogBooks = [];
    renderProductGrid(booksGrid, [], {
      variant: "catalog",
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

function renderQuickFilters(categories) {
  if (!quickFilterRow || !categorySelect) {
    return;
  }

  const activeCategory = String(categorySelect.value || "").trim();
  const chips = [
    { value: "", label: t("quickAll") },
    ...categories.slice(0, 6).map((category) => ({
      value: category.name,
      label: `${category.name} (${Number(category.count || 0).toLocaleString("en-IN")})`,
    })),
  ];

  quickFilterRow.innerHTML = chips.map((chip) => `
    <button
      class="quick-filter-chip${chip.value === activeCategory ? " active" : ""}"
      type="button"
      data-quick-category="${escapeAttribute(chip.value)}"
    >
      ${escapeHTML(chip.label)}
    </button>
  `).join("");

  quickFilterRow.querySelectorAll("[data-quick-category]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextCategory = button.getAttribute("data-quick-category") || "";
      categorySelect.value = nextCategory;
      await handleRefresh();
    });
  });
}

function renderMarketplaceSummary(data) {
  const summary = data.summary || {};
  const totalApprovedBooks = Number(summary.totalApprovedBooks || data.total || 0);
  const totalPaidBooks = Number(summary.totalPaidBooks || 0);
  const totalFreeBooks = Number(summary.totalFreeBooks || Math.max(totalApprovedBooks - totalPaidBooks, 0));
  const totalCategories = Number(summary.totalCategories || data.filters?.categories?.length || 0);
  const topCategory = Array.isArray(data.filters?.categories) && data.filters.categories.length
    ? data.filters.categories[0]
    : null;

  animateMetricValue("statTotalProducts", totalApprovedBooks);
  animateMetricValue("statPaidProducts", totalPaidBooks);
  animateMetricValue("statCategories", totalCategories);

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

  renderMarketPulse({
    search,
    sort,
    appliedLanguage,
    totalFreeBooks,
    totalPaidBooks,
    topCategory,
    totalCategories,
  });
}

function renderMarketplaceMemory() {
  renderCommandDeck();
  renderMemoryRail(savedRail, state.savedProducts, {
    mode: "saved",
    emptyTitle: t("memoryEmptySavedTitle"),
    emptyMessage: t("memoryEmptySavedCopy"),
    signalEmpty: t("savedSignalEmpty"),
    signalLive: fillTemplate(t("savedSignalLive"), { count: state.savedProducts.length }),
  });
  renderMemoryRail(recentRail, state.recentProducts, {
    mode: "recent",
    emptyTitle: t("memoryEmptyRecentTitle"),
    emptyMessage: t("memoryEmptyRecentCopy"),
    signalEmpty: t("recentSignalEmpty"),
    signalLive: fillTemplate(t("recentSignalLive"), { count: state.recentProducts.length }),
  });
}

function renderCommandDeck() {
  if (!commandDeck) {
    return;
  }

  const cartCountText = document.querySelector("[data-cart-count]")?.textContent?.trim() || "0";

  const cards = [
    {
      label: t("commandSavedLabel"),
      value: Number(state.savedProducts.length || 0).toLocaleString("en-IN"),
      meta: t("commandSavedMeta"),
      href: "#savedTitle",
      cta: t("commandSavedCta"),
      tone: "saved",
    },
    {
      label: t("commandRecentLabel"),
      value: Number(state.recentProducts.length || 0).toLocaleString("en-IN"),
      meta: t("commandRecentMeta"),
      href: "#recentTitle",
      cta: t("commandRecentCta"),
      tone: "recent",
    },
    {
      label: t("commandCartLabel"),
      value: cartCountText,
      meta: t("commandCartMeta"),
      href: "cart.html",
      cta: t("commandCartCta"),
      tone: "cart",
    },
  ];

  commandDeck.innerHTML = cards.map((card, index) => `
    <article class="command-card reveal-on-scroll ${escapeAttribute(card.tone)}" style="--reveal-delay:${Math.min(index, 4) * 75}ms;">
      <span>${escapeHTML(card.label)}</span>
      <strong>${escapeHTML(card.value)}</strong>
      <p>${escapeHTML(card.meta)}</p>
      <a class="marketplace-ghost-button" href="${escapeAttribute(card.href)}">${escapeHTML(card.cta)}</a>
    </article>
  `).join("");

  if (commandDeckSignal) {
    commandDeckSignal.textContent = t("commandDeckSignal");
  }

  armRevealElements(commandDeck);
}

function renderMemoryRail(container, items, options = {}) {
  if (!container) {
    return;
  }

  const {
    mode = "saved",
    emptyTitle,
    emptyMessage,
    signalEmpty,
    signalLive,
  } = options;

  if (mode === "saved" && savedSignal) {
    savedSignal.textContent = items.length ? signalLive : signalEmpty;
  }
  if (mode === "recent" && recentSignal) {
    recentSignal.textContent = items.length ? signalLive : signalEmpty;
  }

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-panel memory-empty-panel">
        <h2>${escapeHTML(emptyTitle)}</h2>
        <p>${escapeHTML(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  items.forEach((book, index) => {
    container.appendChild(buildMemoryCard(book, mode, index));
  });
  armRevealElements(container);
}

function buildMemoryCard(book, mode = "saved", index = 0) {
  const cover = resolveAssetUrl(book.coverImage, "assets/covers/Ebook_AI.png");
  const isPaid = Number(book.price || 0) > 0;
  const viewedAtText = book.viewedAt
    ? fillTemplate(t("viewedAt"), { time: formatRelativeTime(book.viewedAt) })
    : t("viewedNow");
  const article = document.createElement("article");
  article.className = `memory-card reveal-on-scroll ${mode === "saved" ? "saved" : "recent"}`;
  article.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 65}ms`);
  article.innerHTML = `
    <div class="memory-cover">
      <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}" />
    </div>
    <div class="memory-copy">
      <div class="product-badges">
        <span class="product-badge">${escapeHTML(book.type || "Product")}</span>
        <span class="product-badge">${escapeHTML(book.category || "Book")}</span>
        ${book.language ? `<span class="product-badge language">${escapeHTML(book.language)}</span>` : ""}
      </div>
      <h3>${escapeHTML(book.title)}</h3>
      <p>${escapeHTML(book.bookAuthor || book.authorName || "Creator resource")}</p>
      <div class="memory-meta">
        <strong>${isPaid ? `Rs. ${Number(book.price || 0).toLocaleString("en-IN")}` : escapeHTML(t("freeAccess"))}</strong>
        <span>${escapeHTML(mode === "recent" ? viewedAtText : t("savedProduct"))}</span>
      </div>
      <div class="memory-actions">
        <a class="marketplace-ghost-button" href="book_view.html?id=${encodeURIComponent(book._id)}" data-memory-open="${escapeAttribute(book._id)}">${escapeHTML(t("openProduct"))}</a>
        ${mode === "saved"
          ? `<button class="marketplace-button" type="button" data-memory-remove="${escapeAttribute(book._id)}">${escapeHTML(t("removeSaved"))}</button>`
          : `<button class="marketplace-button" type="button" data-memory-save="${escapeAttribute(book._id)}">${escapeHTML(isBookSaved(book._id) ? t("savedProduct") : t("saveProduct"))}</button>`}
      </div>
    </div>
  `;

  article.querySelector("[data-memory-open]")?.addEventListener("click", () => recordProductView(book));
  article.querySelector("[data-memory-remove]")?.addEventListener("click", () => {
    removeSavedBook(book._id);
    renderMarketplaceMemory();
    rerenderActiveGrids();
    resultsSignal.textContent = t("savedProduct");
    resultsMeta.textContent = t("removedSavedToast");
  });
  article.querySelector("[data-memory-save]")?.addEventListener("click", () => toggleSavedBook(book));

  return article;
}

function renderProductGrid(container, books, options = {}) {
  if (!container) {
    return;
  }

  const {
    variant = "catalog",
    emptyTitle = t("noProductsFound"),
    emptyMessage = t("noProductsFallback"),
  } = options;

  container.innerHTML = "";
  container.className = "results-grid";
  container.classList.add(variant === "personalized" ? "is-personalized" : "is-catalog");
  if (books.length === 2) {
    container.classList.add("is-sparse");
  }
  if (books.length === 1) {
    container.classList.add("is-single");
  }

  if (!books.length) {
    container.innerHTML = `
      <div class="empty-panel" style="grid-column:1/-1;">
        <h2>${escapeHTML(emptyTitle)}</h2>
        <p>${escapeHTML(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  books.forEach((book, index) => {
    container.appendChild(buildProductCard(book, {
      variant,
      spotlight: variant === "personalized"
        ? index === 0
        : books.length === 1 && index === 0,
    }, index));
  });

  armRevealElements(container);
}

function renderLoadingGrid(container, options = {}) {
  if (!container) {
    return;
  }

  const {
    variant = "catalog",
    count = variant === "personalized" ? 3 : 6,
  } = options;

  container.innerHTML = "";
  container.className = "results-grid";
  container.classList.add(variant === "personalized" ? "is-personalized" : "is-catalog");
  if (count === 2) {
    container.classList.add("is-sparse");
  }
  if (count === 1) {
    container.classList.add("is-single");
  }

  Array.from({ length: count }).forEach((_, index) => {
    container.appendChild(buildLoadingCard({
      spotlight: variant === "personalized" && index === 0,
      index,
    }));
  });

  armRevealElements(container);
}

function buildLoadingCard(options = {}) {
  const { spotlight = false, index = 0 } = options;
  const card = document.createElement("article");
  card.className = `product-card is-loading-card${spotlight ? " is-spotlight" : ""} reveal-on-scroll`;
  card.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 70}ms`);
  card.innerHTML = `
    <div class="product-cover skeleton-block"></div>
    <div class="product-body">
      <div class="product-badges">
        <span class="skeleton-badge"></span>
        <span class="skeleton-badge short"></span>
        <span class="skeleton-badge short"></span>
      </div>
      <div class="product-copy">
        <span class="skeleton-line short"></span>
        <span class="skeleton-line medium"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line long"></span>
      </div>
      <div class="product-signal-row">
        <span class="skeleton-badge"></span>
        <span class="skeleton-badge short"></span>
        <span class="skeleton-badge short"></span>
      </div>
      <div class="product-meta">
        <div class="price-stack">
          <span class="skeleton-line short"></span>
          <span class="skeleton-line tiny"></span>
        </div>
        <span class="skeleton-badge medium"></span>
      </div>
      <div class="product-actions">
        <span class="skeleton-button"></span>
        <span class="skeleton-button"></span>
      </div>
    </div>
  `;
  return card;
}

function renderMarketPulse(context = {}) {
  if (!marketPulseTrack) {
    return;
  }

  const {
    search = "",
    appliedLanguage = "All",
    totalFreeBooks = 0,
    totalPaidBooks = 0,
    topCategory = null,
    totalCategories = 0,
  } = context;

  const languageMeta = appliedLanguage && appliedLanguage !== "All"
    ? fillTemplate(t("pulseCardLanguageMeta"), { language: appliedLanguage })
    : t("pulseCardLanguageAllMeta");
  const headline = search
    ? t("pulseSearchHeadline")
    : appliedLanguage !== "All"
      ? t("pulseFilteredHeadline")
      : t("pulseDefaultHeadline");

  setText("pulseHeadline", headline);
  setText("pulseCopy", search ? fillTemplate(t("pulseCardSearchMeta"), { search }) : t("pulseCopy"));
  setText("pulseStatus", search || appliedLanguage !== "All" ? t("pulseStatusFiltered") : t("pulseStatusLive"));

  const cards = [
    {
      label: t("pulseCardFree"),
      value: Number(totalFreeBooks || 0).toLocaleString("en-IN"),
      meta: t("pulseCardFreeMeta"),
    },
    {
      label: t("pulseCardPremium"),
      value: Number(totalPaidBooks || 0).toLocaleString("en-IN"),
      meta: t("pulseCardPremiumMeta"),
    },
    {
      label: t("pulseCardTopCategory"),
      value: topCategory?.name || Number(totalCategories || 0).toLocaleString("en-IN"),
      meta: t("pulseCardTopCategoryMeta"),
    },
    {
      label: t("pulseCardLanguage"),
      value: appliedLanguage && appliedLanguage !== "All" ? appliedLanguage : "All",
      meta: languageMeta,
    },
  ];

  marketPulseTrack.innerHTML = cards.map((card, index) => `
    <article class="pulse-card reveal-on-scroll" style="--reveal-delay:${Math.min(index, 5) * 80}ms;">
      <span>${escapeHTML(card.label)}</span>
      <strong>${escapeHTML(card.value)}</strong>
      <small>${escapeHTML(card.meta)}</small>
    </article>
  `).join("");

  armRevealElements(marketPulseTrack);
}

function animateMetricValue(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  const nextValue = Number(value || 0);
  const previousValue = Number(element.dataset.metricValue || 0);
  element.dataset.metricValue = String(nextValue);

  if (previousValue === nextValue) {
    element.textContent = nextValue.toLocaleString("en-IN");
    return;
  }

  const startedAt = performance.now();
  const duration = 650;

  const step = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(previousValue + ((nextValue - previousValue) * eased));
    element.textContent = currentValue.toLocaleString("en-IN");
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

function initMotionSystem() {
  if (revealObserver || typeof window.IntersectionObserver !== "function") {
    return;
  }

  revealObserver = new window.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -30px 0px",
  });
}

function armRevealElements(root = document) {
  if (!root?.querySelectorAll) {
    return;
  }

  root.querySelectorAll(".reveal-on-scroll").forEach((element) => {
    if (element.dataset.revealBound === "true") {
      return;
    }
    element.dataset.revealBound = "true";
    if (revealObserver) {
      revealObserver.observe(element);
    } else {
      element.classList.add("is-visible");
    }
  });
}

function filterOfficialPreviewBooks(books = []) {
  return books.filter((book) => !isOfficialPreviewBook(book));
}

function isOfficialPreviewBook(book = {}) {
  const catalogKey = String(book.catalogKey || "").trim().toLowerCase();
  if (catalogKey.startsWith("official-preview-")) {
    return true;
  }

  const title = String(book.title || "").trim().toLowerCase();
  const subcategory = String(book.subcategory || "").trim().toLowerCase();
  const cover = String(book.coverUrl || book.cover || book.coverImage || "").trim().toLowerCase();

  return title === "side hustles for students"
    && subcategory === "free preview"
    && cover.includes("ebook_ai.png");
}

function legacyBuildProductCard(book) {
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

function buildProductCard(book, options = {}, index = 0) {
  const { variant = "catalog", spotlight = false } = options;
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
    ? `${ratingAverage.toFixed(1)} / 5 - ${ratingCount.toLocaleString("en-IN")} ${t("reviewsSuffix")}`
    : t("newListing");
  const authorMarkup = creatorLink
    ? `<a href="${creatorLink}" class="marketplace-link" style="padding:0;background:none;color:#d9ecff;">${escapeHTML(book.authorName || "Creator")}</a>`
    : escapeHTML(book.authorName || "Creator");
  const reason = String(book.recommendationReason || "").trim();
  const description = truncateText(
    book.description || `${book.type || "Digital product"} for ${book.category || "creators"}.`,
    spotlight ? 240 : 120
  );
  const kicker = book.isFeatured
    ? t("featuredPrefix")
    : variant === "personalized"
      ? t("aiRankedMatch")
      : t("marketplaceListing");
  const badgeValues = [
    book.type || "Product",
    book.category || "Book",
    book.language || "",
    book.subcategory || "",
    book.isPremium ? "Premium" : (!isPaid ? "Free" : ""),
  ].filter(Boolean);
  const visibleBadges = spotlight ? badgeValues.slice(0, 4) : badgeValues;
  const hiddenBadgeCount = Math.max(badgeValues.length - visibleBadges.length, 0);
  const statChips = [
    Number(book.salesCount || 0) > 0
      ? `${Number(book.salesCount || 0).toLocaleString("en-IN")} ${t("salesSuffix")}`
      : t("sortNewestStatus"),
    Number(book.views || 0) > 0
      ? `${Number(book.views || 0).toLocaleString("en-IN")} ${t("viewsSuffix")}`
      : `${book.language || "English"} ${t("readySuffix")}`,
    ratingCount > 0 ? `${ratingAverage.toFixed(1)} ${t("ratingChipSuffix")}` : `${book.type || "Product"}`,
  ];

  const card = document.createElement("article");
  card.className = `product-card${spotlight ? " is-spotlight" : ""} reveal-on-scroll`;
  card.style.setProperty("--reveal-delay", `${Math.min(index, 7) * 70}ms`);
  card.innerHTML = `
    <div class="product-cover">
      <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(book.title)}" />
    </div>
    <div class="product-body">
      <div class="product-badges">
        ${visibleBadges.map((badge) => {
          const safeBadge = String(badge || "");
          const modifiers = [
            safeBadge === "Premium" ? "premium" : "",
            safeBadge === "Free" ? "free" : "",
            safeBadge === (book.language || "") ? "language" : "",
          ].filter(Boolean).join(" ");
          return `<span class="product-badge${modifiers ? ` ${modifiers}` : ""}">${escapeHTML(safeBadge)}</span>`;
        }).join("")}
        ${hiddenBadgeCount > 0 ? `<span class="product-badge">+${hiddenBadgeCount}</span>` : ""}
      </div>
      <div class="product-copy">
        <div class="product-titlebar">
          <span class="product-kicker">${escapeHTML(kicker)}</span>
          <button class="product-save-btn${isBookSaved(book._id) ? " is-saved" : ""}" type="button" data-save-product="${escapeAttribute(book._id)}">${escapeHTML(isBookSaved(book._id) ? t("savedProduct") : t("saveProduct"))}</button>
        </div>
        <h3>${escapeHTML(book.title)}</h3>
        <p class="product-seller">${escapeHTML(book.bookAuthor || `${book.type || "Digital product"} by creator`)} - Sold by ${authorMarkup}</p>
        <p class="product-description">${escapeHTML(description)}</p>
      </div>
      ${reason ? `<div class="product-reason${spotlight ? " compact" : ""}">${escapeHTML(reason)}</div>` : ""}
      <div class="product-signal-row">
        ${statChips.map((chip) => `<span class="product-signal">${escapeHTML(chip)}</span>`).join("")}
      </div>
      <div class="product-meta">
        <div class="price-stack">
          <strong>${isPaid ? `Rs. ${salePrice.toLocaleString("en-IN")}` : escapeHTML(t("freeAccess"))}</strong>
          ${isPaid && originalPrice > salePrice ? `<span>Rs. ${originalPrice.toLocaleString("en-IN")}</span>` : ""}
        </div>
        <span class="marketplace-chip subtle">${escapeHTML(book.isFeatured ? `${t("featuredPrefix")} - ${ratingSignal}` : ratingSignal)}</span>
      </div>
      <div class="product-actions">
        <a class="marketplace-ghost-button" href="book_view.html?id=${encodeURIComponent(book._id)}" data-open-product="${escapeAttribute(book._id)}">${escapeHTML(t("viewDetails"))}</a>
        ${isPaid
          ? `<button class="marketplace-button" type="button" data-add-cart="${escapeAttribute(book._id)}">${escapeHTML(token ? t("addToCart") : t("signInToBuy"))}</button>`
          : `<a class="marketplace-button" href="book_view.html?id=${encodeURIComponent(book._id)}" data-open-product="${escapeAttribute(book._id)}">${escapeHTML(t("openFreeProduct"))}</a>`
        }
      </div>
    </div>
  `;

  card.querySelectorAll("[data-open-product]").forEach((link) => {
    link.addEventListener("click", () => recordProductView(book));
  });
  card.querySelector("[data-save-product]")?.addEventListener("click", () => toggleSavedBook(book));
  card.querySelector("[data-add-cart]")?.addEventListener("click", () => addToCart(book._id));
  return card;
}

function truncateText(value, maxLength = 120) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(maxLength - 3, 0)).trimEnd()}...`;
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
    if (typeof shell.setVisibleCartCount === "function" && Number.isFinite(Number(data.cartCount))) {
      shell.setVisibleCartCount(Number(data.cartCount));
    } else if (data.added !== false) {
      bumpVisibleCartCount(1);
    }
    await shell.refreshCartCount?.();
    shell.refreshNotifications?.();
    setTimeout(() => {
      renderCommandDeck();
    }, 200);
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

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
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
