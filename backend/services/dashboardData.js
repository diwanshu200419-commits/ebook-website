const { serializeBook } = require("./bookData");
const { buildSignedBookAccessUrls } = require("./bookAccess");
const { getRevenueSplit, roundMoney } = require("../utils/revenue");

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function buildMonthlySeries(entries, valueSelector, months = 6, dateSelector) {
  const labels = [];
  const values = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const bucketDate = new Date();
    bucketDate.setDate(1);
    bucketDate.setHours(0, 0, 0, 0);
    bucketDate.setMonth(bucketDate.getMonth() - index);

    const month = bucketDate.getMonth();
    const year = bucketDate.getFullYear();

    const total = entries.reduce((sum, entry) => {
      const sourceDate = normalizeDate(
        typeof dateSelector === "function" ? dateSelector(entry) : entry?.createdAt
      );

      if (!sourceDate) {
        return sum;
      }

      if (
        sourceDate.getMonth() === month &&
        sourceDate.getFullYear() === year
      ) {
        return sum + Number(valueSelector(entry) || 0);
      }

      return sum;
    }, 0);

    labels.push(MONTH_NAMES[month]);
    values.push(roundMoney(total));
  }

  return { labels, values };
}

function buildProfilePayload(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.profileImage || "/assets/default-avatar.png",
    bio: user.bio || "",
    joinedAt: user.createdAt,
    lastLogin: user.lastLogin || null,
  };
}

