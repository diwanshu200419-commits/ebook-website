/* =====================================
   CONFIG
===================================== */

const API_BASE = "http://localhost:5000";
const token = localStorage.getItem("token");

if (!token || token === "null" || token === "undefined") {
  redirectToLogin();
}

protectPage(["creator", "author"]);

/* =====================================
   ELEMENTS
===================================== */

const form = document.getElementById("uploadForm");
const tagInput = document.getElementById("tagInput");
const tagContainer = document.getElementById("tagContainer");
const thumbnailInput = document.getElementById("thumbnail");
const thumbnailBox = document.getElementById("thumbnailBox");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("file");
const priceInput = document.getElementById("price");
const earnPreview = document.getElementById("earnPreview");
const progressBar = document.getElementById("progressBar");
const aiScoreEl = document.getElementById("aiScore");
const statusMessage = document.getElementById("statusMessage");

let tags = [];
let isUploading = false;

/* =====================================
   SMART TAG SYSTEM
===================================== */

tagInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    const value = tagInput.value.trim().toLowerCase();

    if (!value) return;
    if (tags.includes(value)) return showError("Tag already added");
    if (tags.length >= 5) return showError("Maximum 5 tags allowed");

    tags.push(value);
    tagInput.value = "";
    renderTags();
  }
});

function renderTags() {
  tagContainer.innerHTML = "";

  tags.forEach((tag, index) => {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.innerHTML = `${tag} <span>×</span>`;

    chip.querySelector("span").addEventListener("click", () => {
      tags.splice(index, 1);
      renderTags();
    });

    tagContainer.appendChild(chip);
  });

  tagContainer.appendChild(tagInput);
}

/* =====================================
   THUMBNAIL PREVIEW
===================================== */

thumbnailBox?.addEventListener("click", () => {
  thumbnailInput.click();
});

thumbnailInput?.addEventListener("change", () => {
  const file = thumbnailInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    return showError("Only image files allowed");
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    thumbnailBox.innerHTML = `<img src="${e.target.result}" />`;
  };
  reader.readAsDataURL(file);
});

/* =====================================
   DRAG & DROP PDF
===================================== */

dropZone?.addEventListener("click", () => fileInput.click());

dropZone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone?.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");

  const file = e.dataTransfer.files[0];

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return showError("Only PDF files allowed");
  }

  if (file.size > 50 * 1024 * 1024) {
    return showError("Max file size 50MB");
  }

  fileInput.files = e.dataTransfer.files;
  dropZone.innerHTML = `<p>${file.name}</p>`;
});

/* =====================================
   ROYALTY CALCULATION
===================================== */

priceInput?.addEventListener("input", () => {
  const price = Number(priceInput.value || 0);

  let royalty = 0.81;
  if (price > 1000) royalty = 0.85;
  if (price === 0) royalty = 0;

  earnPreview.innerText = Math.floor(price * royalty);
});

/* =====================================
   MAIN SUBMIT HANDLER
===================================== */

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  uploadContent();
});

async function uploadContent() {

  if (isUploading) return;

  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const language = document.getElementById("language").value;
  const price = Number(priceInput.value || 0);
  const description = document.getElementById("description").value.trim();
  const file = fileInput.files[0];
  const thumbnail = thumbnailInput.files[0];
  const copyright = document.getElementById("copyright").checked;

  /* ---------- VALIDATION ---------- */

  if (!title || title.length < 5)
    return showError("Title must be at least 5 characters");

  if (!type)
    return showError("Select content type");

  if (!category)
    return showError("Select category");

  if (!file)
    return showError("Upload PDF file");

  if (tags.length === 0)
    return showError("Add at least 1 tag");

  if (description.length < 30)
    return showError("Description too short");

  if (!copyright)
    return showError("You must confirm ownership");

  /* ---------- UPLOAD ---------- */

  isUploading = true;
  showStatus("Uploading... Please wait.", "info");

  const formData = new FormData();
  formData.append("title", title);
  formData.append("type", type);
  formData.append("category", category);
  formData.append("language", language);
  formData.append("price", price);
  formData.append("description", description);
  formData.append("tags", JSON.stringify(tags));
  formData.append("bookFile", file);
  if (thumbnail) formData.append("thumbnail", thumbnail);

  try {

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/books/upload`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressBar.style.width = percent + "%";
      }
    };

    xhr.onload = () => {

      isUploading = false;

      if (xhr.status === 201) {

        const response = JSON.parse(xhr.responseText);

        if (response.aiScore) {
          aiScoreEl.innerText = response.aiScore + "%";
        } else {
          simulateAIScore();
        }

        showStatus("Submitted successfully for AI review 🚀", "success");
        resetForm();

      } else if (xhr.status === 401) {
        redirectToLogin();
      } else {
        showStatus("Upload failed. Try again.", "error");
      }
    };

    xhr.onerror = () => {
      isUploading = false;
      showStatus("Network error. Try again.", "error");
    };

    xhr.send(formData);

  } catch (err) {
    isUploading = false;
    console.error(err);
    showStatus("Unexpected error occurred.", "error");
  }
}

/* =====================================
   STATUS HANDLER
===================================== */

function showStatus(message, type) {
  if (!statusMessage) return;

  statusMessage.innerText = message;
  statusMessage.className = "status-message " + type;
}

/* =====================================
   RESET FORM
===================================== */

function resetForm() {
  form.reset();
  tags = [];
  renderTags();
  progressBar.style.width = "0%";
}

/* =====================================
   REDIRECT
===================================== */

function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../login.html";
}

/* =====================================
   AI SCORE (TEMP)
===================================== */

function simulateAIScore() {
  const score = Math.floor(Math.random() * 20) + 80;
  aiScoreEl.innerText = score + "%";
}