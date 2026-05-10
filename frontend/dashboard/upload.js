const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DRAFT_KEY = "ebook-market-upload-draft";

const form = document.getElementById("uploadForm");
const tagInput = document.getElementById("tagInput");
const tagContainer = document.getElementById("tagContainer");
const thumbnailInput = document.getElementById("thumbnail");
const thumbnailBox = document.getElementById("thumbnailBox");
const dropZone = document.getElementById("dropZone");
let fileInput = document.getElementById("file");
const priceInput = document.getElementById("price");
const earnPreview = document.getElementById("earnPreview");
const progressBar = document.getElementById("progressBar");
const aiScoreEl = document.getElementById("aiScore");
const statusMessage = document.getElementById("statusMessage");
const descriptionEl = document.getElementById("description");
const descCount = document.getElementById("descCount");
const submitBtn = document.querySelector(".btn.primary");

let tags = [];
let isUploading = false;
let selectedPdfFile = null;
let selectedCoverFile = null;

protectPage(["creator", "author", "admin"]);

if (!token || token === "null" || token === "undefined") {
  redirectToLogin();
}

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage() {
  restoreDraft();
  bindForm();
  bindDescriptionCounter();
  bindTags();
  bindThumbnail();
  bindDropZone();
  bindRoyaltyCalculator();
  renderTags();
  updateRoyalty();
}

function bindForm() {
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    uploadContent();
  });
}

function bindDescriptionCounter() {
  descriptionEl?.addEventListener("input", updateDescriptionCounter);
  updateDescriptionCounter();
}

function updateDescriptionCounter() {
  descCount.textContent = `${descriptionEl.value.length} / 300`;
}

function bindTags() {
  tagInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const value = tagInput.value.trim().toLowerCase();
    if (!value) {
      return;
    }

    if (tags.includes(value)) {
      showToast("Tag already added", "error");
      return;
    }

    if (tags.length >= 5) {
      showToast("Maximum 5 tags allowed", "error");
      return;
    }

    tags.push(value);
    tagInput.value = "";
    renderTags();
  });
}

function renderTags() {
  if (!tagContainer) {
    return;
  }

  tagContainer.innerHTML = "";

  tags.forEach((tag, index) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.innerHTML = `${escapeHTML(tag)} <span role="button" aria-label="Remove tag">x</span>`;
    chip.querySelector("span").addEventListener("click", () => {
      tags.splice(index, 1);
      renderTags();
    });
    tagContainer.appendChild(chip);
  });

  tagContainer.appendChild(tagInput);
}

function bindThumbnail() {
  thumbnailBox?.addEventListener("click", () => thumbnailInput.click());
  thumbnailInput?.addEventListener("change", () => {
    const file = thumbnailInput.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Only image files allowed", "error");
      thumbnailInput.value = "";
      selectedCoverFile = null;
      return;
    }

    selectedCoverFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      thumbnailBox.innerHTML = `<img src="${event.target.result}" class="thumbnail-preview" alt="Selected cover preview">`;
    };
    reader.readAsDataURL(file);
  });
}

function bindDropZone() {
  syncFileInput();
  dropZone?.addEventListener("click", () => fileInput.click());
  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });
  dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    const file = event.dataTransfer.files?.[0];
    validateAndSetPdf(file);
  });
}

function syncFileInput() {
  fileInput = document.getElementById("file");
  fileInput?.addEventListener("change", handlePdfInputChange);
}

function handlePdfInputChange() {
  const file = fileInput.files?.[0];
  validateAndSetPdf(file);
}

function renderDropZonePlaceholder() {
  dropZone.innerHTML = `
    <div class="upload-icon">PDF</div>
    <p>Drag and drop your PDF here</p>
    <small>or click to browse</small>
    <input type="file" id="file" accept=".pdf" hidden>
  `;
  syncFileInput();
}

function validateAndSetPdf(file) {
  if (!file) {
    return false;
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF files allowed", "error");
    fileInput.value = "";
    selectedPdfFile = null;
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    showToast("Max file size is 50MB", "error");
    fileInput.value = "";
    selectedPdfFile = null;
    return false;
  }

  selectedPdfFile = file;
  dropZone.innerHTML = `
    <div class="uploaded-file">
      <h4>PDF ready: ${escapeHTML(file.name)}</h4>
      <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
    </div>
  `;
  return true;
}

function bindRoyaltyCalculator() {
  priceInput?.addEventListener("input", updateRoyalty);
}

function updateRoyalty() {
  const price = Number(priceInput.value || 0);
  const creatorShare = price > 0 ? 0.82 : 0;
  earnPreview.textContent = Math.floor(price * creatorShare).toLocaleString("en-IN");
}

