const API_BASE = window.API_BASE || "";
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
const originalPriceInput = document.getElementById("originalPrice");
const subcategoryInput = document.getElementById("subcategory");
const previewPagesInput = document.getElementById("previewPages");
const bookAuthorInput = document.getElementById("bookAuthor");
const premiumInput = document.getElementById("isPremium");
const featuredInput = document.getElementById("isFeatured");
const earnPreview = document.getElementById("earnPreview");
const progressBar = document.getElementById("progressBar");
const aiScoreEl = document.getElementById("aiScore");
const uploadAiProviderEl = document.getElementById("uploadAiProvider");
const uploadAiProviderMetaEl = document.getElementById("uploadAiProviderMeta");
const statusMessage = document.getElementById("statusMessage");
const descriptionEl = document.getElementById("description");
const descCount = document.getElementById("descCount");
const submitBtn = document.querySelector(".btn.primary");
const generateDescriptionBtn = document.getElementById("generateDescriptionBtn");
const loadLibraryCatalogBtn = document.getElementById("loadLibraryCatalogBtn");
const importLibraryBtn = document.getElementById("importLibraryBtn");
const libraryCatalogList = document.getElementById("libraryCatalogList");
const libraryImportStatus = document.getElementById("libraryImportStatus");

let tags = [];
let isUploading = false;
let selectedPdfFile = null;
let selectedCoverFile = null;
let isInitialized = false;
let libraryCatalog = [];

protectPage(["creator", "author", "admin"]);

if (!token || token === "null" || token === "undefined") {
  redirectToLogin();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}

function initializePage() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  restoreDraft();
  bindForm();
  bindDescriptionCounter();
  bindTags();
  bindThumbnail();
  bindDropZone();
  bindRoyaltyCalculator();
  bindAiDescriptionGenerator();
  bindLibraryImport();
  renderTags();
  updateRoyalty();
  setUploadAiProvider();
  if (loadLibraryCatalogBtn) {
    loadLibraryCatalog();
  }
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
  renderSelectedPdfState(file);
  return true;
}

function renderSelectedPdfState(file) {
  dropZone.innerHTML = `
    <div class="uploaded-file">
      <h4>PDF ready: ${escapeHTML(file.name)}</h4>
      <small>${(file.size / 1024 / 1024).toFixed(2)} MB - click to replace</small>
    </div>
    <input type="file" id="file" accept=".pdf" hidden>
  `;
  syncFileInput();
}

function bindRoyaltyCalculator() {
  priceInput?.addEventListener("input", updateRoyalty);
}

function bindAiDescriptionGenerator() {
  generateDescriptionBtn?.addEventListener("click", generateDescription);
}

