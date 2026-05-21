const VALID_GOOGLE_ROLES = new Set(["reader", "creator", "author"]);

function normalizeGoogleRole(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_GOOGLE_ROLES.has(normalized) ? normalized : "";
}

function normalizeGoogleReferralCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}

function buildGoogleAuthState(returnTo = "", role = "", referralCode = "") {
  return encodeURIComponent(JSON.stringify({
    returnTo: String(returnTo || "").trim(),
    role: normalizeGoogleRole(role) || undefined,
    referralCode: normalizeGoogleReferralCode(referralCode) || undefined,
  }));
}

function parseGoogleAuthState(input = "") {
  let decodedValue = String(input || "").trim();

  try {
    decodedValue = decodeURIComponent(decodedValue);
  } catch {
    decodedValue = String(input || "").trim();
  }

  if (!decodedValue) {
    return {
      returnTo: "",
      role: "",
      referralCode: "",
    };
  }

  try {
    const parsed = JSON.parse(decodedValue);
    if (parsed && typeof parsed === "object") {
      return {
        returnTo: String(parsed.returnTo || "").trim(),
        role: normalizeGoogleRole(parsed.role),
        referralCode: normalizeGoogleReferralCode(parsed.referralCode),
      };
    }
  } catch {
    // Backward compatibility: older flows stored only the return URL in state.
  }

  return {
    returnTo: decodedValue,
    role: "",
    referralCode: "",
  };
}

module.exports = {
  buildGoogleAuthState,
  normalizeGoogleRole,
  parseGoogleAuthState,
};
