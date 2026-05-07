const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// Update these with your real scanner images already prepared.
const PAYMENT_CONFIG = {
  UPI: {
    label: "UPI Payment",
    details: "Pay using any UPI app. Merchant UPI ID below.",
    upiId: "your-upi-id@okaxis",
    qrImage: "assets/payment/gpay-qr.PNG"
  },
  GPay: {
    label: "Google Pay",
    details: "Open GPay and scan this QR. Confirm amount before payment.",
    upiId: "your-upi-id@okaxis",
    qrImage: "assets/payment/gpay-qr.PNG"
  },
  PayPal: {
    label: "PayPal",
    details: "Scan PayPal QR or pay to your PayPal merchant account.",
    upiId: "",
    qrImage: "assets/payment/paypal-qr.PNG"
  }
};

const bookSelect = document.getElementById("bookSelect");
const methodSelect = document.getElementById("methodSelect");
const payInfo = document.getElementById("payInfo");
const amountInfo = document.getElementById("amountInfo");
const upiIdLabel = document.getElementById("upiIdLabel");
const copyUpiBtn = document.getElementById("copyUpiBtn");
const qrImage = document.getElementById("qrImage");
const transactionIdInput = document.getElementById("transactionId");
const screenshotInput = document.getElementById("screenshot");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");
let selectedBookMap = {};

async function fetchCart() {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load cart");
  return data;
}

async function fetchBook(bookId) {
  const res = await fetch(`${API_BASE}/api/books/${bookId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load book");
  return data.book;
}

function renderPaymentMethod() {
  const method = methodSelect.value;
  const cfg = PAYMENT_CONFIG[method] || PAYMENT_CONFIG.UPI;
  payInfo.textContent = `${cfg.label}: ${cfg.details}`;
  qrImage.src = cfg.qrImage;
  upiIdLabel.textContent = cfg.upiId ? `UPI ID: ${cfg.upiId}` : "UPI ID: Not required for PayPal";
  copyUpiBtn.disabled = !cfg.upiId;
}

function renderAmountInfo() {
  const bookId = bookSelect.value;
  const b = selectedBookMap[bookId];
  const amount = Number(b?.price || 0);
  amountInfo.textContent = `Pay exact amount: ₹${amount.toLocaleString("en-IN")}`;
}

async function loadBooksForCheckout() {
  const params = new URLSearchParams(window.location.search);
  const directBookId = params.get("bookId");
  if (directBookId) {
    const book = await fetchBook(directBookId);
    selectedBookMap = { [book._id]: { price: book.price || 0, title: book.title } };
    bookSelect.innerHTML = `<option value="${book._id}">${book.title} - ₹${Number(book.price || 0).toLocaleString("en-IN")}</option>`;
    renderAmountInfo();
    return;
  }

  const cart = await fetchCart();
  const items = (cart.items || []).filter((i) => i.book);
  if (!items.length) {
    bookSelect.innerHTML = `<option value="">No paid books in cart</option>`;
    submitBtn.disabled = true;
    return;
  }
  selectedBookMap = {};
  items.forEach((item) => {
    selectedBookMap[item.book._id] = {
      price: item.priceAtAdd || 0,
      title: item.book.title
    };
  });
  bookSelect.innerHTML = items
    .map((item) => `<option value="${item.book._id}">${item.book.title} - ₹${Number(item.priceAtAdd || 0).toLocaleString("en-IN")}</option>`)
    .join("");
  renderAmountInfo();
}

async function submitManualPayment() {
  const bookId = bookSelect.value;
  const paymentMethod = methodSelect.value;
  const transactionId = transactionIdInput.value.trim();
  const screenshot = screenshotInput.files[0];

  if (!bookId) return (statusEl.textContent = "Select a valid book.");
  if (!transactionId) return (statusEl.textContent = "Enter transaction ID/UTR.");
  if (!screenshot) return (statusEl.textContent = "Upload payment screenshot.");

  const formData = new FormData();
  formData.append("bookId", bookId);
  formData.append("paymentMethod", paymentMethod);
  formData.append("transactionId", transactionId);
  formData.append("screenshot", screenshot);

  submitBtn.disabled = true;
  statusEl.textContent = "Submitting payment proof...";
  try {
    const res = await fetch(`${API_BASE}/api/payments/manual`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Submission failed");
    statusEl.textContent = "Submitted successfully. Awaiting admin verification.";
    try {
      await fetch(`${API_BASE}/api/cart/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    delete selectedBookMap[bookId];
    await loadBooksForCheckout();
    transactionIdInput.value = "";
    screenshotInput.value = "";
  } catch (err) {
    statusEl.textContent = err.message || "Submission failed";
  } finally {
    submitBtn.disabled = false;
  }
}

methodSelect.addEventListener("change", renderPaymentMethod);
bookSelect.addEventListener("change", renderAmountInfo);
submitBtn.addEventListener("click", submitManualPayment);
copyUpiBtn.addEventListener("click", async () => {
  const method = methodSelect.value;
  const upiId = (PAYMENT_CONFIG[method] || PAYMENT_CONFIG.UPI).upiId;
  if (!upiId) return;
  try {
    await navigator.clipboard.writeText(upiId);
    statusEl.textContent = "UPI ID copied.";
  } catch {
    statusEl.textContent = "Could not copy UPI ID.";
  }
});

(async function init() {
  try {
    await loadBooksForCheckout();
    renderPaymentMethod();
  } catch (err) {
    statusEl.textContent = err.message || "Failed to load checkout data.";
    submitBtn.disabled = true;
  }
})();
