const crypto = require("crypto");

function getAssetTokenSecret() {
  return String(process.env.ASSET_TOKEN_SECRET || process.env.JWT_SECRET || "").trim();
}

function toBase64Url(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function signValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeExpectedMatch(expectedValue, actualValue) {
  if (expectedValue === undefined || expectedValue === null || expectedValue === "") {
    return true;
  }

  return String(expectedValue) === String(actualValue);
}

function createAssetToken(payload = {}, expiresInSeconds = 900) {
  const secret = getAssetTokenSecret();
  if (!secret) {
    return "";
  }

  const now = Math.floor(Date.now() / 1000);
  const safeExpiry = Math.max(parseInt(expiresInSeconds, 10) || 0, 30);
  const envelope = {
    ...payload,
    iat: now,
    exp: now + safeExpiry,
    nonce: crypto.randomBytes(8).toString("hex"),
    v: 1,
  };

  const encodedPayload = toBase64Url(JSON.stringify(envelope));
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function verifyAssetToken(token, expected = {}) {
  const secret = getAssetTokenSecret();
  if (!secret || !token) {
    return null;
  }

  const separatorIndex = String(token).lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const encodedPayload = String(token).slice(0, separatorIndex);
  const signature = String(token).slice(separatorIndex + 1);
  const expectedSignature = signValue(encodedPayload, secret);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.exp || Number(payload.exp) < now) {
    return null;
  }

  if (!normalizeExpectedMatch(expected.resource, payload.resource)) {
    return null;
  }

  if (!normalizeExpectedMatch(expected.kind, payload.kind)) {
    return null;
  }

  if (!normalizeExpectedMatch(expected.bookId, payload.bookId)) {
    return null;
  }

  return payload;
}

module.exports = {
  createAssetToken,
  verifyAssetToken,
};
