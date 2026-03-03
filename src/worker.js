/**
 * Status Page – Cloudflare Worker
 *
 * Routes:
 *   GET  /            → HTML status page
 *   GET  /api/status  → current status as JSON
 *   POST /api/status  → update status  (requires Authorization: Bearer <AUTH_TOKEN>)
 */

const DEFAULT_STATUS = {
    key: "default",
    label: "Available",
    icon: "👋",
    message: "Hey there! Check back later.",
    updatedAt: null,
};

/** Built-in status presets */
const PRESETS = {
    phone: { key: "phone", label: "On my phone", icon: "📱" },
    working: { key: "working", label: "Working", icon: "💻" },
    coding: { key: "coding", label: "Writing code", icon: "👨‍💻" },
    sleeping: { key: "sleeping", label: "Sleeping", icon: "😴" },
    watching: { key: "watching", label: "Watching something", icon: "🎬" },
    praying: { key: "praying", label: "Prayer time!", icon: "🕌" },
    gaming: { key: "gaming", label: "Gaming", icon: "🎮" },
    eating: { key: "eating", label: "Having a meal", icon: "🍽️" },
    commuting: { key: "commuting", label: "Commuting", icon: "🚗" },
    exercising: { key: "exercising", label: "Exercising", icon: "🏃" },
    reading: { key: "reading", label: "Reading", icon: "📚" },
    away: { key: "away", label: "Away", icon: "🌙" },
    available: { key: "available", label: "Available", icon: "✅" },
};

const KV_KEY = "current_status";

async function getStatus(env) {
    const raw = await env.STATUS_KV.get(KV_KEY);
    if (!raw) return { ...DEFAULT_STATUS };
    try {
        return JSON.parse(raw);
    } catch {
        return { ...DEFAULT_STATUS };
    }
}

async function updateStatus(request, env) {
    // Auth check
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || token !== env.AUTH_TOKEN) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { status: key, message, icon, label } = body ?? {};

    if (!key) {
        return jsonResponse({ error: "Missing required field: status" }, 400);
    }

    const preset = PRESETS[key] ?? null;

    const newStatus = {
        key,
        label: label ?? preset?.label ?? key,
        icon: icon ?? preset?.icon ?? "💬",
        message: message ?? preset?.label ?? key,
        updatedAt: new Date().toISOString(),
    };

    await env.STATUS_KV.put(KV_KEY, JSON.stringify(newStatus));
    return jsonResponse({ ok: true, status: newStatus });
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
}

function htmlResponse(html) {
    return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
}

function buildHtml(status, pageTitle) {
    const title = pageTitle ?? "What am I doing?";
    const updatedAtHtml = status.updatedAt
        ? `<p class="updated">Last updated: <time id="updated-time" datetime="${status.updatedAt}">${status.updatedAt}</time></p>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="My current status – ${escapeHtml(status.label)}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0d0d0d;
      --text: #f0f0f0;
      --muted: #888;
      --accent: #6ee7b7;
    }

    body.light {
      --bg: #f5f5f5;
      --text: #111;
      --muted: #666;
      --accent: #059669;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      transition: background 0.2s, color 0.2s;
    }

    .content {
      max-width: 480px;
      width: 100%;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .page-title {
      font-size: 0.85rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 2rem;
    }

    .status-icon {
      font-size: 5rem;
      line-height: 1;
      margin-bottom: 1rem;
      display: block;
    }

    .status-label {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.75rem;
    }

    .status-message {
      font-size: 1.15rem;
      color: var(--muted);
      margin-bottom: 1.5rem;
    }

    .updated {
      font-size: 0.78rem;
      color: var(--muted);
      opacity: 0.7;
    }

    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      margin-right: 0.4rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    footer {
      margin-top: 2.5rem;
      font-size: 0.75rem;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    footer a {
      color: var(--muted);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    #theme-toggle {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: var(--muted);
      padding: 0;
      line-height: 1;
    }

    @media (max-width: 480px) {
      .status-label { font-size: 1.9rem; }
      .status-icon  { font-size: 4rem; }
    }
  </style>
</head>
<body>
  <div class="content">
    <p class="page-title"><span class="dot"></span>${escapeHtml(title)}</p>
    <span class="status-icon" role="img" aria-label="${escapeHtml(status.label)}">${escapeHtml(status.icon)}</span>
    <h1 class="status-label">${escapeHtml(status.label)}</h1>
    ${status.message ? `<p class="status-message">${escapeHtml(status.message)}</p>` : ""}
    ${updatedAtHtml}
  </div>
  <footer>
    <a href="https://github.com/4msar/status" target="_blank" rel="noopener noreferrer">msar.me</a>
    <button id="theme-toggle" aria-label="Toggle theme" title="Toggle dark/light theme">🌙</button>
  </footer>

  <script>
    // Pretty-print the "last updated" timestamp in the visitor's local timezone
    const el = document.getElementById("updated-time");
    if (el) {
      const d = new Date(el.getAttribute("datetime"));
      el.textContent = d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    // Dark/light theme toggle
    const btn = document.getElementById("theme-toggle");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let isDark = prefersDark;
    function applyTheme() {
      document.body.classList.toggle("light", !isDark);
      btn.textContent = isDark ? "🌙" : "☀️";
    }
    applyTheme();
    btn.addEventListener("click", () => { isDark = !isDark; applyTheme(); });
  </script>
</body>
</html>`;
}

/** Minimal HTML escaping to prevent XSS when embedding status data */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS pre-flight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Authorization, Content-Type",
                },
            });
        }

        if (url.pathname === "/api/status") {
            if (request.method === "GET") {
                const status = await getStatus(env);
                return jsonResponse(status);
            }
            if (request.method === "POST") {
                return updateStatus(request, env);
            }
            return jsonResponse({ error: "Method not allowed" }, 405);
        }

        if (url.pathname === "/" || url.pathname === "") {
            const status = await getStatus(env);
            const html = buildHtml(status, env.PAGE_TITLE);
            return htmlResponse(html);
        }

        return new Response("Not Found", { status: 404 });
    },
};