function validateForm(data) {
  if (!data.title || data.title.length < 5) {
    return "Title must be at least 5 characters";
  }

  if (!data.type) {
    return "Select a content type";
  }

  if (!data.category) {
    return "Select a category";
  }

  if (!data.file) {
    return "Upload a PDF file";
  }

  if (!data.description || data.description.length < 30) {
    return "Description must be at least 30 characters";
  }

  if (!data.copyright) {
    return "Confirm ownership before submitting";
  }

  return null;
}

function collectPayload() {
  return {
    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    language: document.getElementById("language").value,
    price: Number(priceInput.value || 0),
    description: descriptionEl.value.trim(),
    file: selectedPdfFile || fileInput.files?.[0] || null,
    thumbnail: selectedCoverFile || thumbnailInput.files?.[0] || null,
    copyright: document.getElementById("copyright").checked
  };
}

async function uploadContent() {
  if (isUploading) {
    return;
  }

  const payload = collectPayload();
  const validationError = validateForm(payload);
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  isUploading = true;
  updateButtonState(true);
  showStatus("Uploading content and running AI review...", "info");

  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("type", payload.type);
  formData.append("category", payload.category);
  formData.append("language", payload.language);
  formData.append("price", String(payload.price));
  formData.append("description", payload.description);
  formData.append("pdf", payload.file);
  formData.append("tags", JSON.stringify(tags));
  if (payload.thumbnail) {
    formData.append("cover", payload.thumbnail);
  }

  try {
    await sendUploadRequest(formData);
  } catch (error) {
    console.error("Upload failed:", error);
    showStatus(error.message || "Unexpected upload error", "error");
  } finally {
    isUploading = false;
    updateButtonState(false);
  }
}

function sendUploadRequest(formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/books/upload`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent = (event.loaded / event.total) * 100;
      progressBar.style.width = `${percent}%`;
    };

    xhr.onload = () => {
      const response = safeJsonParse(xhr.responseText);

      if (xhr.status === 201) {
        animateAIScore(response.moderation?.aiScore || response.aiScore || 0);
        showStatus(response.message || "Upload completed successfully", "success");
        showToast(
          response.moderation?.status === "Approved"
            ? "Book uploaded and published"
            : "Book uploaded and sent for review",
          "success"
        );
        localStorage.removeItem(DRAFT_KEY);
        resetForm();
        resolve(response);
        return;
      }

      if (xhr.status === 401) {
        redirectToLogin();
        reject(new Error("Session expired"));
        return;
      }

      reject(new Error(response.message || "Upload failed"));
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
}

function animateAIScore(target) {
  let current = 0;
  const limit = Math.max(0, Math.min(100, Number(target || 0)));

  const timer = window.setInterval(() => {
    current += 1;
    aiScoreEl.textContent = `${current}%`;

    if (current >= limit) {
      window.clearInterval(timer);
      aiScoreEl.textContent = `${limit}%`;
    }
  }, 14);
}

function updateButtonState(isLoading) {
  if (!submitBtn) {
    return;
  }

  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Uploading..." : "Submit for Review";
}

function showStatus(message, type) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => toast.classList.add("show"), 50);
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.remove(), 250);
  }, 2600);
}

function saveDraft() {
  const payload = collectPayload();
  const draft = {
    title: payload.title,
    type: payload.type,
    category: payload.category,
    language: payload.language,
    price: String(payload.price || ""),
    description: payload.description,
    copyright: payload.copyright,
    tags
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  showToast("Draft saved locally. Reattach files before publishing.", "success");
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return;
    }

    const draft = JSON.parse(raw);
    document.getElementById("title").value = draft.title || "";
    document.getElementById("type").value = draft.type || "";
    document.getElementById("category").value = draft.category || "";
    document.getElementById("language").value = draft.language || "English";
    document.getElementById("price").value = draft.price || "";
    descriptionEl.value = draft.description || "";
    document.getElementById("copyright").checked = Boolean(draft.copyright);
    tags = Array.isArray(draft.tags) ? draft.tags : [];
    renderTags();
    showStatus("Draft restored. Add your PDF and cover again before submitting.", "info");
  } catch (error) {
    console.error("Draft restore failed:", error);
    localStorage.removeItem(DRAFT_KEY);
  }
}

function resetForm() {
  form.reset();
  tags = [];
  selectedPdfFile = null;
  selectedCoverFile = null;
  progressBar.style.width = "0%";
  aiScoreEl.textContent = "--";
  renderDropZonePlaceholder();
  thumbnailBox.innerHTML = `
    <div class="upload-icon">IMG</div>
    <span>Upload Thumbnail</span>
    <small>PNG / JPG</small>
  `;
  if (fileInput) {
    fileInput.value = "";
  }
  thumbnailInput.value = "";
  renderTags();
  updateRoyalty();
  updateDescriptionCounter();
}

function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../login.html";
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

window.saveDraft = saveDraft;
window.uploadContent = uploadContent;
