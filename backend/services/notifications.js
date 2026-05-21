const Notification = require("../models/Notification");
const User = require("../models/user");
const {
  renderEmailTemplate,
  sendTransactionalEmail,
} = require("./emailService");

const VALID_CATEGORIES = new Set([
  "general",
  "sale",
  "follow",
  "release",
  "streak",
  "nudge",
  "purchase",
  "cart",
  "referral",
]);

function normalizeLink(value = "") {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  return source.replace(/^\//, "");
}

function normalizePreferenceKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (!key) {
    return "";
  }

  if (key === "sale") {
    return "sales";
  }

  if (key === "follow") {
    return "follows";
  }

  if (key === "release") {
    return "releases";
  }

  return key;
}

function normalizeCategory(value = "") {
  const category = String(value || "").trim().toLowerCase();
  if (!category) {
    return "general";
  }

  return VALID_CATEGORIES.has(category) ? category : "general";
}

function userAllowsNotification(user, preferenceKey = "") {
  if (!user) {
    return false;
  }

  if (user.isDeleted || user.status === "blocked") {
    return false;
  }

  const normalizedPreference = normalizePreferenceKey(preferenceKey);
  if (!normalizedPreference) {
    return true;
  }

  return user.notifications?.[normalizedPreference] !== false;
}

function userAllowsEmail(user, preferenceKey = "") {
  if (!userAllowsNotification(user, preferenceKey)) {
    return false;
  }

  return Boolean(user?.email) && user.notifications?.email !== false;
}

function buildEmailContent({ title, message, link = "", email = {} }) {
  const subject = String(email.subject || title || "").trim().slice(0, 140);
  if (!subject) {
    return null;
  }

  const text = String(email.text || message || "").trim();
  const html = String(
    email.html
    || renderEmailTemplate({
      headline: email.headline || title,
      body: email.body || message,
      ctaLabel: email.ctaLabel || "Open marketplace",
      ctaUrl: email.ctaUrl || link,
      footerNote: email.footerNote || "",
    })
  ).trim();

  return {
    subject,
    text,
    html,
    replyTo: email.replyTo || "",
    tags: Array.isArray(email.tags) ? email.tags : [],
  };
}

async function resolveSingleUser(user, preferenceKey = "") {
  if (!user) {
    return null;
  }

  if (typeof user === "object" && user._id) {
    return userAllowsNotification(user, preferenceKey) ? user : null;
  }

  if (!preferenceKey) {
    return { _id: user };
  }

  const foundUser = await User.findById(user)
    .select("email notifications status isDeleted");

  return userAllowsNotification(foundUser, preferenceKey) ? foundUser : null;
}

async function resolveManyUsers({ userIds = [], users = [], preferenceKey = "" }) {
  const uniqueUserIds = [...new Set(
    userIds
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];

  if (Array.isArray(users) && users.length) {
    return users.filter((user) => userAllowsNotification(user, preferenceKey));
  }

  if (!uniqueUserIds.length) {
    return [];
  }

  if (!preferenceKey) {
    return uniqueUserIds.map((userId) => ({ _id: userId }));
  }

  const foundUsers = await User.find({
    _id: { $in: uniqueUserIds },
  }).select("email notifications status isDeleted");

  return foundUsers.filter((user) => userAllowsNotification(user, preferenceKey));
}

async function createNotification({
  user,
  type = "info",
  category = "general",
  preferenceKey = "",
  title,
  message,
  link = "",
  email = null,
}) {
  if (!user || !title || !message) {
    return null;
  }

  const resolvedUser = await resolveSingleUser(user, preferenceKey);
  if (!resolvedUser?._id) {
    return null;
  }

  const notification = await Notification.create({
    user: resolvedUser._id,
    type,
    category: normalizeCategory(category),
    title: String(title).trim().slice(0, 140),
    message: String(message).trim().slice(0, 600),
    link: normalizeLink(link),
  });

  const deliveryMeta = {
    emailEligible: false,
    emailAttempted: false,
    emailDelivered: false,
    emailProvider: "",
  };

  if (email && userAllowsEmail(resolvedUser, preferenceKey)) {
    deliveryMeta.emailEligible = true;
    const emailContent = buildEmailContent({ title, message, link, email });
    if (emailContent) {
      try {
        const emailResult = await sendTransactionalEmail({
          to: resolvedUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          replyTo: emailContent.replyTo,
          tags: emailContent.tags,
        });

        deliveryMeta.emailAttempted = emailResult?.skipped !== true;
        deliveryMeta.emailDelivered = emailResult?.success === true && emailResult?.skipped !== true;
        deliveryMeta.emailProvider = String(emailResult?.provider || "").trim();
      } catch (error) {
        deliveryMeta.emailAttempted = true;
        console.error("Notification Email Error:", error.message);
      }
    }
  }

  notification.deliveryMeta = deliveryMeta;

  return notification;
}

async function createNotifications({
  userIds = [],
  users = [],
  type = "info",
  category = "general",
  preferenceKey = "",
  title,
  message,
  link = "",
  email = null,
}) {
  if ((!userIds.length && !users.length) || !title || !message) {
    return [];
  }

  const eligibleUsers = await resolveManyUsers({ userIds, users, preferenceKey });
  if (!eligibleUsers.length) {
    return [];
  }

  const notifications = await Notification.insertMany(
    eligibleUsers.map((user) => ({
      user: user._id,
      type,
      category: normalizeCategory(category),
      title: String(title).trim().slice(0, 140),
      message: String(message).trim().slice(0, 600),
      link: normalizeLink(link),
    })),
    { ordered: false }
  );

  if (email) {
    const emailContent = buildEmailContent({ title, message, link, email });
    if (emailContent) {
      await Promise.allSettled(
        eligibleUsers
          .filter((user) => userAllowsEmail(user, preferenceKey))
          .map((user) => sendTransactionalEmail({
            to: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            replyTo: emailContent.replyTo,
            tags: emailContent.tags,
          }))
      );
    }
  }

  return notifications;
}

module.exports = {
  createNotification,
  createNotifications,
  userAllowsNotification,
  userAllowsEmail,
};
