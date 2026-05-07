const API_BASE = window.API_BASE || "https://ebook-website-v2mj.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const clearBtn = document.getElementById("clearBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const manualCheckoutBtn = document.getElementById("manualCheckoutBtn");
const cartMessage = document.getElementById("cartMessage");

async function fetchCart() {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load cart");
  return data;
}

async function removeItem(bookId) {
  const res = await fetch(`${API_BASE}/api/cart/${bookId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to remove item");
  }
}

async function clearCart() {
  const res = await fetch(`${API_BASE}/api/cart`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to clear cart");
  }
}

async function render() {
  try {
    const data = await fetchCart();
    const items = data.items || [];
    cartList.innerHTML = "";

    if (!items.length) {
      cartList.innerHTML = "<p>Your cart is empty.</p>";
      cartTotal.textContent = "₹0";
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #333;";
      row.innerHTML = `
        <div>
          <div style="font-weight:600;">${item.book?.title || "Book"}</div>
          <div style="color:#9ca3af;">₹${Number(item.priceAtAdd || 0).toLocaleString("en-IN")}</div>
        </div>
        <button data-book-id="${item.book?._id}">Remove</button>
      `;
      cartList.appendChild(row);
    });

    cartTotal.textContent = `₹${Number(data.total || 0).toLocaleString("en-IN")}`;
    if (checkoutBtn) checkoutBtn.disabled = false;

    cartList.querySelectorAll("button[data-book-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await removeItem(btn.dataset.bookId);
          await render();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    cartList.innerHTML = `<p>${err.message}</p>`;
    if (checkoutBtn) checkoutBtn.disabled = true;
  }
}

clearBtn?.addEventListener("click", async () => {
  try {
    await clearCart();
    await render();
  } catch (err) {
    alert(err.message);
  }
});

checkoutBtn?.addEventListener("click", async () => {
  try {
    checkoutBtn.disabled = true;
    cartMessage.textContent = "Creating Stripe checkout session...";
    const cart = await fetchCart();
    const bookIds = (cart.items || []).map((i) => i.book?._id).filter(Boolean);
    if (!bookIds.length) {
      cartMessage.textContent = "Your cart is empty.";
      return;
    }
    const res = await fetch(`${API_BASE}/api/payments/create-checkout-cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Checkout failed");
    if (!data.url) {
      cartMessage.textContent = data.message || "No payable items found.";
      return;
    }
    window.location.href = data.url;
  } catch (err) {
    cartMessage.textContent = err.message || "Checkout failed";
  } finally {
    checkoutBtn.disabled = false;
  }
});

manualCheckoutBtn?.addEventListener("click", () => {
  window.location.href = "checkout.html";
});

render();
