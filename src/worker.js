/**
 * Status Page – Cloudflare Worker
 *
 * Routes:
 *   GET  /            → HTML status page
 *   GET  /api/status  → current status as JSON
 *   POST /api/status  → update status  (requires Authorization: Bearer <AUTH_TOKEN>)
 */

import htmlTemplate from "./index.html";

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
        label: label || preset?.label || key,
        icon: icon || preset?.icon || "💬",
        message: message || preset?.label || key,
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
    const messageHtml = status.message
        ? `<p class="status-message">${escapeHtml(status.message)}</p>`
        : "";

    return htmlTemplate
        .replaceAll(/\{\{TITLE\}\}/g, escapeHtml(title))
        .replaceAll("{{STATUS_ARIA_LABEL}}", escapeHtml(status.label))
        .replaceAll("{{STATUS_ICON}}", escapeHtml(status.icon))
        .replaceAll("{{STATUS_LABEL}}", escapeHtml(status.label))
        .replaceAll("{{STATUS_MESSAGE_HTML}}", messageHtml)
        .replaceAll("{{UPDATED_AT_HTML}}", updatedAtHtml);
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
