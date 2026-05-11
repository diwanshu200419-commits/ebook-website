/* =====================================
CONFIG
===================================== */

const API_BASE = window.API_BASE || "";

function getToken() {
  return localStorage.getItem("token");
}

function logoutUser() {
  fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true
  }).catch(() => null);
  localStorage.clear();
  window.location.href = "../login.html";
}

if (!getToken()) {
  window.location.href = "../login.html";
}


/* =====================================
UTILITIES
===================================== */

function showMessage(id, text, type = "success") {

  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = text;
  el.className = "form-message " + type;

  setTimeout(() => {
    el.textContent = "";
  }, 4000);

}

function setButtonLoading(btn, loading, text = "Saving...") {

  if (!btn) return;

  if (loading) {
    btn.dataset.original = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.original || "Save";
    btn.disabled = false;
  }

}


/* =====================================
INIT PAGE
===================================== */

document.addEventListener("DOMContentLoaded", initSettings);

async function initSettings() {

  await loadUser();
  initCursorGlow();
  initMagneticButtons();

}


/* =====================================
LOAD USER
===================================== */

async function loadUser() {

  try {

    const res = await fetch(`${API_BASE}/api/profile/me`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    const user = data.user;

    /* PROFILE */

    document.getElementById("fullName").value = user.name || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("bio").value = user.bio || "";

    if (user.profileImage) {
      document.getElementById("profilePreview").src =
        user.profileImage;
    }

    /* SUMMARY */

    const earnings =
      document.getElementById("accountEarnings");

    const sales =
      document.getElementById("totalSales");

    const role =
      document.getElementById("accountRole");

    const payout =
      document.getElementById("payoutStatus");

    if (role) role.textContent = user.role || "Creator";

    if (earnings)
      earnings.textContent =
        "₹" + (user.totalEarnings || 0);

    if (sales)
      sales.textContent = user.totalSales || 0;

    if (payout) {

      const configured =
        user.payout &&
        (user.payout.upiId || user.payout.bankAccount);

      payout.textContent =
        configured ? "Manual Payout Configured"
        : "Manual Payout Not Set";

    }

  } catch {

    logoutUser();

  }

}


/* =====================================
UPDATE PROFILE
===================================== */

async function updateProfile(event) {

  const btn = event.target;
  setButtonLoading(btn, true, "Updating...");

  const name =
    document.getElementById("fullName").value.trim();

  const bio =
    document.getElementById("bio").value.trim();

  try {

    const res = await fetch(`${API_BASE}/api/user/profile`, {

      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },

      body: JSON.stringify({ name, bio })

    });

    const data = await res.json();

    if (!res.ok)
      throw new Error(data.message || "Update failed");

    showMessage(
      "profileMsg",
      "Profile updated successfully"
    );

  } catch (err) {

    showMessage("profileMsg", err.message, "error");

  }

  setButtonLoading(btn, false);

}


/* =====================================
CHANGE PASSWORD
===================================== */

async function changePassword(event) {

  const btn = event.target;
  setButtonLoading(btn, true, "Updating...");

  const currentPassword =
    document.getElementById("currentPassword").value;

  const newPassword =
    document.getElementById("newPassword").value;

  if (newPassword.length < 6) {

    showMessage(
      "passwordMsg",
      "Password must be at least 6 characters",
      "error"
    );

    setButtonLoading(btn, false);
    return;

  }

  try {

    const res = await fetch(`${API_BASE}/api/user/password`, {

      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },

      body: JSON.stringify({
        currentPassword,
        newPassword
      })

    });

    const data = await res.json();

    if (!res.ok)
      throw new Error(data.message || "Update failed");

    showMessage("passwordMsg", "Password updated");

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";

  } catch (err) {

    showMessage("passwordMsg", err.message, "error");

  }

  setButtonLoading(btn, false);

}


/* =====================================
SAVE PAYOUT
===================================== */

async function savePayout(event) {

  const btn = event.target;
  setButtonLoading(btn, true);

  const upiId =
    document.getElementById("upiId").value.trim();

  const bankAccount =
    document.getElementById("bankAccount").value.trim();

  const ifscCode =
    document.getElementById("ifscCode").value.trim();

  try {

    const res = await fetch(`${API_BASE}/api/user/payout`, {

      method: "PUT",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },

      body: JSON.stringify({
        upiId,
        bankAccount,
        ifscCode
      })

    });

    const data = await res.json();

    if (!res.ok)
      throw new Error(data.message || "Save failed");

    showMessage("payoutMsg", "Payout details saved");

    const status =
      document.getElementById("payoutStatus");

    if (status)
      status.textContent =
        "Manual Payout Configured";

  } catch (err) {

    showMessage("payoutMsg", err.message, "error");

  }

  setButtonLoading(btn, false);

}


/* =====================================
STRIPE (OPTIONAL)
===================================== */

function connectStripe() {

  alert(
    "Stripe payouts are currently not available in India.\nPlease use Manual Payout."
  );

}


/* =====================================
COPY API KEY
===================================== */

function copyApiKey() {

  const input = document.getElementById("apiKey");

  if (!input) return;

  navigator.clipboard.writeText(input.value);

  alert("Copied");

}


/* =====================================
DELETE ACCOUNT
===================================== */

async function deleteAccount() {

  const confirmDelete =
    confirm("Delete account permanently?");

  if (!confirmDelete) return;

  try {

    const res = await fetch(`${API_BASE}/api/user`, {

      method: "DELETE",

      headers: {
        Authorization: `Bearer ${getToken()}`
      }

    });

    if (!res.ok) throw new Error();

    localStorage.clear();
    window.location.href = "../index.html";

  } catch {

    showMessage(
      "deleteMsg",
      "Failed to delete account",
      "error"
    );

  }

}


/* =====================================
CURSOR GLOW
===================================== */

function initCursorGlow() {

  const glow =
    document.querySelector(".cursor-glow");

  if (!glow) return;

  document.addEventListener("mousemove", e => {

    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";

  });

}


/* =====================================
MAGNETIC BUTTONS
===================================== */

function initMagneticButtons() {

  const buttons =
    document.querySelectorAll(".btn-primary");

  buttons.forEach(btn => {

    btn.addEventListener("mousemove", e => {

      const rect =
        btn.getBoundingClientRect();

      const x =
        e.clientX - rect.left - rect.width / 2;

      const y =
        e.clientY - rect.top - rect.height / 2;

      btn.style.transform =
        `translate(${x * 0.2}px, ${y * 0.2}px)`;

    });

    btn.addEventListener("mouseleave", () => {

      btn.style.transform = "translate(0,0)";

    });

  });

}