function buildStatusBreakdown(books) {
  return books.reduce((accumulator, book) => {
    const key = book.isArchived ? "Archived" : (book.status || "Unknown");
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function buildCategoryRevenue(books) {
  return books.reduce((accumulator, book) => {
    const key = book.category || "Other";
    accumulator[key] = roundMoney(
      Number(accumulator[key] || 0) + Number(book.earnings || 0)
    );
    return accumulator;
  }, {});
}

function buildCategoryCounts(books) {
  return books.reduce((accumulator, book) => {
    const key = book.category || "Other";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function buildTopBooks(books, backendBaseUrl = "") {
  return books
    .map((book) => serializeBook(book, { backendBaseUrl, includeFilePath: false }))
    .sort((left, right) => {
      if ((right.salesCount || 0) !== (left.salesCount || 0)) {
        return (right.salesCount || 0) - (left.salesCount || 0);
      }

      if ((right.earnings || 0) !== (left.earnings || 0)) {
        return (right.earnings || 0) - (left.earnings || 0);
      }

      return (right.downloads || 0) - (left.downloads || 0);
    })
    .slice(0, 5)
    .map((book) => ({
      id: book._id,
      title: book.title,
      category: book.category,
      coverImage: book.coverImage,
      coverUrl: book.coverUrl,
      sales: book.salesCount || 0,
      downloads: book.downloads || 0,
      views: book.views || 0,
      earnings: roundMoney(book.earnings || 0),
      revenue: roundMoney(book.earnings || 0),
      status: book.status,
    }));
}

function buildRecentSales(payments) {
  return payments
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 8)
    .map((payment) => {
      const split = getRevenueSplit(payment.creatorAmount || payment.amount || 0);
      return {
        id: payment._id,
        amount: roundMoney(payment.creatorAmount || split.creatorAmount),
        grossAmount: roundMoney(payment.amount || 0),
        status: payment.status,
        paymentMethod: payment.paymentMethod || "Other",
        transactionId: payment.paymentReference || payment.transactionId,
        createdAt: payment.createdAt,
        buyer: payment.user?.name || payment.user?.email || "Buyer",
        book: payment.book?.title || "Untitled Book",
      };
    });
}

function buildPurchasePayload(payment, backendBaseUrl = "") {
  const purchaseAccess = {
    canPreview: !payment.book?.isPaid || Boolean(payment.book?.previewPath) || payment.status === "approved",
    canDownload: payment.status === "approved" && Boolean(payment.book?._id),
    isPurchased: payment.status === "approved",
    isOwner: false,
    isAdmin: false,
  };
  const accessUrls = payment.book
    ? buildSignedBookAccessUrls(payment.book, purchaseAccess)
    : { previewAccessUrl: "", downloadAccessUrl: "" };
  const book = payment.book
    ? serializeBook(payment.book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: payment.book.previewPath
          ? `/api/books/${payment.book._id}/preview`
          : "",
        downloadUrl: `/api/books/${payment.book._id}/download`,
        previewAccessUrl: accessUrls.previewAccessUrl,
        downloadAccessUrl: accessUrls.downloadAccessUrl,
        access: purchaseAccess,
      })
    : null;

  return {
    id: payment._id,
    paymentId: payment._id,
    transactionId: payment.paymentReference || payment.transactionId,
    amount: roundMoney(payment.amount || 0),
    creatorAmount: roundMoney(
      payment.creatorAmount || getRevenueSplit(payment.amount || 0).creatorAmount
    ),
    platformFee: roundMoney(
      payment.platformFee || getRevenueSplit(payment.amount || 0).platformFee
    ),
    status: payment.status,
    paymentMethod: payment.paymentMethod || "Other",
    purchaseDate: payment.createdAt,
    bookId: payment.book?._id || null,
    title: payment.book?.title || "Book removed",
    type: payment.book?.type || "Book",
    bookAuthor: payment.book?.bookAuthor || "",
    category: payment.book?.category || "Book",
    subcategory: payment.book?.subcategory || "",
    coverImage: book?.coverImage || "",
    coverUrl: book?.coverUrl || "",
    authorName: payment.book?.authorName || payment.creator?.name || "Creator",
    delivery: book?.delivery || {
      mode: "file",
      label: "Digital delivery",
      includedItems: [],
      previewText: "",
      unlockedText: "",
      instructions: "",
      externalUrl: "",
      hasFile: Boolean(payment.book?.filePath),
      hasText: false,
      hasExternalUrl: false,
    },
    canDownload: payment.status === "approved" && Boolean(payment.book?._id),
    downloadUrl:
      payment.status === "approved" && payment.book?._id
        ? `/api/books/${payment.book._id}/download`
        : "",
    downloadAccessUrl:
      payment.status === "approved" && payment.book?._id
        ? (book?.downloadAccessUrl || "")
        : "",
  };
}

function buildReaderDashboard(user, payments, backendBaseUrl = "") {
  const approvedPayments = payments.filter(
    (payment) => payment.status === "approved" && payment.book
  );

  const purchases = approvedPayments.map((payment) =>
    buildPurchasePayload(payment, backendBaseUrl)
  );

  const orderHistory = payments
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((payment) => buildPurchasePayload(payment, backendBaseUrl));

  const totalSpent = roundMoney(
    approvedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  );

  const pendingOrders = payments.filter((payment) => payment.status === "pending").length;
  const rejectedOrders = payments.filter((payment) => payment.status === "rejected").length;

  return {
    profile: buildProfilePayload(user),
    purchases,
    orderHistory,
    readerStats: {
      totalPurchased: purchases.length,
      totalSpent,
      downloadsUnlocked: purchases.length,
      pendingOrders,
      rejectedOrders,
    },
  };
}

function buildCreatorDashboard(user, books, approvedPayments, backendBaseUrl = "") {
  const totalBooks = books.filter((book) => !book.isArchived).length;
  const totalDownloads = books.reduce(
    (sum, book) => sum + Number(book.downloads || 0),
    0
  );
  const totalViews = books.reduce(
    (sum, book) => sum + Number(book.views || book.downloads || 0),
    0
  );
  const totalSales = approvedPayments.length;
  const totalEarnings = roundMoney(
    approvedPayments.reduce((sum, payment) => {
      const split = getRevenueSplit(payment.amount || 0);
      return sum + Number(payment.creatorAmount || split.creatorAmount);
    }, 0)
  );

  const revenueChart = buildMonthlySeries(
    approvedPayments,
    (payment) => payment.creatorAmount || getRevenueSplit(payment.amount || 0).creatorAmount
  );
  const salesChart = buildMonthlySeries(approvedPayments, () => 1);
  const currentMonthRevenue = revenueChart.values[revenueChart.values.length - 1] || 0;

  const uploadedBooks = books
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((book) => {
      const accessUrls = buildSignedBookAccessUrls(book, {
        canPreview: true,
        canDownload: true,
        isOwner: true,
        isAdmin: false,
        isPurchased: false,
      });

      return serializeBook(book, {
        backendBaseUrl,
        includeFilePath: false,
        previewUrl: book.previewPath ? `/api/books/${book._id}/preview` : "",
        downloadUrl: `/api/books/${book._id}/download`,
        previewAccessUrl: accessUrls.previewAccessUrl,
        downloadAccessUrl: accessUrls.downloadAccessUrl,
        access: {
          canPreview: true,
          canDownload: true,
          isOwner: true,
          isAdmin: false,
          isPurchased: false,
        },
      })
    });

  const creatorScore = Math.min(
    100,
    Math.round(
      totalBooks * 8 +
        totalSales * 6 +
        totalViews * 0.5 +
        totalEarnings / 150
    )
  );

  return {
    profile: buildProfilePayload(user),
    creatorStats: {
      totalBooks,
      totalSales,
      totalViews,
      totalDownloads,
      totalEarnings,
      monthlyEarnings: roundMoney(currentMonthRevenue),
      walletBalance: roundMoney(
        Number(user.wallet?.availableBalance || 0) || totalEarnings
      ),
      creatorScore,
    },
    uploadedBooks,
    chart: revenueChart,
    monthlySales: salesChart.values,
    monthlyRevenue: revenueChart.values,
    topBooks: buildTopBooks(books, backendBaseUrl),
    recentSales: buildRecentSales(approvedPayments),
    categoryRevenue: buildCategoryRevenue(books),
    categoryCounts: buildCategoryCounts(books),
    statusBreakdown: buildStatusBreakdown(books),
  };
}

module.exports = {
  buildCategoryCounts,
  buildMonthlySeries,
  buildPurchasePayload,
  buildProfilePayload,
  buildReaderDashboard,
  buildCreatorDashboard,
};
