const API_BASE = window.API_BASE || "";
const token = localStorage.getItem("token");

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DRAFT_KEY = "ebook-market-upload-draft";

const uploadCard = document.getElementById("uploadCard");
const form = document.getElementById("uploadForm");
const uploadReadinessBanner = document.getElementById("uploadReadinessBanner");
const typeSelect = document.getElementById("type");
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
const previewPagesGroup = document.getElementById("previewPagesGroup");
const bookAuthorInput = document.getElementById("bookAuthor");
const promptTextInput = document.getElementById("promptText");
const deliveryIncludesInput = document.getElementById("deliveryIncludes");
const externalUrlInput = document.getElementById("externalUrl");
const deliveryInstructionsInput = document.getElementById("deliveryInstructions");
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
const submitBtn = form?.querySelector(".btn.primary");
const generateDescriptionBtn = document.getElementById("generateDescriptionBtn");
const runCreatorAssistBtn = document.getElementById("runCreatorAssistBtn");
const applySuggestedCategoryBtn = document.getElementById("applySuggestedCategoryBtn");
const loadLibraryCatalogBtn = document.getElementById("loadLibraryCatalogBtn");
const importLibraryBtn = document.getElementById("importLibraryBtn");
const libraryCatalogList = document.getElementById("libraryCatalogList");
const libraryImportStatus = document.getElementById("libraryImportStatus");
const titleSuggestionList = document.getElementById("titleSuggestionList");
const suggestedCategoryText = document.getElementById("suggestedCategoryText");
const suggestedTagList = document.getElementById("suggestedTagList");
const thumbnailIdeaList = document.getElementById("thumbnailIdeaList");
const pricingInsightBox = document.getElementById("pricingInsightBox");
const readinessScoreText = document.getElementById("readinessScoreText");
const readinessStatusText = document.getElementById("readinessStatusText");
const readinessList = document.getElementById("readinessList");
const primaryFileHeading = document.getElementById("primaryFileHeading");
const primaryFileMeta = document.getElementById("primaryFileMeta");
const fileDropLabel = document.getElementById("fileDropLabel");
const fileHelperText = document.getElementById("fileHelperText");
const importProjectSection = document.getElementById("importProjectSection");
const creatorActivationGate = document.getElementById("creatorActivationGate");
const creatorActivationMessage = document.getElementById("creatorActivationMessage");
const activateCreatorNowBtn = document.getElementById("activateCreatorNowBtn");
const chooseThumbnailBtn = document.getElementById("chooseThumbnailBtn");
const clearThumbnailBtn = document.getElementById("clearThumbnailBtn");
const chooseFileBtn = document.getElementById("chooseFileBtn");
const clearFileBtn = document.getElementById("clearFileBtn");

let tags = [];
let isUploading = false;
let selectedProductFile = null;
let selectedCoverFile = null;
let isInitialized = false;
let libraryCatalog = [];
let latestCreatorAssist = null;
let creatorGateBound = false;

const TYPE_OPTIONS = [
  { value: "Book", label: "E-Book" },
  { value: "Notes", label: "Handwritten Notes" },
  { value: "Study", label: "Study Pack" },
  { value: "Comics", label: "Comics" },
  { value: "Prompt", label: "AI Prompt Pack" },
  { value: "Template", label: "Template" },
  { value: "Course", label: "Mini Course" },
  { value: "AI Asset", label: "AI Asset Pack" },
  { value: "Bundle", label: "Bundle" },
  { value: "Other", label: "Other Digital Product" },
];

