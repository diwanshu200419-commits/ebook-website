const BASE_CURRENCY = "INR";

const CURRENCY_CONFIG = {
  INR: {
    code: "INR",
    symbol: "₹",
    locale: "en-IN",
    defaultRate: 1,
    envKey: "",
  },
  USD: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    defaultRate: 0.012,
    envKey: "FX_RATE_USD",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    locale: "en-GB",
    defaultRate: 0.0095,
    envKey: "FX_RATE_GBP",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    locale: "de-DE",
    defaultRate: 0.011,
    envKey: "FX_RATE_EUR",
  },
  AED: {
    code: "AED",
    symbol: "AED",
    locale: "en-AE",
    defaultRate: 0.044,
    envKey: "FX_RATE_AED",
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    locale: "en-SG",
    defaultRate: 0.016,
    envKey: "FX_RATE_SGD",
  },
};

const MARKET_CONFIG = {
  IN: {
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    locale: "en-IN",
    manualCheckoutEnabled: true,
    primaryCheckout: "manual_or_stripe",
    headline: "UPI-first with manual proof support",
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    locale: "en-US",
    manualCheckoutEnabled: false,
    primaryCheckout: "stripe",
    headline: "Card-first global checkout",
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    locale: "en-GB",
    manualCheckoutEnabled: false,
    primaryCheckout: "stripe",
    headline: "Card-first global checkout",
  },
  DE: {
    countryCode: "DE",
    countryName: "Euro Area",
    currency: "EUR",
    locale: "de-DE",
    manualCheckoutEnabled: false,
    primaryCheckout: "stripe",
    headline: "Card-first global checkout",
  },
  AE: {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    locale: "en-AE",
    manualCheckoutEnabled: false,
    primaryCheckout: "stripe",
    headline: "Card-first global checkout",
  },
  SG: {
    countryCode: "SG",
    countryName: "Singapore",
    currency: "SGD",
    locale: "en-SG",
    manualCheckoutEnabled: false,
    primaryCheckout: "stripe",
    headline: "Card-first global checkout",
  },
};

const MARKET_ALIASES = {
  UK: "GB",
  ENGLAND: "GB",
  BRITAIN: "GB",
  EUROPE: "DE",
  EU: "DE",
  UAE: "AE",
};

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function readEnvRate(envKey, fallbackRate) {
  if (!envKey) {
    return fallbackRate;
  }

  const raw = Number(process.env[envKey] || fallbackRate);
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallbackRate;
  }

  return raw;
}

function hasConfiguredFxRates() {
  return Object.values(CURRENCY_CONFIG).some((entry) => (
    entry.envKey && String(process.env[entry.envKey] || "").trim()
  ));
}

function normalizeMarketCountry(country) {
  const normalized = String(country || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "IN";
  }

  if (MARKET_CONFIG[normalized]) {
    return normalized;
  }

  return MARKET_ALIASES[normalized] || "IN";
}

function normalizeCurrency(currency) {
  const normalized = String(currency || "")
    .trim()
    .toUpperCase();

  return CURRENCY_CONFIG[normalized] ? normalized : "";
}

function getCurrencyConfig(currency) {
  return CURRENCY_CONFIG[normalizeCurrency(currency) || BASE_CURRENCY] || CURRENCY_CONFIG[BASE_CURRENCY];
}

function getFxRate(currency) {
  const config = getCurrencyConfig(currency);
  return readEnvRate(config.envKey, config.defaultRate);
}

