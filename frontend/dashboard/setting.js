let pendingProfileImage = "";

function showMessage(id, text, type = "success") {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `form-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
  }, 4000);
}

function toggleButtonLoading(buttonId, loading, loadingText) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

async function loadSettings() {
  try {
    const [profileData, dashboardData] = await Promise.all([
      apiFetchJson("/api/profile/me"),
      apiFetchJson("/api/dashboard/user"),
    ]);

    const user = profileData.user;
    document.getElementById("fullName").value = user.name || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("bio").value = user.bio || "";
    document.getElementById("upiId").value = user.payout?.upiId || "";
    document.getElementById("bankAccount").value = user.payout?.bankAccount || "";
    document.getElementById("ifscCode").value = user.payout?.ifscCode || "";
    document.getElementById("accountRole").textContent = user.role || "Creator";
    document.getElementById("accountEarnings").textContent = formatCurrency(
      dashboardData.totalEarnings || 0
    );
    document.getElementById("totalSales").textContent = Number(
      (dashboardData.topBooks || []).reduce(
        (sum, book) => sum + Number(book.salesCount || 0),
        0
      )
    ).toLocaleString("en-IN");

    const payoutConfigured = user.payout?.upiId || user.payout?.bankAccount;
    document.getElementById("payoutStatus").textContent = payoutConfigured
      ? "Manual Payout Configured"
      : "Manual Payout Not Set";

    if (user.profileImage) {
      document.getElementById("profilePreview").src = user.profileImage;
    }

    setSession(getToken(), user);
  } catch (error) {
    logoutUser();
  }
}

async function updateProfile() {
  toggleButtonLoading("saveProfileBtn", true, "Saving...");

  try {
    const payload = {
      name: document.getElementById("fullName").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      profileImage: pendingProfileImage || undefined,
    };

    const data = await apiFetchJson("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setSession(getToken(), data.user);
    showMessage("profileMsg", "Profile updated successfully");
    pendingProfileImage = "";
    await loadSettings();
  } catch (error) {
    showMessage("profileMsg", error.message || "Unable to update profile", "error");
  } finally {
    toggleButtonLoading("saveProfileBtn", false, "");
  }
}

async function changePassword() {
  toggleButtonLoading("updatePasswordBtn", true, "Updating...");

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;

  if (newPassword.length < 6) {
    showMessage("passwordMsg", "Password must be at least 6 characters", "error");
    toggleButtonLoading("updatePasswordBtn", false, "");
    return;
  }

  try {
    await apiFetchJson("/api/user/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    showMessage("passwordMsg", "Password updated successfully");
  } catch (error) {
    showMessage("passwordMsg", error.message || "Unable to update password", "error");
  } finally {
    toggleButtonLoading("updatePasswordBtn", false, "");
  }
}

async function savePayout() {
  toggleButtonLoading("savePayoutBtn", true, "Saving...");

  try {
    await apiFetchJson("/api/user/payout", {
      method: "PUT",
      body: JSON.stringify({
        upiId: document.getElementById("upiId").value.trim(),
        bankAccount: document.getElementById("bankAccount").value.trim(),
        ifscCode: document.getElementById("ifscCode").value.trim(),
      }),
    });

    document.getElementById("payoutStatus").textContent = "Manual Payout Configured";
    showMessage("payoutMsg", "Payout details saved");
  } catch (error) {
    showMessage("payoutMsg", error.message || "Unable to save payout details", "error");
  } finally {
    toggleButtonLoading("savePayoutBtn", false, "");
  }
}

async function deleteAccount() {
  const confirmed = window.confirm("Delete this account permanently?");
  if (!confirmed) {
    return;
  }

  try {
    await apiFetchJson("/api/user", {
      method: "DELETE",
    });

    clearSession();
    window.location.href = "../index.html";
  } catch (error) {
    showMessage("deleteMsg", error.message || "Unable to delete account", "error");
  }
}

function initProfileImagePreview() {
  const input = document.getElementById("profileImage");
  if (!input) {
    return;
  }

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      pendingProfileImage = event.target.result;
      document.getElementById("profilePreview").src = pendingProfileImage;
    };
    reader.readAsDataURL(file);
  });
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

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["reader", "creator", "author", "admin"]);
  if (!user) {
    return;
  }

  initProfileImagePreview();
  initCursorGlow();
  loadSettings();
});
