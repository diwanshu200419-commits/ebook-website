const VALID_GOOGLE_ROLES = new Set(["reader", "creator", "author"]);

function normalizeGoogleRole(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_GOOGLE_ROLES.has(normalized) ? normalized : "";
}

function buildGoogleAuthState(returnTo = "", role = "") {
  return encodeURIComponent(JSON.stringify({
    returnTo: String(returnTo || "").trim(),
    role: normalizeGoogleRole(role) || undefined,
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
    };
  }

  try {
    const parsed = JSON.parse(decodedValue);
    if (parsed && typeof parsed === "object") {
      return {
        returnTo: String(parsed.returnTo || "").trim(),
        role: normalizeGoogleRole(parsed.role),
      };
    }
  } catch {
    // Backward compatibility: older flows stored only the return URL in state.
  }

  return {
    returnTo: decodedValue,
    role: "",
  };
}

module.exports = {
  buildGoogleAuthState,
  normalizeGoogleRole,
  parseGoogleAuthState,
};
