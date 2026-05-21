const http = require("http");
const https = require("https");
const { URL } = require("url");
const {
  getFrontendBaseUrl,
  normalizeUrl,
} = require("../utils/urlConfig");

const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || "true").toLowerCase() !== "false";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function isEmailConfigured() {
  return EMAIL_ENABLED && Boolean(process.env.RESEND_API_KEY || process.env.EMAIL_WEBHOOK_URL);
}

function buildAbsoluteFrontendUrl(pathOrUrl = "") {
  const source = String(pathOrUrl || "").trim();
  if (!source) {
    return normalizeUrl(getFrontendBaseUrl()) || "";
  }

  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  const base = normalizeUrl(getFrontendBaseUrl()) || "";
  if (!base) {
    return source.replace(/^\//, "");
  }

  return `${base.replace(/\/$/, "")}/${source.replace(/^\//, "")}`;
}

function escapeHtml(value = "") {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderEmailTemplate({
  headline,
  body,
  ctaLabel = "",
  ctaUrl = "",
  footerNote = "",
}) {
  const safeHeadline = escapeHtml(headline || "Marketplace update");
  const safeBody = escapeHtml(body || "");
  const safeFooter = escapeHtml(footerNote || "You are receiving this because your account notifications are enabled.");
  const absoluteCtaUrl = buildAbsoluteFrontendUrl(ctaUrl);

  return `
    <div style="margin:0;padding:32px;background:#07111c;font-family:Arial,sans-serif;color:#eaf6ff;">
      <div style="max-width:640px;margin:0 auto;background:linear-gradient(180deg,#0d1b2d,#08111d);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(88,208,255,0.14);color:#d8f6ff;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
          Youth Creator Marketplace
        </div>
        <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.15;">${safeHeadline}</h1>
        <p style="margin:0;font-size:16px;line-height:1.7;color:#c5d9e8;">${safeBody}</p>
        ${ctaLabel && absoluteCtaUrl
          ? `<div style="margin-top:28px;"><a href="${escapeHtml(absoluteCtaUrl)}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:linear-gradient(135deg,#58d0ff,#8b7dff);color:#04111d;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>`
          : ""
        }
        <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#88a3b8;">${safeFooter}</p>
      </div>
    </div>
  `;
}

function sendJsonRequest(endpoint, { method = "POST", headers = {}, body = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const client = url.protocol === "http:" ? http : https;
    const payload = JSON.stringify(body || {});

    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const success = Number(res.statusCode || 500) >= 200 && Number(res.statusCode || 500) < 300;
          if (!success) {
            return reject(new Error(responseBody || `Email request failed with status ${res.statusCode}`));
          }

          let parsed = {};
          try {
            parsed = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            parsed = { raw: responseBody };
          }

          return resolve(parsed);
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sendTransactionalEmail({
  to,
  subject,
  html = "",
  text = "",
  replyTo = "",
  tags = [],
}) {
  const recipient = String(to || "").trim();
  if (!EMAIL_ENABLED || !recipient || !subject) {
    return { success: false, skipped: true };
  }

  const from = String(process.env.EMAIL_FROM || process.env.ADMIN_EMAIL || "noreply@example.com").trim();

  if (process.env.RESEND_API_KEY) {
    await sendJsonRequest(RESEND_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: {
        from,
        to: [recipient],
        subject: String(subject).trim().slice(0, 140),
        html,
        text,
        reply_to: replyTo || undefined,
        tags: Array.isArray(tags) ? tags : [],
      },
    });

    return { success: true, provider: "resend" };
  }

  if (process.env.EMAIL_WEBHOOK_URL) {
    await sendJsonRequest(process.env.EMAIL_WEBHOOK_URL, {
      headers: process.env.EMAIL_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
        : {},
      body: {
        from,
        to: recipient,
        subject: String(subject).trim().slice(0, 140),
        html,
        text,
        replyTo: replyTo || "",
        tags: Array.isArray(tags) ? tags : [],
      },
    });

    return { success: true, provider: "webhook" };
  }

  return { success: false, skipped: true };
}

module.exports = {
  isEmailConfigured,
  buildAbsoluteFrontendUrl,
  renderEmailTemplate,
  sendTransactionalEmail,
};
