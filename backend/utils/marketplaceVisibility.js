const OFFICIAL_PREVIEW_CATALOG_KEY_PREFIX = "official-preview-";
const OFFICIAL_PREVIEW_TITLE = "side hustles for students";
const OFFICIAL_PREVIEW_SUBCATEGORY = "free preview";
const OFFICIAL_PREVIEW_COVER_TOKEN = "ebook_ai.png";
const OFFICIAL_PREVIEW_CATALOG_REGEX = new RegExp(`^${OFFICIAL_PREVIEW_CATALOG_KEY_PREFIX}`, "i");

function normalizeMarketplaceText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isOfficialPreviewCatalogKey(value = "") {
  return OFFICIAL_PREVIEW_CATALOG_REGEX.test(String(value || "").trim());
}

function isOfficialPreviewBookRecord(book = {}) {
  if (isOfficialPreviewCatalogKey(book?.catalogKey)) {
    return true;
  }

  const title = normalizeMarketplaceText(book?.title);
  const subcategory = normalizeMarketplaceText(book?.subcategory);
  const cover = normalizeMarketplaceText(book?.coverImage || book?.cover || book?.coverUrl);

  return title === OFFICIAL_PREVIEW_TITLE
    && subcategory === OFFICIAL_PREVIEW_SUBCATEGORY
    && cover.includes(OFFICIAL_PREVIEW_COVER_TOKEN);
}

function buildOfficialPreviewCatalogFilter() {
  return {
    catalogKey: { $regex: OFFICIAL_PREVIEW_CATALOG_REGEX },
  };
}

function buildPublicMarketplaceDiscoveryFilter(extra = {}) {
  return {
    status: "Approved",
    isArchived: { $ne: true },
    catalogKey: { $not: OFFICIAL_PREVIEW_CATALOG_REGEX },
    ...extra,
  };
}

module.exports = {
  buildOfficialPreviewCatalogFilter,
  buildPublicMarketplaceDiscoveryFilter,
  isOfficialPreviewBookRecord,
  isOfficialPreviewCatalogKey,
  OFFICIAL_PREVIEW_CATALOG_KEY_PREFIX,
};
