const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ebook_auth_token";

const isProduction = () => process.env.NODE_ENV === "production";

const getTokenLifetimeMs = (value) => {
  const normalized = String(value || "7d").trim().toLowerCase();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) * 1000;
  }

  const match = normalized.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * unitMap[unit];
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? "none" : "lax",
  path: "/",
  maxAge: getTokenLifetimeMs(process.env.JWT_EXPIRE)
});

const readCookieValue = (req, cookieName = AUTH_COOKIE_NAME) => {
  const rawHeader = req.headers.cookie || "";
  const cookies = rawHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of cookies) {
    const separatorIndex = chunk.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = chunk.slice(0, separatorIndex).trim();
    if (name !== cookieName) continue;

    return decodeURIComponent(chunk.slice(separatorIndex + 1));
  }

  return "";
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/"
  });
};

module.exports = {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  readCookieValue,
  setAuthCookie
};