function bindLibraryImport() {
  loadLibraryCatalogBtn?.addEventListener("click", loadLibraryCatalog);
  importLibraryBtn?.addEventListener("click", importLibraryCatalog);
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
  const price = Number(priceInput.value || 0);
  const originalPrice = Number(originalPriceInput?.value || 0);
  return {
    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    subcategory: subcategoryInput?.value.trim() || "",
    language: document.getElementById("language").value,
    price,
    originalPrice: originalPrice > 0 ? originalPrice : price,
    previewPages: Number(previewPagesInput?.value || 5),
    bookAuthor: bookAuthorInput?.value.trim() || "",
    isPremium: Boolean(premiumInput?.checked),
    isFeatured: Boolean(featuredInput?.checked),
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
  formData.append("subcategory", payload.subcategory);
  formData.append("language", payload.language);
  formData.append("price", String(payload.price));
  formData.append("originalPrice", String(payload.originalPrice));
  formData.append("previewPages", String(payload.previewPages));
  formData.append("bookAuthor", payload.bookAuthor);
  formData.append("isPremium", String(payload.isPremium));
  formData.append("isFeatured", String(payload.isFeatured));
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
        setUploadAiProvider(
          response.moderation?.provider || response.aiProvider,
          response.moderation?.model || response.aiModel,
          "Upload review"
        );
        showStatus(
          response.aiProcessingState === "queued"
            ? `${response.message || "Upload completed successfully"} Full PDF AI review is continuing in the background.`
            : (response.message || "Upload completed successfully"),
          response.aiStatus === "rejected" ? "error" : "success"
        );
        showToast(
          response.aiProcessingState === "queued"
            ? "Book uploaded and AI scan queued"
            : response.aiStatus === "rejected"
              ? "Upload flagged by initial AI checks"
              : "Book uploaded successfully",
          response.aiStatus === "rejected" ? "error" : "success"
        );
        localStorage.removeItem(DRAFT_KEY);
        resetForm({ preserveProvider: true });
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

async function loadLibraryCatalog() {
  if (!loadLibraryCatalogBtn) {
    return;
  }

  loadLibraryCatalogBtn.disabled = true;
  showLibraryStatus("Loading built-in PDF catalog...", "info");

  try {
    const response = await fetch(`${API_BASE}/api/books/library-import/catalog`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load the library catalog");
    }

    libraryCatalog = data.books || [];
    renderLibraryCatalog(libraryCatalog);
    showLibraryStatus(
      `${data.summary?.imported || 0} imported • ${data.summary?.pendingImport || 0} ready to import`,
      "success"
    );
  } catch (error) {
    showLibraryStatus(error.message || "Unable to load the library catalog", "error");
  } finally {
    loadLibraryCatalogBtn.disabled = false;
  }
}

function renderLibraryCatalog(books) {
  if (!libraryCatalogList) {
    return;
  }

  if (!books.length) {
    libraryCatalogList.innerHTML = "<p>No built-in library files detected.</p>";
    return;
  }

  libraryCatalogList.innerHTML = books.map((book) => `
    <article style="border:1px solid rgba(148,163,184,0.16);border-radius:16px;padding:14px;background:rgba(15,23,42,0.42);display:grid;gap:8px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <strong>${escapeHTML(book.title)}</strong>
          <div style="color:#94a3b8;font-size:13px;">${escapeHTML(book.category || "Book")} • ${escapeHTML(book.subcategory || "General")} • ${escapeHTML(book.bookAuthor || "Unknown author")}</div>
        </div>
        <span style="font-size:12px;padding:6px 10px;border-radius:999px;background:${book.imported ? "rgba(34,197,94,0.18)" : "rgba(14,165,233,0.16)"};color:${book.imported ? "#86efac" : "#7dd3fc"};">
          ${book.imported ? `Imported (${escapeHTML(book.importedStatus || "Approved")})` : "Ready to import"}
        </span>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;color:#cbd5e1;font-size:13px;">
        <span>Price: ₹${Number(book.price || 0).toLocaleString("en-IN")}</span>
        <span>Original: ₹${Number(book.originalPrice || 0).toLocaleString("en-IN")}</span>
        <span>Preview: ${Number(book.previewPages || 0)} pages</span>
      </div>
    </article>
  `).join("");
}

async function importLibraryCatalog() {
  if (!importLibraryBtn) {
    return;
  }

  importLibraryBtn.disabled = true;
  showLibraryStatus("Importing built-in PDF catalog into your creator account...", "info");

  try {
    const response = await fetch(`${API_BASE}/api/books/library-import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Library import failed");
    }

    showLibraryStatus(
      `${data.created || 0} created • ${data.updated || 0} updated • ${data.skipped || 0} already present`,
      "success"
    );
    showToast(data.message || "Library import completed", "success");
    await loadLibraryCatalog();
  } catch (error) {
    showLibraryStatus(error.message || "Library import failed", "error");
    showToast(error.message || "Library import failed", "error");
  } finally {
    importLibraryBtn.disabled = false;
  }
}

async function generateDescription() {
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value;
  const notes = descriptionEl.value.trim();

  if (title.length < 3) {
    showToast("Add a title before generating a description", "error");
    return;
  }

  generateDescriptionBtn.disabled = true;
  generateDescriptionBtn.textContent = "Generating...";
  showStatus("Generating AI description suggestion...", "info");

  try {
    const response = await fetch(`${API_BASE}/api/ai/generate-description`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        category,
        tags,
        notes,
        excerpt: notes
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to generate description");
    }

    descriptionEl.value = data.description || descriptionEl.value;
    if (!category && data.suggestedCategory) {
      document.getElementById("category").value = data.suggestedCategory;
    }

    if (Array.isArray(data.generatedTags) && data.generatedTags.length) {
      const mergedTags = [...new Set([...tags, ...data.generatedTags.map((tag) => String(tag || "").trim().toLowerCase())])]
        .filter(Boolean)
        .slice(0, 5);
      tags = mergedTags;
      renderTags();
    }

    updateDescriptionCounter();
    setUploadAiProvider(data.provider, data.model, "Description helper");
    const providerMessage = data.provider === "openai"
      ? "AI description generated with live model suggestions."
      : data.provider === "ollama"
        ? "Description generated with your free local AI model."
        : "Description generated locally because no AI model server is configured.";
    showStatus(
      providerMessage,
      "success"
    );
    showToast("Description generated", "success");
  } catch (error) {
    showStatus(error.message || "Unable to generate description", "error");
    showToast(error.message || "Unable to generate description", "error");
  } finally {
    generateDescriptionBtn.disabled = false;
    generateDescriptionBtn.textContent = "Generate with AI";
  }
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

function setUploadAiProvider(provider = "", model = "", context = "") {
  if (!uploadAiProviderEl || !uploadAiProviderMetaEl) {
    return;
  }

  const normalized = String(provider || "").toLowerCase();
  const descriptor = describeProvider(normalized, model, context);

  uploadAiProviderEl.dataset.provider = descriptor.state;
  uploadAiProviderEl.textContent = `AI provider: ${descriptor.label}`;
  uploadAiProviderMetaEl.textContent = descriptor.meta;
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

function showLibraryStatus(message, type) {
  if (!libraryImportStatus) {
    return;
  }

  libraryImportStatus.textContent = message;
  libraryImportStatus.className = `status-message ${type}`;
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
    subcategory: payload.subcategory,
    language: payload.language,
    price: String(payload.price || ""),
    originalPrice: String(payload.originalPrice || ""),
    previewPages: String(payload.previewPages || "5"),
    bookAuthor: payload.bookAuthor,
    isPremium: payload.isPremium,
    isFeatured: payload.isFeatured,
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
    if (subcategoryInput) subcategoryInput.value = draft.subcategory || "";
    document.getElementById("language").value = draft.language || "English";
    document.getElementById("price").value = draft.price || "";
    if (originalPriceInput) originalPriceInput.value = draft.originalPrice || "";
    if (previewPagesInput) previewPagesInput.value = draft.previewPages || "5";
    if (bookAuthorInput) bookAuthorInput.value = draft.bookAuthor || "";
    if (premiumInput) premiumInput.checked = Boolean(draft.isPremium);
    if (featuredInput) featuredInput.checked = Boolean(draft.isFeatured);
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

function resetForm(options = {}) {
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
  if (previewPagesInput) previewPagesInput.value = "5";
  renderTags();
  updateRoyalty();
  updateDescriptionCounter();
  if (!options.preserveProvider) {
    setUploadAiProvider();
  }
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

function describeProvider(provider, model, context = "") {
  const prefix = context ? `${context}: ` : "";

  if (provider === "openai") {
    return {
      state: "openai",
      label: "OpenAI",
      meta: `${prefix}${model ? `model ${model}` : "live hosted model"}`
    };
  }

  if (provider === "ollama") {
    return {
      state: "ollama",
      label: "Local AI via Ollama",
      meta: `${prefix}${model ? `model ${model}` : "running on this machine"}`
    };
  }

  if (provider === "local") {
    return {
      state: "local",
      label: "Local rules engine",
      meta: `${prefix}${model && model !== "local-heuristic" ? model : "fallback mode with no live model server"}`
    };
  }

  return {
    state: "waiting",
    label: "Waiting",
    meta: "This updates when the AI helper or review engine responds."
  };
}

function loadLibraryCatalog() {
  if (!loadLibraryCatalogBtn) {
    return Promise.resolve();
  }

  loadLibraryCatalogBtn.disabled = true;
  showLibraryStatus("Loading project PDF catalog...", "info");

  return fetch(`${API_BASE}/api/books/library-import/catalog`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load the library catalog");
      }

      libraryCatalog = data.books || [];
      renderLibraryCatalog(libraryCatalog);
      showLibraryStatus(
        `${data.summary?.imported || 0} imported • ${data.summary?.pendingImport || 0} ready to import`,
        "success"
      );
    })
    .catch((error) => {
      showLibraryStatus(error.message || "Unable to load the library catalog", "error");
    })
    .finally(() => {
      loadLibraryCatalogBtn.disabled = false;
    });
}

function renderLibraryCatalog(books) {
  if (!libraryCatalogList) {
    return;
  }

  if (!books.length) {
    libraryCatalogList.innerHTML = "<p>No project PDF files detected.</p>";
    return;
  }

  libraryCatalogList.innerHTML = books.map((book) => `
    <article style="border:1px solid rgba(148,163,184,0.16);border-radius:16px;padding:14px;background:rgba(15,23,42,0.42);display:grid;gap:8px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <strong>${escapeHTML(book.title)}</strong>
          <div style="color:#94a3b8;font-size:13px;">${escapeHTML(book.category || "Book")} • ${escapeHTML(book.subcategory || "General")} • ${escapeHTML(book.bookAuthor || "Unknown author")}</div>
        </div>
        <span style="font-size:12px;padding:6px 10px;border-radius:999px;background:${book.imported ? "rgba(34,197,94,0.18)" : "rgba(14,165,233,0.16)"};color:${book.imported ? "#86efac" : "#7dd3fc"};">
          ${book.imported ? `Imported (${escapeHTML(book.importedStatus || "Approved")})` : "Ready to import"}
        </span>
      </div>
      <div style="color:#7dd3fc;font-size:12px;">
        ${escapeHTML(book.sourceLabel || (book.catalogType === "manual" ? "Manual project file" : "Project PDF file"))}
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;color:#cbd5e1;font-size:13px;">
        <span>Price: ₹${Number(book.price || 0).toLocaleString("en-IN")}</span>
        <span>Original: ₹${Number(book.originalPrice || 0).toLocaleString("en-IN")}</span>
        <span>Preview: ${Number(book.previewPages || 0)} pages</span>
      </div>
    </article>
  `).join("");
}

function importLibraryCatalog() {
  if (!importLibraryBtn) {
    return Promise.resolve();
  }

  importLibraryBtn.disabled = true;
  showLibraryStatus("Importing project PDFs into your creator account...", "info");

  return fetch(`${API_BASE}/api/books/library-import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Library import failed");
      }

      showLibraryStatus(
        `${data.created || 0} created • ${data.updated || 0} updated • ${data.skipped || 0} already present`,
        "success"
      );
      showToast(data.message || "Library import completed", "success");
      return loadLibraryCatalog();
    })
    .catch((error) => {
      showLibraryStatus(error.message || "Library import failed", "error");
      showToast(error.message || "Library import failed", "error");
    })
    .finally(() => {
      importLibraryBtn.disabled = false;
    });
}

window.saveDraft = saveDraft;
window.uploadContent = uploadContent;