const PDF_REQUIRED_TYPES = new Set(["Book", "Notes", "Study", "Comics"]);
const PROJECT_IMPORT_TYPES = new Set(["Book", "Notes", "Study", "Comics"]);
const SUPPORTED_FILE_EXTENSIONS = new Set([
  ".pdf",
  ".zip",
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

const PRODUCT_TYPE_UI = {
  Book: {
    fileHeading: "PDF Upload",
    fileMeta: "Upload the full ebook PDF buyers will unlock after purchase.",
    dropLabel: "Drag & Drop PDF here",
    helper: "PDF only - Max 50MB",
  },
  Notes: {
    fileHeading: "Notes PDF Upload",
    fileMeta: "Upload the notes PDF students should unlock.",
    dropLabel: "Drag & Drop notes PDF here",
    helper: "PDF only - Max 50MB",
  },
  Study: {
    fileHeading: "Study Pack Upload",
    fileMeta: "Upload the study pack PDF or workbook buyers will receive.",
    dropLabel: "Drag & Drop study PDF here",
    helper: "PDF only - Max 50MB",
  },
  Comics: {
    fileHeading: "Comic PDF Upload",
    fileMeta: "Upload the comic PDF readers will unlock.",
    dropLabel: "Drag & Drop comic PDF here",
    helper: "PDF only - Max 50MB",
  },
  Prompt: {
    fileHeading: "Prompt Pack File",
    fileMeta: "Prompt products can ship as text, TXT/MD files, or a bundle.",
    dropLabel: "Drag & Drop prompt file here",
    helper: "TXT, MD, PDF, ZIP, JSON - optional if you paste prompt text below",
  },
  Template: {
    fileHeading: "Template File Upload",
    fileMeta: "Upload the template file or bundle buyers should download.",
    dropLabel: "Drag & Drop template file here",
    helper: "ZIP, PDF, DOCX, PPTX, XLSX, PNG, JPG, WEBP - Max 50MB",
  },
  Course: {
    fileHeading: "Course Pack Upload",
    fileMeta: "Upload a workbook, course PDF, or downloadable lesson bundle.",
    dropLabel: "Drag & Drop course file here",
    helper: "PDF, ZIP, DOCX, PPTX, XLSX - Max 50MB",
  },
  "AI Asset": {
    fileHeading: "AI Asset Upload",
    fileMeta: "Upload the asset pack buyers should unlock after payment.",
    dropLabel: "Drag & Drop asset file here",
    helper: "ZIP, PNG, JPG, WEBP, PDF, JSON - Max 50MB",
  },
  Bundle: {
    fileHeading: "Bundle Upload",
    fileMeta: "Upload the main bundle file or delivery pack.",
    dropLabel: "Drag & Drop bundle file here",
    helper: "ZIP, PDF, TXT, DOCX, PPTX, XLSX, PNG, JPG, WEBP - Max 50MB",
  },
  Other: {
    fileHeading: "Digital Product Upload",
    fileMeta: "Upload the main file for this product or use text/link delivery below.",
    dropLabel: "Drag & Drop product file here",
    helper: "PDF, ZIP, TXT, JSON, DOCX, PPTX, XLSX, PNG, JPG, WEBP - Max 50MB",
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapUploadPage);
} else {
  bootstrapUploadPage();
}

async function bootstrapUploadPage() {
  setStudioBootState(true, "Checking creator access and preparing upload tools...");
  bindCreatorActivation();

  if (!token || token === "null" || token === "undefined") {
    redirectToLogin();
    return;
  }

  const authenticated = await protectPage();
  if (!authenticated) {
    return;
  }

  if (!canUploadProducts(getCurrentUser()?.role)) {
    showCreatorActivationGate();
    return;
  }

  initializePage();
}

function initializePage() {
  if (isInitialized) {
    setStudioBootState(false);
    return;
  }

  hideCreatorActivationGate();
  isInitialized = true;
  hydrateTypeSelect();
  restoreDraft();
  bindForm();
  bindDescriptionCounter();
  bindTags();
  bindThumbnail();
  bindDropZone();
  bindProductType();
  bindRoyaltyCalculator();
  bindAiDescriptionGenerator();
  bindCreatorAssist();
  bindLibraryImport();
  renderTags();
  updateRoyalty();
  updateProductTypeUI();
  setUploadAiProvider();
  hydrateAiRuntime();
  if (loadLibraryCatalogBtn) {
    loadLibraryCatalog();
  }
  setStudioBootState(false);
}

function bindCreatorActivation() {
  if (creatorGateBound || !activateCreatorNowBtn) {
    return;
  }

  activateCreatorNowBtn.addEventListener("click", activateCreatorModeForUpload);
  creatorGateBound = true;
}

function canUploadProducts(role) {
  return ["creator", "author", "admin"].includes(String(role || "").toLowerCase());
}

function showCreatorActivationGate() {
  setStudioBootState(false);
  if (creatorActivationGate) {
    creatorActivationGate.hidden = false;
  }
  if (form) {
    form.hidden = true;
  }
  if (creatorActivationMessage) {
    creatorActivationMessage.textContent = "Your account is logged in, but publishing is only enabled for creators. Turn on creator mode once and the full upload studio will unlock immediately.";
  }
  if (statusMessage) {
    statusMessage.className = "status-message";
    statusMessage.textContent = "";
  }
}

function hideCreatorActivationGate() {
  if (creatorActivationGate) {
    creatorActivationGate.hidden = true;
  }
  if (form) {
    form.hidden = false;
  }
}

async function activateCreatorModeForUpload() {
  if (!activateCreatorNowBtn) {
    return;
  }

  const originalLabel = activateCreatorNowBtn.textContent;
  setStudioBootState(true, "Turning on creator mode and opening your upload studio...");
  activateCreatorNowBtn.disabled = true;
  activateCreatorNowBtn.textContent = "Enabling...";

  try {
    const response = await fetch(`${API_BASE}/api/creator/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to enable creator mode");
    }

    const currentUser = getCurrentUser();
    localStorage.setItem("user", JSON.stringify({
      ...currentUser,
      role: data.role || "creator",
    }));

    hideCreatorActivationGate();
    initializePage();
    showStatus("Creator mode is active. You can now upload and publish products.", "success");
    showToast("Creator mode enabled", "success");
  } catch (error) {
    setStudioBootState(false);
    showStatus(error.message || "Unable to enable creator mode right now", "error");
    showToast(error.message || "Unable to enable creator mode", "error");
  } finally {
    activateCreatorNowBtn.disabled = false;
    activateCreatorNowBtn.textContent = originalLabel;
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

function hydrateTypeSelect() {
  if (!typeSelect) {
    return;
  }

  const selected = typeSelect.value;
  typeSelect.innerHTML = `
    <option value="">Select Type</option>
    ${TYPE_OPTIONS.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHTML(option.label)}</option>`).join("")}
  `;

  if (selected && TYPE_OPTIONS.some((option) => option.value === selected)) {
    typeSelect.value = selected;
  }
}

function getSelectedType() {
  return typeSelect?.value || "Book";
}

function getTypeUiConfig() {
  return PRODUCT_TYPE_UI[getSelectedType()] || PRODUCT_TYPE_UI.Other;
}

function getFileAcceptValue() {
  return PDF_REQUIRED_TYPES.has(getSelectedType())
    ? ".pdf"
    : ".pdf,.zip,.txt,.md,.json,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp";
}

function getFileExtension(fileName = "") {
  const match = String(fileName || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function updateProductTypeUI() {
  const type = getSelectedType();
  const config = getTypeUiConfig();
  const isPdfType = PDF_REQUIRED_TYPES.has(type);

  if (primaryFileHeading) {
    primaryFileHeading.textContent = config.fileHeading;
  }
  if (primaryFileMeta) {
    primaryFileMeta.textContent = config.fileMeta;
  }
  if (fileDropLabel) {
    fileDropLabel.textContent = config.dropLabel;
  }
  if (fileHelperText) {
    fileHelperText.textContent = config.helper;
  }
  if (previewPagesGroup) {
    previewPagesGroup.style.display = isPdfType ? "" : "none";
  }
  if (importProjectSection) {
    importProjectSection.style.display = PROJECT_IMPORT_TYPES.has(type) ? "" : "none";
  }
  if (promptTextInput && type === "Prompt" && !promptTextInput.placeholder.includes("prompt")) {
    promptTextInput.placeholder = "Paste the full AI prompt, prompt pack instructions, or instant-access content buyers should unlock.";
  }
  if (fileInput) {
    fileInput.setAttribute("accept", getFileAcceptValue());
  }
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

function renderThumbnailPlaceholder() {
  thumbnailBox.innerHTML = `
    <div class="upload-icon">IMG</div>
    <span>Upload Thumbnail</span>
    <small>PNG / JPG</small>
  `;
}

function syncUploadActionButtons() {
  if (clearThumbnailBtn) {
    clearThumbnailBtn.disabled = !selectedCoverFile;
  }

  if (clearFileBtn) {
    clearFileBtn.disabled = !selectedProductFile;
  }
}

function bindThumbnail() {
  thumbnailBox?.addEventListener("click", () => thumbnailInput.click());
  thumbnailBox?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      thumbnailInput.click();
    }
  });
  chooseThumbnailBtn?.addEventListener("click", () => thumbnailInput.click());
  clearThumbnailBtn?.addEventListener("click", clearThumbnailSelection);
  thumbnailInput?.addEventListener("change", () => {
    const file = thumbnailInput.files?.[0];
    if (!file) {
      clearThumbnailSelection();
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Only image files allowed", "error");
      clearThumbnailSelection();
      return;
    }

    selectedCoverFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      thumbnailBox.innerHTML = `<img src="${event.target.result}" class="thumbnail-preview" alt="Selected cover preview">`;
      syncUploadActionButtons();
    };
    reader.readAsDataURL(file);
  });
  syncUploadActionButtons();
}

function clearThumbnailSelection() {
  selectedCoverFile = null;
  if (thumbnailInput) {
    thumbnailInput.value = "";
  }
  renderThumbnailPlaceholder();
  syncUploadActionButtons();
}

function bindDropZone() {
  syncFileInput();
  dropZone?.addEventListener("click", () => fileInput.click());
  dropZone?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  chooseFileBtn?.addEventListener("click", () => fileInput.click());
  clearFileBtn?.addEventListener("click", clearProductFileSelection);
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
    validateAndSetProductFile(file);
  });
}

function syncFileInput() {
  fileInput = document.getElementById("file");
  if (fileInput) {
    fileInput.setAttribute("accept", getFileAcceptValue());
  }
  fileInput?.addEventListener("change", handleProductFileInputChange);
  syncUploadActionButtons();
}

function handleProductFileInputChange() {
  const file = fileInput.files?.[0];
  if (!file) {
    clearProductFileSelection();
    return;
  }
  validateAndSetProductFile(file);
}

function renderDropZonePlaceholder() {
  const config = getTypeUiConfig();
  const iconLabel = PDF_REQUIRED_TYPES.has(getSelectedType()) ? "PDF" : "FILE";
  dropZone.innerHTML = `
    <div class="upload-icon">${escapeHTML(iconLabel)}</div>
    <p>${escapeHTML(config.dropLabel)}</p>
    <small>${escapeHTML(config.helper)}</small>
    <input type="file" id="file" accept="${escapeAttribute(getFileAcceptValue())}" hidden>
  `;
  syncFileInput();
}

function validateAndSetProductFile(file) {
  if (!file) {
    return false;
  }

  const type = getSelectedType();
  const extension = getFileExtension(file.name);

  if (PDF_REQUIRED_TYPES.has(type) && extension !== ".pdf") {
    showToast("This product type requires a PDF file", "error");
    clearProductFileSelection();
    return false;
  }

  if (!PDF_REQUIRED_TYPES.has(type) && !SUPPORTED_FILE_EXTENSIONS.has(extension)) {
    showToast("That file type is not supported for marketplace delivery", "error");
    clearProductFileSelection();
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    showToast("Max file size is 50MB", "error");
    clearProductFileSelection();
    return false;
  }

  selectedProductFile = file;
  renderSelectedProductState(file);
  return true;
}

function renderSelectedProductState(file) {
  const label = PDF_REQUIRED_TYPES.has(getSelectedType()) ? "PDF ready" : "Product file ready";
  dropZone.innerHTML = `
    <div class="uploaded-file">
      <h4>${escapeHTML(label)}: ${escapeHTML(file.name)}</h4>
      <small>${(file.size / 1024 / 1024).toFixed(2)} MB - click to replace</small>
    </div>
    <input type="file" id="file" accept="${escapeAttribute(getFileAcceptValue())}" hidden>
  `;
  syncFileInput();
}

function clearProductFileSelection() {
  selectedProductFile = null;
  renderDropZonePlaceholder();
  if (fileInput) {
    fileInput.value = "";
  }
  syncUploadActionButtons();
}

function bindRoyaltyCalculator() {
  priceInput?.addEventListener("input", updateRoyalty);
}

function bindAiDescriptionGenerator() {
  generateDescriptionBtn?.addEventListener("click", generateDescription);
}

function bindProductType() {
  typeSelect?.addEventListener("change", () => {
    updateProductTypeUI();
    if (!selectedProductFile) {
      renderDropZonePlaceholder();
      return;
    }

    if (!validateAndSetProductFile(selectedProductFile)) {
      showStatus("The previous file is not valid for this product type. Please choose a new file.", "info");
    }
  });
}

function bindCreatorAssist() {
  runCreatorAssistBtn?.addEventListener("click", runCreatorAssist);
  applySuggestedCategoryBtn?.addEventListener("click", applySuggestedCategory);
}

function bindLibraryImport() {
  loadLibraryCatalogBtn?.addEventListener("click", loadLibraryCatalog);
  importLibraryBtn?.addEventListener("click", importLibraryCatalog);
}

function updateRoyalty() {
  const price = Number(priceInput.value || 0);
  const creatorShare = price > 0 ? 0.8 : 0;
  earnPreview.textContent = Math.floor(price * creatorShare).toLocaleString("en-IN");
}

function validateForm(data) {
  const isPdfType = PDF_REQUIRED_TYPES.has(data.type);
  const hasPromptText = Boolean(String(data.promptText || "").trim());
  const hasExternalUrl = Boolean(String(data.externalUrl || "").trim());

  if (!data.title || data.title.length < 5) {
    return "Title must be at least 5 characters";
  }

  if (!data.type) {
    return "Select a content type";
  }

  if (!data.category) {
    return "Select a category";
  }

  if (isPdfType && !data.file) {
    return "Upload a PDF file for this product type";
  }

  if (data.type === "Prompt" && !data.file && !hasPromptText) {
    return "Prompt products need prompt text or a prompt file";
  }

  if (!isPdfType && !data.file && !hasPromptText && !hasExternalUrl) {
    return "Add a file, prompt text, or external delivery link";
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
    previewPages: Number(previewPagesInput?.value || 3),
    bookAuthor: bookAuthorInput?.value.trim() || "",
    promptText: promptTextInput?.value.trim() || "",
    deliveryIncludes: deliveryIncludesInput?.value.trim() || "",
    externalUrl: externalUrlInput?.value.trim() || "",
    deliveryInstructions: deliveryInstructionsInput?.value.trim() || "",
    isPremium: Boolean(premiumInput?.checked),
    isFeatured: Boolean(featuredInput?.checked),
    description: descriptionEl.value.trim(),
    file: selectedProductFile || fileInput.files?.[0] || null,
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
  formData.append("promptText", payload.promptText);
  formData.append("deliveryIncludes", payload.deliveryIncludes);
  formData.append("externalUrl", payload.externalUrl);
  formData.append("deliveryInstructions", payload.deliveryInstructions);
  formData.append("isPremium", String(payload.isPremium));
  formData.append("isFeatured", String(payload.isFeatured));
  formData.append("description", payload.description);
  if (payload.file) {
    formData.append("productFile", payload.file);
  }
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

function buildCreatorAssistPayload() {
  const promptText = promptTextInput?.value.trim() || "";
  const description = descriptionEl.value.trim();
  return {
    title: document.getElementById("title").value.trim(),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    language: document.getElementById("language").value,
    price: Number(priceInput?.value || 0),
    tags,
    notes: [description, deliveryIncludesInput?.value.trim() || ""].filter(Boolean).join("\n"),
    excerpt: [promptText, description].filter(Boolean).join("\n\n"),
  };
}

async function runCreatorAssist() {
  const payload = buildCreatorAssistPayload();
  if (payload.title.length < 3) {
    showToast("Add a title before running full AI assist", "error");
    return;
  }

  runCreatorAssistBtn.disabled = true;
  runCreatorAssistBtn.textContent = "Running AI Assist...";
  showStatus("Building title, thumbnail, pricing and launch guidance...", "info");

  try {
    const response = await fetch(`${API_BASE}/api/ai/creator-assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to generate creator assist suggestions");
    }

    latestCreatorAssist = data;
    if (data.description) {
      descriptionEl.value = data.description;
      updateDescriptionCounter();
    }

    if (!payload.category && data.suggestedCategory) {
      document.getElementById("category").value = data.suggestedCategory;
    }

    renderCreatorAssist(data);
    setUploadAiProvider(data.provider, data.model, "Creator studio");
    showStatus("AI creator assist refreshed your listing strategy.", "success");
    showToast("AI creator assist ready", "success");
  } catch (error) {
    showStatus(error.message || "Unable to run creator assist", "error");
    showToast(error.message || "Unable to run creator assist", "error");
  } finally {
    runCreatorAssistBtn.disabled = false;
    runCreatorAssistBtn.textContent = "Run Full AI Assist";
  }
}

function renderCreatorAssist(data) {
  renderTitleSuggestions(data.titleSuggestions || []);
  renderSuggestedCategory(data.suggestedCategory || "");
  renderSuggestedTags(data.generatedTags || []);
  renderThumbnailIdeas(data.thumbnailIdeas || []);
  renderPricingInsight(data.pricing || null);
  renderReadiness(data.readiness || null);
}

function renderTitleSuggestions(suggestions) {
  if (!titleSuggestionList) {
    return;
  }

  if (!Array.isArray(suggestions) || !suggestions.length) {
    titleSuggestionList.innerHTML = "<p class=\"creator-ai-empty\">No title suggestions yet.</p>";
    return;
  }

  titleSuggestionList.innerHTML = `<div class="suggestion-pills">${suggestions.map((title) => `
    <div class="suggestion-pill">
      <span>${escapeHTML(title)}</span>
      <button type="button" data-apply-title="${escapeHTML(title)}">Use</button>
    </div>
  `).join("")}</div>`;

  titleSuggestionList.querySelectorAll("[data-apply-title]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("title").value = button.getAttribute("data-apply-title") || "";
      showToast("Title updated from AI suggestion", "success");
    });
  });
}

function renderSuggestedCategory(category) {
  if (!suggestedCategoryText) {
    return;
  }

  suggestedCategoryText.textContent = category || "No AI category yet";
  if (applySuggestedCategoryBtn) {
    applySuggestedCategoryBtn.disabled = !category;
  }
}

function renderSuggestedTags(tagSuggestions) {
  if (!suggestedTagList) {
    return;
  }

  if (!Array.isArray(tagSuggestions) || !tagSuggestions.length) {
    suggestedTagList.innerHTML = "<p class=\"creator-ai-empty\">Suggested search tags will appear here.</p>";
    return;
  }

  suggestedTagList.innerHTML = tagSuggestions.map((tag) => `
    <div class="tag-suggestion-chip">
      <span>${escapeHTML(String(tag || "").toLowerCase())}</span>
      <button type="button" data-add-tag="${escapeHTML(String(tag || "").toLowerCase())}">Add</button>
    </div>
  `).join("");

  suggestedTagList.querySelectorAll("[data-add-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = (button.getAttribute("data-add-tag") || "").trim().toLowerCase();
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

      tags = [...tags, value];
      renderTags();
      showToast("Tag added to listing", "success");
    });
  });
}

function renderThumbnailIdeas(ideas) {
  if (!thumbnailIdeaList) {
    return;
  }

  if (!Array.isArray(ideas) || !ideas.length) {
    thumbnailIdeaList.innerHTML = "<p class=\"creator-ai-empty\">AI cover directions will appear here.</p>";
    return;
  }

  thumbnailIdeaList.innerHTML = ideas.map((idea) => `
    <article class="thumbnail-idea-card">
      <strong>${escapeHTML(idea.name || "Thumbnail direction")}</strong>
      <p>${escapeHTML(idea.prompt || "")}</p>
    </article>
  `).join("");
}

function renderPricingInsight(pricing) {
  if (!pricingInsightBox) {
    return;
  }

  if (!pricing) {
    pricingInsightBox.innerHTML = "<p class=\"creator-ai-empty\">Pricing guidance appears after AI assist runs.</p>";
    return;
  }

  pricingInsightBox.innerHTML = `
    <strong>${escapeHTML(pricing.positioning || "Digital product positioning")}</strong>
    <p>${escapeHTML(pricing.message || "")}</p>
    <p>Suggested band: Rs. ${Number(pricing.suggestedMin || 0).toLocaleString("en-IN")} to Rs. ${Number(pricing.suggestedMax || 0).toLocaleString("en-IN")}</p>
  `;
}

function renderReadiness(readiness) {
  if (!readinessScoreText || !readinessStatusText || !readinessList) {
    return;
  }

  if (!readiness) {
    readinessScoreText.textContent = "--";
    readinessStatusText.textContent = "Waiting for AI preflight";
    readinessList.innerHTML = "<li>Add your draft details, then run AI assist.</li>";
    return;
  }

  readinessScoreText.textContent = `${Number(readiness.score || 0)} / 100`;
  readinessStatusText.textContent = readiness.status || "Ready";
  const points = [
    ...(Array.isArray(readiness.strengths) ? readiness.strengths : []),
    ...(Array.isArray(readiness.warnings) ? readiness.warnings : []),
  ];
  readinessList.innerHTML = (points.length ? points : ["No readiness notes yet."])
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("");
}

function applySuggestedCategory() {
  if (!latestCreatorAssist?.suggestedCategory) {
    showToast("Run AI assist first to get a category suggestion", "error");
    return;
  }

  document.getElementById("category").value = latestCreatorAssist.suggestedCategory;
  showToast("AI category applied to the listing", "success");
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

async function hydrateAiRuntime() {
  try {
    const response = await fetch(`${API_BASE}/api/ai/status`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to load AI status");
    }

    setUploadAiProvider(data.provider, data.model, "Studio boot");

    if (data.provider === "openai") {
      showStatus("AI studio is connected to hosted model tools for live suggestions and review checks.", "success");
      return;
    }

    if (data.provider === "ollama") {
      showStatus("AI studio is connected to your local Ollama model on this deployment.", "success");
      return;
    }

    showStatus(
      "AI studio is running in local fallback mode. Description and creator assist still work, but no hosted AI model is configured on this deployment.",
      "info"
    );
  } catch (error) {
    console.error("AI status load failed:", error);
    setUploadAiProvider("local", "local-heuristic", "Studio boot");
    showStatus(
      "AI studio status could not be confirmed. You can still try the description and creator assist tools.",
      "warning"
    );
  }
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

function setStudioBootState(loading, message = "") {
  uploadCard?.classList.toggle("upload-card--booting", loading);
  form?.classList.toggle("is-loading", loading);

  if (form) {
    form.setAttribute("aria-busy", loading ? "true" : "false");
    if (loading) {
      form.setAttribute("inert", "");
    } else {
      form.removeAttribute("inert");
    }
  }

  if (!uploadReadinessBanner) {
    return;
  }

  uploadReadinessBanner.hidden = !loading;
  if (loading && message) {
    uploadReadinessBanner.textContent = message;
  }
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
    previewPages: String(payload.previewPages || "3"),
    bookAuthor: payload.bookAuthor,
    promptText: payload.promptText,
    deliveryIncludes: payload.deliveryIncludes,
    externalUrl: payload.externalUrl,
    deliveryInstructions: payload.deliveryInstructions,
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
    updateProductTypeUI();
    document.getElementById("category").value = draft.category || "";
    if (subcategoryInput) subcategoryInput.value = draft.subcategory || "";
    document.getElementById("language").value = draft.language || "English";
    document.getElementById("price").value = draft.price || "";
    if (originalPriceInput) originalPriceInput.value = draft.originalPrice || "";
    if (previewPagesInput) previewPagesInput.value = draft.previewPages || "3";
    if (bookAuthorInput) bookAuthorInput.value = draft.bookAuthor || "";
    if (promptTextInput) promptTextInput.value = draft.promptText || "";
    if (deliveryIncludesInput) deliveryIncludesInput.value = draft.deliveryIncludes || "";
    if (externalUrlInput) externalUrlInput.value = draft.externalUrl || "";
    if (deliveryInstructionsInput) deliveryInstructionsInput.value = draft.deliveryInstructions || "";
    if (premiumInput) premiumInput.checked = Boolean(draft.isPremium);
    if (featuredInput) featuredInput.checked = Boolean(draft.isFeatured);
    descriptionEl.value = draft.description || "";
    document.getElementById("copyright").checked = Boolean(draft.copyright);
    tags = Array.isArray(draft.tags) ? draft.tags : [];
    renderTags();
    showStatus("Draft restored. Add your product file and cover again before publishing.", "info");
  } catch (error) {
    console.error("Draft restore failed:", error);
    localStorage.removeItem(DRAFT_KEY);
  }
}

function resetForm(options = {}) {
  form.reset();
  tags = [];
  selectedProductFile = null;
  selectedCoverFile = null;
  latestCreatorAssist = null;
  progressBar.style.width = "0%";
  aiScoreEl.textContent = "--";
  hydrateTypeSelect();
  updateProductTypeUI();
  renderDropZonePlaceholder();
  renderThumbnailPlaceholder();
  if (fileInput) {
    fileInput.value = "";
  }
  thumbnailInput.value = "";
  if (previewPagesInput) previewPagesInput.value = "3";
  renderTags();
  updateRoyalty();
  updateDescriptionCounter();
  renderCreatorAssist({
    titleSuggestions: [],
    suggestedCategory: "",
    generatedTags: [],
    thumbnailIdeas: [],
    pricing: null,
    readiness: null,
  });
  if (!options.preserveProvider) {
    setUploadAiProvider();
  }
  syncUploadActionButtons();
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

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, "&quot;");
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
