const API_BASE = window.API_BASE || "";
const FALLBACK_AVATAR = "../assets/default-avatar.png";

const state = {
  token: localStorage.getItem("token") || "",
  profile: null,
  creatorProfile: null,
  selectedProfileImage: null,
  selectedBannerImage: null,
};

const elements = {
  previewProfileLink: document.getElementById("previewProfileLink"),
  activateCreatorBtn: document.getElementById("activateCreatorBtn"),
  accountRole: document.getElementById("accountRole"),
  followerCount: document.getElementById("followerCount"),
  creatorBookCount: document.getElementById("creatorBookCount"),
  accountEarnings: document.getElementById("accountEarnings"),
  accountBadge: document.getElementById("accountBadge"),
  profilePreview: document.getElementById("profilePreview"),
  bannerPreview: document.getElementById("bannerPreview"),
  displayNamePreview: document.getElementById("displayNamePreview"),
  usernamePreview: document.getElementById("usernamePreview"),
  bioPreview: document.getElementById("bioPreview"),
  previewFollowers: document.getElementById("previewFollowers"),
  previewDownloads: document.getElementById("previewDownloads"),
  previewViews: document.getElementById("previewViews"),
  fullName: document.getElementById("fullName"),
  email: document.getElementById("email"),
  username: document.getElementById("username"),
  website: document.getElementById("website"),
  bio: document.getElementById("bio"),
  about: document.getElementById("about"),
  creatorCategories: document.getElementById("creatorCategories"),
  specialties: document.getElementById("specialties"),
  twitter: document.getElementById("twitter"),
  instagram: document.getElementById("instagram"),
  linkedin: document.getElementById("linkedin"),
  youtube: document.getElementById("youtube"),
  upiId: document.getElementById("upiId"),
  bankAccount: document.getElementById("bankAccount"),
  ifscCode: document.getElementById("ifscCode"),
  payoutStatusText: document.getElementById("payoutStatusText"),
  referralCodeText: document.getElementById("referralCodeText"),
  referredByText: document.getElementById("referredByText"),
  referralSignupCount: document.getElementById("referralSignupCount"),
  referralCreatorCount: document.getElementById("referralCreatorCount"),
  referralLink: document.getElementById("referralLink"),
  copyReferralBtn: document.getElementById("copyReferralBtn"),
  verificationBadge: document.getElementById("verificationBadge"),
  verificationHeadline: document.getElementById("verificationHeadline"),
  verificationSummary: document.getElementById("verificationSummary"),
  verificationAdminNote: document.getElementById("verificationAdminNote"),
  verificationPortfolio: document.getElementById("verificationPortfolio"),
  verificationProof: document.getElementById("verificationProof"),
  verificationNote: document.getElementById("verificationNote"),
  followingCount: document.getElementById("followingCount"),
  totalSales: document.getElementById("totalSales"),
  totalDownloads: document.getElementById("totalDownloads"),
  totalViews: document.getElementById("totalViews"),
  profileMsg: document.getElementById("profileMsg"),
  passwordMsg: document.getElementById("passwordMsg"),
  payoutMsg: document.getElementById("payoutMsg"),
  referralMsg: document.getElementById("referralMsg"),
  verificationMsg: document.getElementById("verificationMsg"),
  preferencesMsg: document.getElementById("preferencesMsg"),
  deleteMsg: document.getElementById("deleteMsg"),
  profileForm: document.getElementById("profileForm"),
  passwordForm: document.getElementById("passwordForm"),
  payoutForm: document.getElementById("payoutForm"),
  preferencesForm: document.getElementById("preferencesForm"),
  verificationForm: document.getElementById("verificationForm"),
  profileImage: document.getElementById("profileImage"),
  bannerImage: document.getElementById("bannerImage"),
  profileSelectBtn: document.getElementById("profileSelectBtn"),
  bannerSelectBtn: document.getElementById("bannerSelectBtn"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  interfaceLanguage: document.getElementById("interfaceLanguage"),
  marketplaceLanguage: document.getElementById("marketplaceLanguage"),
  notifEmail: document.getElementById("notifEmail"),
  notifSales: document.getElementById("notifSales"),
  notifFollows: document.getElementById("notifFollows"),
  notifReleases: document.getElementById("notifReleases"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  updatePasswordBtn: document.getElementById("updatePasswordBtn"),
  savePayoutBtn: document.getElementById("savePayoutBtn"),
  savePreferencesBtn: document.getElementById("savePreferencesBtn"),
  submitVerificationBtn: document.getElementById("submitVerificationBtn"),
  deleteAccountBtn: document.getElementById("deleteAccountBtn"),
};

document.addEventListener("DOMContentLoaded", initSettings);

async function initSettings() {
  if (!state.token) {
    window.location.href = "../login.html";
    return;
  }

  bindEvents();
  initCursorGlow();
  initMagneticButtons();
  await loadSettingsData();
}

function bindEvents() {
  elements.profileForm?.addEventListener("submit", updateProfile);
  elements.passwordForm?.addEventListener("submit", changePassword);
  elements.payoutForm?.addEventListener("submit", savePayout);
  elements.preferencesForm?.addEventListener("submit", savePreferences);
  elements.verificationForm?.addEventListener("submit", submitVerificationRequest);
  elements.deleteAccountBtn?.addEventListener("click", deleteAccount);
  elements.activateCreatorBtn?.addEventListener("click", activateCreatorMode);
  elements.copyReferralBtn?.addEventListener("click", copyReferralLink);

  elements.profileSelectBtn?.addEventListener("click", () => elements.profileImage?.click());
  elements.bannerSelectBtn?.addEventListener("click", () => elements.bannerImage?.click());

  elements.profileImage?.addEventListener("change", handleProfileImageSelect);
  elements.bannerImage?.addEventListener("change", handleBannerImageSelect);

  [
    elements.fullName,
    elements.bio,
    elements.username,
  ].forEach((input) => {
    input?.addEventListener("input", renderLivePreview);
  });
}

async function loadSettingsData() {
  try {
    const [profileResponse, creatorResponse] = await Promise.all([
      apiFetch("/api/profile/me"),
      apiFetch("/api/creator/me/profile"),
    ]);

    state.profile = profileResponse.user || {};
    state.creatorProfile = {
      ...(creatorResponse.creator || {}),
      verification: creatorResponse.verification || {},
      growth: creatorResponse.growth || {},
      payout: creatorResponse.payout || {},
      notifications: creatorResponse.notifications || {},
    };

    renderSettings();
  } catch (error) {
    console.error("Settings load failed:", error);
    localStorage.clear();
    window.location.href = "../login.html";
  }
}

function renderSettings() {
  const user = state.profile || {};
  const creator = state.creatorProfile || {};
  const stats = creator.stats || {};
  const growth = state.creatorProfile?.growth || {};
  const verification = normalizeVerificationState(state.creatorProfile?.verification, user);
  const preferences = normalizePreferences(user);
  const notifications = normalizeNotifications(user.notifications || creator.notifications);

  elements.fullName.value = user.name || creator.name || "";
  elements.email.value = user.email || "";
  elements.username.value = user.username || creator.username || "";
  elements.website.value = creator.website || user.website || "";
  elements.bio.value = user.bio || creator.bio || "";
  elements.about.value = creator.about || user.about || "";
  elements.creatorCategories.value = joinList(creator.creatorCategories || user.creatorCategories || []);
  elements.specialties.value = joinList(creator.specialties || user.specialties || []);
  elements.twitter.value = creator.socialLinks?.twitter || user.socialLinks?.twitter || "";
  elements.instagram.value = creator.socialLinks?.instagram || user.socialLinks?.instagram || "";
  elements.linkedin.value = creator.socialLinks?.linkedin || user.socialLinks?.linkedin || "";
  elements.youtube.value = creator.socialLinks?.youtube || user.socialLinks?.youtube || "";

  elements.upiId.value = user.payout?.upiId || "";
  elements.bankAccount.value = user.payout?.bankAccount || "";
  elements.ifscCode.value = user.payout?.ifscCode || "";
  elements.interfaceLanguage.value = preferences.interfaceLanguage;
  elements.marketplaceLanguage.value = preferences.marketplaceLanguage;
  elements.notifEmail.checked = notifications.email;
  elements.notifSales.checked = notifications.sales;
  elements.notifFollows.checked = notifications.follows;
  elements.notifReleases.checked = notifications.releases;
  elements.referralCodeText.textContent = user.referralCode || growth.referralCode || "Pending";
  elements.referralSignupCount.textContent = formatNumber(growth.referralStats?.signupsCount || user.referralStats?.signupsCount || 0);
  elements.referralCreatorCount.textContent = formatNumber(growth.referralStats?.creatorsCount || user.referralStats?.creatorsCount || 0);
  elements.referredByText.textContent = growth.referredBy?.username
    ? `Referred by @${growth.referredBy.username}`
    : user.referredBy?.username
      ? `Referred by @${user.referredBy.username}`
      : "No referral connection yet.";
  elements.referralLink.value = buildReferralLink(user.referralCode || growth.referralCode || "");
  elements.verificationPortfolio.value = verification.portfolioUrl || "";
  elements.verificationProof.value = verification.proofUrl || "";
  elements.verificationNote.value = verification.note || "";

  const avatar = resolveAssetUrl(creator.avatarUrl || user.profileImage || "", FALLBACK_AVATAR);
  elements.profilePreview.src = avatar;

  const banner = resolveAssetUrl(creator.bannerUrl || user.bannerImage || "", "");
  if (banner) {
    elements.bannerPreview.style.backgroundImage = `linear-gradient(135deg, rgba(15, 21, 48, 0.88), rgba(18, 14, 45, 0.56)), url("${escapeAttribute(banner)}")`;
  }

  elements.accountRole.textContent = formatRole(user.role || creator.role || "reader");
  elements.followerCount.textContent = formatNumber(stats.followersCount || 0);
  elements.creatorBookCount.textContent = formatNumber(stats.totalBooks || 0);
  elements.accountEarnings.textContent = formatCurrency(
    Number(stats.totalEarnings || 0) + Number(growth.referralStats?.totalRewardAmount || user.referralStats?.totalRewardAmount || 0)
  );
  elements.followingCount.textContent = formatNumber(stats.followingCount || 0);
  elements.totalSales.textContent = formatNumber(stats.totalSales || 0);
  elements.totalDownloads.textContent = formatNumber(stats.totalDownloads || 0);
  elements.totalViews.textContent = formatNumber(stats.totalViews || 0);

  const payoutConfigured = Boolean(user.payout?.upiId || user.payout?.bankAccount);
  elements.payoutStatusText.value = payoutConfigured
    ? "Manual payout configured"
    : "Manual payout not set";

  const isCreator = ["creator", "author", "admin"].includes(String(user.role || "").toLowerCase());
  elements.accountBadge.textContent = user.verified
    ? "Verified creator"
    : verification.status === "pending"
      ? "Verification pending"
      : isCreator
        ? "Creator mode live"
        : "Reader mode";
  elements.activateCreatorBtn.classList.toggle("hidden", isCreator);

  const publicProfileHref = user.username
    ? `../creator/creator.html?username=${encodeURIComponent(user.username)}`
    : "";
  if (publicProfileHref) {
    elements.previewProfileLink.href = publicProfileHref;
    elements.previewProfileLink.classList.remove("hidden");
  } else {
    elements.previewProfileLink.classList.add("hidden");
  }

  renderLivePreview();
  renderVerificationStatus(verification, isCreator);
  persistMarketplacePreferences(preferences);
  persistUserSnapshot(user);
}

async function updateProfile(event) {
  event.preventDefault();
  setButtonLoading(elements.saveProfileBtn, true, "Saving...");

  try {
    const formData = new FormData();
    formData.append("name", elements.fullName.value.trim());
    formData.append("bio", elements.bio.value.trim());
    formData.append("about", elements.about.value.trim());
    formData.append("website", elements.website.value.trim());
    formData.append("creatorCategories", elements.creatorCategories.value.trim());
    formData.append("specialties", elements.specialties.value.trim());
    formData.append("twitter", elements.twitter.value.trim());
    formData.append("instagram", elements.instagram.value.trim());
    formData.append("linkedin", elements.linkedin.value.trim());
    formData.append("youtube", elements.youtube.value.trim());

    if (state.selectedProfileImage) {
      formData.append("profileImage", state.selectedProfileImage);
    }
    if (state.selectedBannerImage) {
      formData.append("bannerImage", state.selectedBannerImage);
    }

    const response = await fetch(`${API_BASE}/api/creator/me/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to save creator profile");
    }

    state.creatorProfile = {
      ...(state.creatorProfile || {}),
      ...(data.creator || {}),
    };
    state.profile = {
      ...(state.profile || {}),
      name: data.creator?.name || elements.fullName.value.trim(),
      bio: data.creator?.bio || elements.bio.value.trim(),
      about: data.creator?.about || elements.about.value.trim(),
      website: data.creator?.website || elements.website.value.trim(),
      profileImage: data.creator?.avatar || state.profile?.profileImage || "",
      bannerImage: data.creator?.bannerImage || state.profile?.bannerImage || "",
      creatorCategories: data.creator?.creatorCategories || parseList(elements.creatorCategories.value),
      specialties: data.creator?.specialties || parseList(elements.specialties.value),
      socialLinks: data.creator?.socialLinks || {},
    };
    state.selectedProfileImage = null;
    state.selectedBannerImage = null;
    if (elements.profileImage) elements.profileImage.value = "";
    if (elements.bannerImage) elements.bannerImage.value = "";

    renderSettings();
    showMessage(elements.profileMsg, "Creator profile updated successfully.");
  } catch (error) {
    showMessage(elements.profileMsg, error.message || "Unable to update creator profile", "error");
  } finally {
    setButtonLoading(elements.saveProfileBtn, false);
  }
}

async function activateCreatorMode() {
  setButtonLoading(elements.activateCreatorBtn, true, "Activating...");

  try {
    const response = await fetch(`${API_BASE}/api/creator/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to activate creator mode");
    }

    state.profile = {
      ...(state.profile || {}),
      role: data.role || "creator",
    };
    await loadSettingsData();
    showMessage(elements.profileMsg, "Creator mode is active. You can now publish and build a public creator profile.");
  } catch (error) {
    showMessage(elements.profileMsg, error.message || "Unable to activate creator mode", "error");
  } finally {
    setButtonLoading(elements.activateCreatorBtn, false);
  }
}

async function submitVerificationRequest(event) {
  event.preventDefault();

  const role = String(state.profile?.role || "").toLowerCase();
  if (!["creator", "author", "admin"].includes(role)) {
    showMessage(elements.verificationMsg, "Activate creator mode first, then submit verification.", "error");
    return;
  }

  setButtonLoading(elements.submitVerificationBtn, true, "Submitting...");

  try {
    const response = await fetch(`${API_BASE}/api/creator/me/verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({
        portfolioUrl: elements.verificationPortfolio.value.trim(),
        proofUrl: elements.verificationProof.value.trim(),
        note: elements.verificationNote.value.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to submit verification request");
    }

    state.creatorProfile = {
      ...(state.creatorProfile || {}),
      verification: data.verification || {},
    };
    renderSettings();
    showMessage(elements.verificationMsg, data.message || "Verification request submitted.");
  } catch (error) {
    showMessage(elements.verificationMsg, error.message || "Unable to submit verification request", "error");
  } finally {
    setButtonLoading(elements.submitVerificationBtn, false);
  }
}

async function copyReferralLink() {
  const link = elements.referralLink?.value || "";
  if (!link) {
    showMessage(elements.referralMsg, "Referral link is not ready yet.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    showMessage(elements.referralMsg, "Referral link copied.");
  } catch {
    if (elements.referralLink) {
      elements.referralLink.focus();
      elements.referralLink.select();
    }
    showMessage(elements.referralMsg, "Copy the link manually from the field above.");
  }
}

async function changePassword(event) {
  event.preventDefault();

  if (String(state.profile?.provider || "local") !== "local") {
    showMessage(elements.passwordMsg, "This account signs in with Google. Set password support first if needed.", "error");
    return;
  }

  const currentPassword = elements.currentPassword.value;
  const newPassword = elements.newPassword.value;

  if (newPassword.length < 6) {
    showMessage(elements.passwordMsg, "Password must be at least 6 characters.", "error");
    return;
  }

  setButtonLoading(elements.updatePasswordBtn, true, "Updating...");

  try {
    const response = await fetch(`${API_BASE}/api/user/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to update password");
    }

    elements.currentPassword.value = "";
    elements.newPassword.value = "";
    showMessage(elements.passwordMsg, "Password updated successfully.");
  } catch (error) {
    showMessage(elements.passwordMsg, error.message || "Unable to update password", "error");
  } finally {
    setButtonLoading(elements.updatePasswordBtn, false);
  }
}

async function savePayout(event) {
  event.preventDefault();
  setButtonLoading(elements.savePayoutBtn, true, "Saving...");

  try {
    const response = await fetch(`${API_BASE}/api/user/payout`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({
        upiId: elements.upiId.value.trim(),
        bankAccount: elements.bankAccount.value.trim(),
        ifscCode: elements.ifscCode.value.trim(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to save payout details");
    }

    state.profile = {
      ...(state.profile || {}),
      payout: data.payout || {},
    };
    elements.payoutStatusText.value = "Manual payout configured";
    showMessage(elements.payoutMsg, "Payout details saved successfully.");
  } catch (error) {
    showMessage(elements.payoutMsg, error.message || "Unable to save payout details", "error");
  } finally {
    setButtonLoading(elements.savePayoutBtn, false);
  }
}

async function savePreferences(event) {
  event.preventDefault();
  setButtonLoading(elements.savePreferencesBtn, true, "Saving...");

  try {
    const payload = {
      interfaceLanguage: elements.interfaceLanguage.value || "English",
      marketplaceLanguage: elements.marketplaceLanguage.value || "All",
      notifications: {
        email: Boolean(elements.notifEmail.checked),
        sales: Boolean(elements.notifSales.checked),
        follows: Boolean(elements.notifFollows.checked),
        releases: Boolean(elements.notifReleases.checked),
      },
    };

    const response = await fetch(`${API_BASE}/api/profile/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to update preferences");
    }

    state.profile = {
      ...(state.profile || {}),
      preferences: data.preferences || {
        interfaceLanguage: payload.interfaceLanguage,
        marketplaceLanguage: payload.marketplaceLanguage,
      },
      notifications: data.notifications || payload.notifications,
    };
    state.creatorProfile = {
      ...(state.creatorProfile || {}),
      notifications: data.notifications || payload.notifications,
    };

    persistMarketplacePreferences(state.profile.preferences);
    persistUserSnapshot(state.profile);
    showMessage(elements.preferencesMsg, data.message || "Preferences updated.");
  } catch (error) {
    showMessage(elements.preferencesMsg, error.message || "Unable to update preferences", "error");
  } finally {
    setButtonLoading(elements.savePreferencesBtn, false);
  }
}

async function deleteAccount() {
  const confirmed = window.confirm("Delete this account permanently?");
  if (!confirmed) {
    return;
  }

  setButtonLoading(elements.deleteAccountBtn, true, "Deleting...");

  try {
    const response = await fetch(`${API_BASE}/api/user`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${state.token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to delete account");
    }

    localStorage.clear();
    window.location.href = "../index.html";
  } catch (error) {
    showMessage(elements.deleteMsg, error.message || "Unable to delete account", "error");
  } finally {
    setButtonLoading(elements.deleteAccountBtn, false);
  }
}

function handleProfileImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  state.selectedProfileImage = file;
  const previewUrl = URL.createObjectURL(file);
  elements.profilePreview.src = previewUrl;
}

function handleBannerImageSelect(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  state.selectedBannerImage = file;
  const previewUrl = URL.createObjectURL(file);
  elements.bannerPreview.style.backgroundImage = `linear-gradient(135deg, rgba(15, 21, 48, 0.88), rgba(18, 14, 45, 0.56)), url("${escapeAttribute(previewUrl)}")`;
}

function renderLivePreview() {
  elements.displayNamePreview.textContent = elements.fullName.value.trim() || "Creator name";
  elements.usernamePreview.textContent = elements.username.value.trim()
    ? `@${elements.username.value.trim()}`
    : "@creator";
  elements.bioPreview.textContent = elements.bio.value.trim()
    || "Tell readers why your work matters and what they can expect from your catalog.";

  const stats = state.creatorProfile?.stats || {};
  elements.previewFollowers.textContent = `${formatNumber(stats.followersCount || 0)} followers`;
  elements.previewDownloads.textContent = `${formatNumber(stats.totalDownloads || 0)} downloads`;
  elements.previewViews.textContent = `${formatNumber(stats.totalViews || 0)} views`;
}

function persistUserSnapshot(user) {
  let existing = {};

  try {
    existing = JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    existing = {};
  }

  const stored = {
    ...existing,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    verified: Boolean(user.verified),
    referralCode: user.referralCode || "",
    preferences: normalizePreferences(user),
  };
  localStorage.setItem("user", JSON.stringify(stored));
}

async function apiFetch(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${state.token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function joinList(items) {
  return (Array.isArray(items) ? items : []).filter(Boolean).join(", ");
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setButtonLoading(button, loading, text = "Saving...") {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function showMessage(element, message, type = "success") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-message ${type}`;

  window.clearTimeout(element._messageTimer);
  element._messageTimer = window.setTimeout(() => {
    element.textContent = "";
    element.className = "form-message";
  }, 4200);
}

function resolveAssetUrl(value, fallback = "") {
  const source = String(value || "").trim();
  if (!source) {
    return fallback;
  }

  const repaired = source.replace(
    /^(https?:\/\/[^/]+)(assets\/|uploads\/)/i,
    "$1/$2"
  );

  if (/^(https?:|data:|\.\.\/|\.\/|\/assets\/|blob:)/i.test(repaired)) {
    return repaired;
  }

  if (/^assets\//i.test(repaired)) {
    return `/${repaired}`;
  }

  if (repaired.startsWith("/uploads")) {
    return `${API_BASE}${repaired}`;
  }

  if (/^uploads\//i.test(repaired)) {
    return `${API_BASE}/${repaired}`;
  }

  return repaired;
}

function formatRole(role) {
  const normalized = String(role || "reader");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function normalizePreferences(user) {
  const source = user && typeof user === "object" ? user : {};
  return {
    interfaceLanguage: source.preferences?.interfaceLanguage || "English",
    marketplaceLanguage: source.preferences?.marketplaceLanguage || "All",
  };
}

function normalizeNotifications(notifications) {
  const source = notifications && typeof notifications === "object" ? notifications : {};
  return {
    email: source.email !== false,
    sales: source.sales !== false,
    follows: source.follows !== false,
    releases: source.releases !== false,
  };
}

function persistMarketplacePreferences(preferences) {
  const safe = normalizePreferences({ preferences });
  localStorage.setItem("marketplace-interface-language", safe.interfaceLanguage);
  localStorage.setItem("marketplace-market-language", safe.marketplaceLanguage);
}

function normalizeVerificationState(verification, user) {
  const safeVerification = verification && typeof verification === "object" ? verification : {};
  const rawStatus = String(safeVerification.status || "").trim().toLowerCase();
  const status = user?.verified
    ? "approved"
    : rawStatus || "unverified";

  return {
    status,
    note: safeVerification.note || "",
    portfolioUrl: safeVerification.portfolioUrl || "",
    proofUrl: safeVerification.proofUrl || "",
    submittedAt: safeVerification.submittedAt || null,
    reviewedAt: safeVerification.reviewedAt || null,
    adminNote: safeVerification.adminNote || "",
  };
}

function renderVerificationStatus(verification, isCreator) {
  const statusMap = {
    approved: {
      badge: "Verified",
      headline: "Verification approved",
      summary: "Your public creator profile now carries a trust badge for buyers and collaborators.",
      noteClass: "approved",
      button: "Verified",
    },
    pending: {
      badge: "Pending",
      headline: "Verification in admin review",
      summary: "Your verification request is queued for manual review. Keep your profile and links up to date.",
      noteClass: "pending",
      button: "Resubmit verification",
    },
    rejected: {
      badge: "Needs changes",
      headline: "Verification needs stronger proof",
      summary: "Update your portfolio links and note, then resubmit to get back into the queue.",
      noteClass: "rejected",
      button: "Resubmit verification",
    },
    unverified: {
      badge: "Unverified",
      headline: isCreator ? "Submit your creator verification" : "Creator mode required",
      summary: isCreator
        ? "Share your proof of work, audience, or portfolio links to unlock a verified creator badge."
        : "Activate creator mode first, then submit verification from this page.",
      noteClass: "",
      button: "Submit verification request",
    },
  };

  const active = statusMap[verification.status] || statusMap.unverified;
  elements.verificationBadge.textContent = active.badge;
  elements.verificationHeadline.textContent = active.headline;
  elements.verificationSummary.textContent = active.summary;
  elements.submitVerificationBtn.textContent = active.button;
  elements.submitVerificationBtn.disabled = verification.status === "approved" || !isCreator;

  const adminNote = String(verification.adminNote || "").trim();
  if (adminNote) {
    elements.verificationAdminNote.textContent = adminNote;
    elements.verificationAdminNote.className = `verification-admin-note ${active.noteClass || ""}`;
    elements.verificationAdminNote.classList.remove("hidden");
  } else if (verification.status === "pending") {
    elements.verificationAdminNote.textContent = "No admin note yet. The verification team is reviewing your request.";
    elements.verificationAdminNote.className = "verification-admin-note pending";
    elements.verificationAdminNote.classList.remove("hidden");
  } else {
    elements.verificationAdminNote.textContent = "";
    elements.verificationAdminNote.className = "verification-admin-note hidden";
  }
}

function buildReferralLink(code) {
  const safeCode = String(code || "").trim();
  if (!safeCode) {
    return "";
  }

  return new URL(`../register.html?ref=${encodeURIComponent(safeCode)}`, window.location.href).href;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
}

function initCursorGlow() {
  const glow = document.querySelector(".cursor-glow");
  if (!glow) {
    return;
  }

  document.addEventListener("mousemove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

function initMagneticButtons() {
  document.querySelectorAll(".btn-primary").forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${offsetX * 0.06}px, ${offsetY * 0.06}px)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
    });
  });
}
