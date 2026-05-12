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
  followingCount: document.getElementById("followingCount"),
  totalSales: document.getElementById("totalSales"),
  totalDownloads: document.getElementById("totalDownloads"),
  totalViews: document.getElementById("totalViews"),
  profileMsg: document.getElementById("profileMsg"),
  passwordMsg: document.getElementById("passwordMsg"),
  payoutMsg: document.getElementById("payoutMsg"),
  deleteMsg: document.getElementById("deleteMsg"),
  profileForm: document.getElementById("profileForm"),
  passwordForm: document.getElementById("passwordForm"),
  payoutForm: document.getElementById("payoutForm"),
  profileImage: document.getElementById("profileImage"),
  bannerImage: document.getElementById("bannerImage"),
  profileSelectBtn: document.getElementById("profileSelectBtn"),
  bannerSelectBtn: document.getElementById("bannerSelectBtn"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  updatePasswordBtn: document.getElementById("updatePasswordBtn"),
  savePayoutBtn: document.getElementById("savePayoutBtn"),
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
  elements.deleteAccountBtn?.addEventListener("click", deleteAccount);
  elements.activateCreatorBtn?.addEventListener("click", activateCreatorMode);

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
    state.creatorProfile = creatorResponse.creator || {};

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

  const avatar = resolveAssetUrl(creator.avatarUrl || user.profileImage || "", FALLBACK_AVATAR);
  elements.profilePreview.src = avatar;

  const banner = resolveAssetUrl(creator.bannerUrl || user.bannerImage || "", "");
  if (banner) {
    elements.bannerPreview.style.backgroundImage = `linear-gradient(135deg, rgba(15, 21, 48, 0.88), rgba(18, 14, 45, 0.56)), url("${escapeAttribute(banner)}")`;
  }

  elements.accountRole.textContent = formatRole(user.role || creator.role || "reader");
  elements.followerCount.textContent = formatNumber(stats.followersCount || 0);
  elements.creatorBookCount.textContent = formatNumber(stats.totalBooks || 0);
  elements.accountEarnings.textContent = formatCurrency(stats.totalEarnings || 0);
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

    state.creatorProfile = data.creator || state.creatorProfile;
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
    renderSettings();
    showMessage(elements.profileMsg, "Creator mode is active. You can now publish and build a public creator profile.");
  } catch (error) {
    showMessage(elements.profileMsg, error.message || "Unable to activate creator mode", "error");
  } finally {
    setButtonLoading(elements.activateCreatorBtn, false);
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
  const source = String(value || "");
  if (!source) {
    return fallback;
  }

  if (/^(https?:|data:|\.\.\/|\.\/|blob:)/i.test(source)) {
    return source;
  }

  if (source.startsWith("/uploads")) {
    return `${API_BASE}${source}`;
  }

  return source;
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
