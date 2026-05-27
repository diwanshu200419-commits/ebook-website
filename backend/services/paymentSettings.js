const PaymentSettings = require("../models/PaymentSettings");
const { getPaymentConfig } = require("./globalMarkets");

const DEFAULT_METHODS = {
  UPI: {
    label: "UPI Payment",
    details: "Pay using any UPI app and upload the payment screenshot for admin verification.",
    upiId: "",
    qrImage: "",
  },
  GPay: {
    label: "Google Pay",
    details: "Scan the Google Pay QR and upload the payment screenshot after paying.",
    upiId: "",
    qrImage: "",
  },
  PayPal: {
    label: "PayPal",
    details: "Scan the PayPal QR and upload the payment screenshot after paying.",
    upiId: "",
    qrImage: "",
  },
};

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function buildSettingsSnapshot(settings = null) {
  return {
    merchantName: normalizeText(settings?.merchantName, "E-Book Market"),
    supportNote: normalizeText(settings?.supportNote),
    manualCheckoutEnabled: settings?.manualCheckoutEnabled !== false,
    methods: {
      UPI: {
        ...DEFAULT_METHODS.UPI,
        ...(settings?.methods?.UPI || {}),
      },
      GPay: {
        ...DEFAULT_METHODS.GPay,
        ...(settings?.methods?.GPay || {}),
      },
      PayPal: {
        ...DEFAULT_METHODS.PayPal,
        ...(settings?.methods?.PayPal || {}),
      },
    },
  };
}

async function getFounderPaymentSettings() {
  try {
    let settings = await PaymentSettings.findOne({ singletonKey: "default" });
    if (!settings) {
      settings = await PaymentSettings.create({ singletonKey: "default" });
    }

    return settings;
  } catch (error) {
    console.error("Get Founder Payment Settings Error:", error.message);
    return null;
  }
}

async function getFounderPaymentSettingsSnapshot(existingSettings = null) {
  const settings = existingSettings || await getFounderPaymentSettings();
  return buildSettingsSnapshot(settings);
}

async function updateFounderPaymentSettings(payload = {}) {
  let settings = await PaymentSettings.findOne({ singletonKey: "default" });
  if (!settings) {
    settings = new PaymentSettings({ singletonKey: "default" });
  }

  if (Object.prototype.hasOwnProperty.call(payload, "merchantName")) {
    settings.merchantName = normalizeText(payload.merchantName, "E-Book Market");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "supportNote")) {
    settings.supportNote = normalizeText(payload.supportNote);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "manualCheckoutEnabled")) {
    settings.manualCheckoutEnabled = payload.manualCheckoutEnabled !== false;
  }

  const nextMethods = payload.methods || {};
  ["UPI", "GPay", "PayPal"].forEach((methodKey) => {
    const source = nextMethods[methodKey];
    if (!source || typeof source !== "object") {
      return;
    }

    settings.methods = settings.methods || {};
    settings.methods[methodKey] = settings.methods[methodKey] || {};
    settings.methods[methodKey].label = normalizeText(source.label, DEFAULT_METHODS[methodKey].label);
    settings.methods[methodKey].details = normalizeText(source.details, DEFAULT_METHODS[methodKey].details);
    settings.methods[methodKey].upiId = normalizeText(source.upiId);
    settings.methods[methodKey].qrImage = normalizeText(source.qrImage);
  });

  await settings.save();
  return settings;
}

function applyFounderPaymentSettings(config, settingsSnapshot) {
  const baseConfig = JSON.parse(JSON.stringify(config || {}));
  const settings = buildSettingsSnapshot(settingsSnapshot);

  baseConfig.founder = {
    merchantName: settings.merchantName,
    supportNote: settings.supportNote,
  };

  baseConfig.methods = baseConfig.methods || {};
  ["UPI", "GPay", "PayPal"].forEach((methodKey) => {
    baseConfig.methods[methodKey] = {
      ...(baseConfig.methods[methodKey] || {}),
      ...settings.methods[methodKey],
    };
  });

  baseConfig.manualCheckout = {
    ...(baseConfig.manualCheckout || {}),
    enabled: Boolean(baseConfig.manualCheckout?.enabled) && settings.manualCheckoutEnabled,
    founderToggleEnabled: settings.manualCheckoutEnabled,
    note: settings.manualCheckoutEnabled
      ? (settings.supportNote || baseConfig.manualCheckout?.note || "")
      : "Manual proof checkout is currently paused by the founder settings. Use Stripe card checkout until it is re-enabled.",
  };

  return baseConfig;
}

async function buildRuntimePaymentConfig(selection = {}) {
  const baseConfig = getPaymentConfig(selection);
  const settingsSnapshot = await getFounderPaymentSettingsSnapshot();
  return applyFounderPaymentSettings(baseConfig, settingsSnapshot);
}

module.exports = {
  applyFounderPaymentSettings,
  buildRuntimePaymentConfig,
  buildSettingsSnapshot,
  getFounderPaymentSettings,
  getFounderPaymentSettingsSnapshot,
  updateFounderPaymentSettings,
};
