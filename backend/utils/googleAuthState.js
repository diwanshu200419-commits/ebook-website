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
  let candidate = String(input || "").trim();

  if (!candidate) {
    return {
      returnTo: "",
      role: "",
      referralCode: "",
    };
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return {
          returnTo: String(parsed.returnTo || "").trim(),
          role: normalizeGoogleRole(parsed.role),
          referralCode: normalizeGoogleReferralCode(parsed.referralCode),
        };
      }
    } catch {
      // Keep trying after decoding below.
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (!decoded || decoded === candidate) {
        break;
      }
      candidate = decoded;
    } catch {
      break;
    }
  }

  return {
    returnTo: candidate,
    role: "",
    referralCode: "",
  };
}

module.exports = {
  buildGoogleAuthState,
  normalizeGoogleRole,
  parseGoogleAuthState,
};
