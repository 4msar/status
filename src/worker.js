/**
 * Status Page – Cloudflare Worker
 *
 * Routes:
 *   GET  /            → HTML status page
 *   GET  /api/status  → current status as JSON
 *   POST /api/status  → update status  (requires Authorization: Bearer <AUTH_TOKEN>)
 */

import { Router } from "@tsndr/cloudflare-worker-router";
import {
    buildHtml,
    getStatus,
    htmlResponse,
    jsonResponse,
    updateStatus,
} from "./utils";

// Initialize router
const router = new Router();

// Enabling build in CORS support
router.cors({
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowOrigin: "*",
});

// Middleware for protected routes
const authMiddleware = ({ env, req }) => {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || token !== env.AUTH_TOKEN) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }
};

// Register global middleware
// router.use(authMiddleware);

// Public route for HTML status page
router.get("/", async ({ env }) => {
    const status = await getStatus(env);
    const html = buildHtml(status, env.PAGE_TITLE);
    return htmlResponse(html);
});

// Get favicon.ico from emoji or custom icon URL
router.get("/favicon.ico", async ({ env }) => {
    const status = await getStatus(env);
    if (status.icon && status.icon.startsWith("http")) {
        // Redirect to custom icon URL
        return Response.redirect(status.icon, 302);
    } else {
        // Generate simple SVG favicon with emoji
        const emoji = status.icon || "💬";
        // Return the SVG favicon
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50%" x="50%" text-anchor="middle" dominant-baseline="central" font-size="48">${emoji}</text></svg>`;
        return new Response(svg, {
            headers: { "Content-Type": "image/svg+xml" },
        });
    }
});

// Protected route for updating status
router.post("/api/status", authMiddleware, ({ req, env }) => {
    return updateStatus(req, env);
});

// Public route to get current status as JSON
router.get("/api/status", async ({ env }) => {
    const status = await getStatus(env);
    return jsonResponse(status);
});

// Listen Cloudflare Workers Fetch Event
export default {
    async fetch(request, env, ctx) {
        return router.handle(request, env, ctx);
    },
};
