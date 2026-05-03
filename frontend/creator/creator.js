async function loadCreatorProfile() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");

  if (!username) {
    renderCreatorError("Creator profile not found.");
    return;
  }

  try {
    const data = await apiFetchJson(`/api/creator/${username}`);
    renderCreator(data.creator, data.books || []);

    if (getToken()) {
      await syncFollowState(username);
    }
  } catch (error) {
    renderCreatorError(error.message || "Unable to load creator profile.");
  }
}

function renderCreator(creator, books) {
  document.getElementById("creatorName").textContent = creator.name;
  document.getElementById("creatorBio").textContent = creator.bio;
  document.getElementById("creatorAbout").textContent = creator.bio;
  document.getElementById("creatorAvatar").src =
    creator.avatar || "../assets/default-avatar.png";

  const verifiedBadge = document.getElementById("verifiedBadge");
  verifiedBadge.style.display = creator.verified ? "inline-flex" : "none";

  document.getElementById("booksCount").textContent = creator.stats.books;
  document.getElementById("followersCount").textContent = creator.followers;
  document.getElementById("salesCount").textContent = creator.stats.sales;
  document.getElementById("earnings").textContent = formatCurrency(
    creator.stats.earnings
  );

  const website = document.getElementById("creatorWebsite");
  if (creator.website) {
    website.href = creator.website;
    website.style.display = "inline-flex";
  } else {
    website.style.display = "none";
  }

  renderCreatorBooks(books);
}

function renderCreatorBooks(books) {
  const grid = document.getElementById("booksGrid");

  if (!books.length) {
    grid.innerHTML = "<p>No approved books published yet.</p>";
    return;
  }

  grid.innerHTML = books
    .map((book) => {
      return `
        <article class="book-card">
          <img src="${book.coverImage}" class="book-cover" alt="${escapeHtml(book.title)}">
          <div class="book-info">
            <h3>${escapeHtml(book.title)}</h3>
            <p class="price">${formatCurrency(book.price)}</p>
            <a href="../book_view.html?id=${book._id}" class="btn-outline">
              View Book
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCreatorError(message) {
  document.getElementById("creatorName").textContent = "Creator unavailable";
  document.getElementById("creatorBio").textContent = message;
  document.getElementById("creatorAbout").textContent = message;
  document.getElementById("booksGrid").innerHTML = `<p>${escapeHtml(message)}</p>`;
}

async function syncFollowState(username) {
  try {
    const data = await apiFetchJson(`/api/creator/${username}/follow-state`);
    updateFollowButton(data.following, data.followers);
  } catch (error) {
    updateFollowButton(false);
  }
}

function updateFollowButton(isFollowing, followerCount) {
  const button = document.getElementById("followBtn");
  if (!button) {
    return;
  }

  button.textContent = isFollowing ? "Following" : "Follow Creator";
  button.classList.toggle("following", Boolean(isFollowing));

  if (typeof followerCount === "number") {
    document.getElementById("followersCount").textContent = followerCount;
  }
}

async function handleFollow() {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const username = params.get("username");
  if (!username) {
    return;
  }

  try {
    const data = await apiFetchJson(`/api/creator/${username}/follow`, {
      method: "POST",
    });
    updateFollowButton(data.following, data.followers);
  } catch (error) {
    alert(error.message || "Unable to update follow state.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const followBtn = document.getElementById("followBtn");
  if (followBtn) {
    followBtn.addEventListener("click", handleFollow);
  }

  loadCreatorProfile();
});
