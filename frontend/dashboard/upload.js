const uploadState = {
  tags: [],
  uploading: false,
};

function renderTags() {
  const tagContainer = document.getElementById("tagContainer");
  const tagInput = document.getElementById("tagInput");
  if (!tagContainer || !tagInput) {
    return;
  }

  tagContainer.innerHTML = "";

  uploadState.tags.forEach((tag, index) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.innerHTML = `${escapeHtml(tag)} <span>×</span>`;
    chip.querySelector("span").addEventListener("click", () => {
      uploadState.tags.splice(index, 1);
      renderTags();
    });
    tagContainer.appendChild(chip);
  });

  tagContainer.appendChild(tagInput);
}

function showStatus(message, type = "info") {
  const status = document.getElementById("statusMessage");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `status-message ${type}`;
}

function updateRoyaltyPreview() {
  const price = Number(document.getElementById("price").value || 0);
  const earning = price > 0 ? Math.round(price * 0.81) : 0;
  document.getElementById("earnPreview").textContent = earning.toLocaleString("en-IN");
}

function previewThumbnail() {
  const input = document.getElementById("thumbnail");
  const box = document.getElementById("thumbnailBox");
  const file = input.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    box.innerHTML = `<img src="${event.target.result}" alt="Thumbnail preview">`;
  };
  reader.readAsDataURL(file);
}

function updateSelectedPdf(file) {
  const dropZone = document.getElementById("dropZone");
  dropZone.innerHTML = `
    <p>${escapeHtml(file.name)}</p>
    <small>${Math.round(file.size / 1024 / 1024)} MB selected</small>
  `;
}

function collectUploadData() {
  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const language = document.getElementById("language").value;
  const price = Number(document.getElementById("price").value || 0);
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("file").files[0];
  const thumbnail = document.getElementById("thumbnail").files[0];
  const copyrightConfirmed = document.getElementById("copyright").checked;

  if (!title || title.length < 5) {
    throw new Error("Title must be at least 5 characters");
  }

  if (!type) {
    throw new Error("Select a content type");
  }

  if (!category) {
    throw new Error("Select a category");
  }

  if (!file) {
    throw new Error("Upload a PDF file");
  }

  if (!description || description.length < 30) {
    throw new Error("Description should be at least 30 characters");
  }

  if (!copyrightConfirmed) {
    throw new Error("You must confirm the content is original");
  }

  return {
    title,
    type,
    category,
    language,
    price,
    description,
    file,
    thumbnail,
  };
}

async function submitUpload(status = "AI_Review") {
  if (uploadState.uploading) {
    return;
  }

  try {
    const payload = collectUploadData();
    uploadState.uploading = true;
    showStatus(
      status === "Draft" ? "Saving draft..." : "Uploading content for review...",
      "info"
    );

    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("type", payload.type);
    formData.append("category", payload.category);
    formData.append("language", payload.language);
    formData.append("price", String(payload.price));
    formData.append("description", payload.description);
    formData.append("status", status);
    formData.append("tags", JSON.stringify(uploadState.tags));
    formData.append("bookFile", payload.file);

    if (payload.thumbnail) {
      formData.append("thumbnail", payload.thumbnail);
    }

    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = "25%";

    const response = await apiFetch("/api/books/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    progressBar.style.width = "100%";
    document.getElementById("aiScore").textContent = `${data.aiScore || "--"}%`;
    showStatus(data.message || "Upload completed successfully.", "success");
    document.getElementById("uploadForm").reset();
    uploadState.tags = [];
    renderTags();
    document.getElementById("dropZone").innerHTML = `
      <p>Drag & Drop PDF here</p>
      <small>or click to browse (Max 50MB)</small>
    `;
    document.getElementById("thumbnailBox").innerHTML =
      "<span>Click to Upload Thumbnail</span>";
    updateRoyaltyPreview();
  } catch (error) {
    showStatus(error.message || "Upload failed", "error");
  } finally {
    uploadState.uploading = false;
  }
}

function saveDraft() {
  submitUpload("Draft");
}

function uploadContent() {
  submitUpload("AI_Review");
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await protectPage(["creator", "author", "admin"]);
  if (!user) {
    return;
  }

  const tagInput = document.getElementById("tagInput");
  tagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const tag = tagInput.value.trim();

    if (!tag) {
      return;
    }

    if (uploadState.tags.includes(tag) || uploadState.tags.length >= 5) {
      return;
    }

    uploadState.tags.push(tag);
    tagInput.value = "";
    renderTags();
  });

  document.getElementById("price").addEventListener("input", updateRoyaltyPreview);
  document.getElementById("thumbnailBox").addEventListener("click", () => {
    document.getElementById("thumbnail").click();
  });
  document.getElementById("thumbnail").addEventListener("change", previewThumbnail);
  document.getElementById("description").addEventListener("input", (event) => {
    document.getElementById("descCount").textContent = `${event.target.value.length} / 300`;
  });

  const fileInput = document.getElementById("file");
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
      updateSelectedPdf(file);
    }
  });

  const dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    const file = event.dataTransfer.files[0];

    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      showStatus("Please drop a PDF file.", "error");
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    updateSelectedPdf(file);
  });

  renderTags();
  updateRoyaltyPreview();
});
