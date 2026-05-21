const { createAssetToken, verifyAssetToken } = require("./assetTokens");

const DEFAULT_PREVIEW_TTL_SECONDS = Math.max(
  parseInt(process.env.ASSET_PREVIEW_TTL_SECONDS, 10) || 3600,
  120
);
const DEFAULT_DOWNLOAD_TTL_SECONDS = Math.max(
  parseInt(process.env.ASSET_DOWNLOAD_TTL_SECONDS, 10) || 900,
  60
);

function inferAccessGrant(access = {}) {
  if (access.isAdmin) {
    return "admin";
  }

  if (access.isOwner) {
    return "owner";
  }

  if (access.isPurchased) {
    return "purchased";
  }

  if (access.canDownload) {
    return "authenticated";
  }

  return "public";
}

function buildSignedBookAssetUrl({ bookId, kind, expiresInSeconds, access = {} }) {
  const safeBookId = String(bookId || "").trim();
  const safeKind = kind === "download" ? "download" : "preview";
  if (!safeBookId) {
    return "";
  }

  const token = createAssetToken(
    {
      resource: "book",
      bookId: safeBookId,
      kind: safeKind,
      grant: inferAccessGrant(access),
    },
    expiresInSeconds
  );

  if (!token) {
    return "";
  }

  return `/api/books/${safeBookId}/${safeKind}?asset=${encodeURIComponent(token)}`;
}

function buildSignedBookAccessUrls(book, access = {}) {
  const safeBookId = String(book?._id || book?.id || "").trim();
  if (!safeBookId) {
    return {
      previewAccessUrl: "",
      downloadAccessUrl: "",
    };
  }

  return {
    previewAccessUrl:
      access.canPreview && book?.previewPath
        ? buildSignedBookAssetUrl({
            bookId: safeBookId,
            kind: "preview",
            expiresInSeconds: DEFAULT_PREVIEW_TTL_SECONDS,
            access,
          })
        : "",
    downloadAccessUrl:
      access.canDownload
        ? buildSignedBookAssetUrl({
            bookId: safeBookId,
            kind: "download",
            expiresInSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
            access,
          })
        : "",
  };
}

function verifyBookAssetToken(token, expected = {}) {
  return verifyAssetToken(token, {
    resource: "book",
    bookId: expected.bookId,
    kind: expected.kind,
  });
}

module.exports = {
  buildSignedBookAccessUrls,
  verifyBookAssetToken,
};