function formatMoney(amount, currency = BASE_CURRENCY, locale) {
  const currencyConfig = getCurrencyConfig(currency);
  const formatterLocale = locale || currencyConfig.locale || "en-IN";

  try {
    return new Intl.NumberFormat(formatterLocale, {
      style: "currency",
      currency: currencyConfig.code,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${currencyConfig.symbol} ${Number(amount || 0).toFixed(2)}`;
  }
}

function convertInrAmount(amountInInr, currency = BASE_CURRENCY) {
  const normalizedAmount = Number(amountInInr || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return 0;
  }

  if (normalizeCurrency(currency) === BASE_CURRENCY) {
    return roundMoney(normalizedAmount);
  }

  return roundMoney(normalizedAmount * getFxRate(currency));
}

function toMinorUnits(amount, currency = BASE_CURRENCY) {
  const normalizedAmount = Number(amount || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
    return 0;
  }

  return Math.max(0, Math.round(normalizedAmount * 100));
}

function buildMarketPayload(marketConfig, currencyCode) {
  const currency = getCurrencyConfig(currencyCode || marketConfig.currency);
  const resolvedCurrency = currency.code;
  const fxRate = getFxRate(resolvedCurrency);
  const manualNote = marketConfig.manualCheckoutEnabled
    ? "Manual screenshot approval and UPI checkout are available for this market."
    : "Manual screenshot approval is disabled for this market. Use Stripe card checkout for instant unlocks.";
  const taxNote = marketConfig.countryCode === "IN"
    ? "Manual proof orders stay India-first. Card taxes can still be calculated in Stripe when enabled."
    : "International taxes and billing details are handled at Stripe checkout when automatic tax is enabled.";

  return {
    countryCode: marketConfig.countryCode,
    countryName: marketConfig.countryName,
    currency: resolvedCurrency,
    currencySymbol: currency.symbol,
    locale: marketConfig.locale || currency.locale,
    headline: marketConfig.headline,
    conversionRateFromInr: fxRate,
    baseCurrency: BASE_CURRENCY,
    manualCheckoutEnabled: Boolean(marketConfig.manualCheckoutEnabled),
    primaryCheckout: marketConfig.primaryCheckout,
    manualCheckoutNote: manualNote,
    taxNote,
    fxSource: hasConfiguredFxRates() ? "configured" : "seed-defaults",
  };
}

function getSupportedMarkets() {
  return Object.values(MARKET_CONFIG).map((market) => buildMarketPayload(market, market.currency));
}

function resolveMarket(selection = {}) {
  const normalizedCountry = normalizeMarketCountry(selection.country || selection.countryCode);
  const configuredMarket = MARKET_CONFIG[normalizedCountry] || MARKET_CONFIG.IN;
  const requestedCurrency = normalizeCurrency(selection.currency);

  return buildMarketPayload(
    configuredMarket,
    requestedCurrency || configuredMarket.currency
  );
}

function buildCheckoutAmount(amountInInr, selection = {}) {
  const market = resolveMarket(selection);
  const convertedAmount = convertInrAmount(amountInInr, market.currency);

  return {
    market,
    baseAmountInInr: roundMoney(amountInInr),
    displayAmount: convertedAmount,
    displayMinorAmount: toMinorUnits(convertedAmount, market.currency),
    displayAmountFormatted: formatMoney(convertedAmount, market.currency, market.locale),
    baseAmountFormatted: formatMoney(amountInInr, BASE_CURRENCY, "en-IN"),
  };
}

function buildManualPaymentMethods() {
  return {
    UPI: {
      label: "UPI Payment",
      details: "Pay using any UPI app and upload the payment screenshot for admin verification.",
      upiId: process.env.STORE_UPI_ID || "",
      qrImage: process.env.STORE_UPI_QR || "assets/payment/gpay-qr.PNG",
    },
    GPay: {
      label: "Google Pay",
      details: "Scan the Google Pay QR and upload the payment screenshot after paying.",
      upiId: process.env.STORE_GPAY_UPI_ID || process.env.STORE_UPI_ID || "",
      qrImage: process.env.STORE_GPAY_QR || "assets/payment/gpay-qr.PNG",
    },
    PayPal: {
      label: "PayPal",
      details: "Scan the PayPal QR and upload the payment screenshot after paying.",
      upiId: "",
      qrImage: process.env.STORE_PAYPAL_QR || "assets/payment/paypal-qr.PNG",
    },
  };
}

function hasStripeEnabled() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  return Boolean(key) && key !== "sk_test_dummy";
}

function hasAutomaticTaxEnabled() {
  return String(process.env.STRIPE_AUTOMATIC_TAX || "")
    .trim()
    .toLowerCase() === "true";
}

function getPaymentConfig(selection = {}) {
  const selectedMarket = resolveMarket(selection);

  return {
    methods: buildManualPaymentMethods(),
    defaultMarket: resolveMarket({ country: "IN" }),
    selectedMarket,
    supportedMarkets: getSupportedMarkets(),
    pricing: {
      baseCurrency: BASE_CURRENCY,
      fxSource: selectedMarket.fxSource,
      note: "International checkout prices are converted from INR base prices using the platform FX settings.",
    },
    stripe: {
      enabled: hasStripeEnabled(),
      automaticTaxEnabled: hasAutomaticTaxEnabled(),
      note: hasAutomaticTaxEnabled()
        ? "Taxes and billing address collection are handled inside Stripe."
        : "Stripe checkout is enabled, but automatic tax is currently off.",
    },
    manualCheckout: {
      enabled: selectedMarket.manualCheckoutEnabled,
      note: selectedMarket.manualCheckoutNote,
      recommendedCountryCode: "IN",
    },
  };
}

module.exports = {
  BASE_CURRENCY,
  buildCheckoutAmount,
  convertInrAmount,
  formatMoney,
  getPaymentConfig,
  getSupportedMarkets,
  hasAutomaticTaxEnabled,
  hasStripeEnabled,
  normalizeCurrency,
  normalizeMarketCountry,
  resolveMarket,
  roundMoney,
  toMinorUnits,
};
