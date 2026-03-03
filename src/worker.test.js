import { describe, it, expect, vi, beforeEach } from "vitest";

// We import the worker module directly and test its exported fetch handler.
// KV is mocked as a simple in-memory Map.

let kvStore;

function makeEnv(overrides = {}) {
  kvStore = new Map();
  return {
    STATUS_KV: {
      get: async (key) => kvStore.get(key) ?? null,
      put: async (key, value) => kvStore.set(key, value),
    },
    AUTH_TOKEN: "test-secret",
    PAGE_TITLE: undefined,
    ...overrides,
  };
}

function makeRequest(method, path, { body, token } = {}) {
  const url = `https://status.example.com${path}`;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Dynamically import worker so we can test its default export
const worker = await import("../src/worker.js");

describe("GET /", () => {
  it("returns HTML with default status when KV is empty", async () => {
    const res = await worker.default.fetch(makeRequest("GET", "/"), makeEnv());
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("<!DOCTYPE html>");
    expect(text).toContain("Available");
  });

  it("reflects status stored in KV", async () => {
    const env = makeEnv();
    // Pre-seed KV
    await env.STATUS_KV.put(
      "current_status",
      JSON.stringify({
        key: "sleeping",
        label: "Sleeping",
        icon: "😴",
        message: "ZZZ",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })
    );
    const res = await worker.default.fetch(makeRequest("GET", "/"), env);
    const text = await res.text();
    expect(text).toContain("Sleeping");
    expect(text).toContain("😴");
  });
});

describe("GET /api/status", () => {
  it("returns JSON with default status", async () => {
    const res = await worker.default.fetch(
      makeRequest("GET", "/api/status"),
      makeEnv()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.key).toBe("default");
  });

  it("returns stored status from KV", async () => {
    const env = makeEnv();
    await env.STATUS_KV.put(
      "current_status",
      JSON.stringify({ key: "working", label: "Working", icon: "💻", message: "Deep work", updatedAt: null })
    );
    const res = await worker.default.fetch(makeRequest("GET", "/api/status"), env);
    const json = await res.json();
    expect(json.key).toBe("working");
    expect(json.label).toBe("Working");
  });
});

describe("POST /api/status", () => {
  it("rejects requests without a token", async () => {
    const res = await worker.default.fetch(
      makeRequest("POST", "/api/status", { body: { status: "working" } }),
      makeEnv()
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests with a wrong token", async () => {
    const res = await worker.default.fetch(
      makeRequest("POST", "/api/status", { body: { status: "working" }, token: "wrong" }),
      makeEnv()
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests missing the status field", async () => {
    const res = await worker.default.fetch(
      makeRequest("POST", "/api/status", { body: {}, token: "test-secret" }),
      makeEnv()
    );
    expect(res.status).toBe(400);
  });

  it("updates status with a preset key", async () => {
    const env = makeEnv();
    const res = await worker.default.fetch(
      makeRequest("POST", "/api/status", {
        body: { status: "sleeping" },
        token: "test-secret",
      }),
      env
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status.key).toBe("sleeping");
    expect(json.status.icon).toBe("😴");
    // Verify it was persisted in KV
    const stored = JSON.parse(await env.STATUS_KV.get("current_status"));
    expect(stored.key).toBe("sleeping");
  });

  it("allows custom icon and label overrides", async () => {
    const env = makeEnv();
    const res = await worker.default.fetch(
      makeRequest("POST", "/api/status", {
        body: { status: "custom", icon: "🚀", label: "Launching", message: "To the moon!" },
        token: "test-secret",
      }),
      env
    );
    const json = await res.json();
    expect(json.status.icon).toBe("🚀");
    expect(json.status.label).toBe("Launching");
    expect(json.status.message).toBe("To the moon!");
  });

  it("subsequent GET /api/status reflects the new status", async () => {
    const env = makeEnv();
    await worker.default.fetch(
      makeRequest("POST", "/api/status", {
        body: { status: "coding", message: "Working on a new feature" },
        token: "test-secret",
      }),
      env
    );
    const res = await worker.default.fetch(makeRequest("GET", "/api/status"), env);
    const json = await res.json();
    expect(json.key).toBe("coding");
    expect(json.message).toBe("Working on a new feature");
  });
});

describe("CORS & edge cases", () => {
  it("OPTIONS returns CORS headers", async () => {
    const res = await worker.default.fetch(
      makeRequest("OPTIONS", "/api/status"),
      makeEnv()
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("unknown routes return 404", async () => {
    const res = await worker.default.fetch(
      makeRequest("GET", "/unknown"),
      makeEnv()
    );
    expect(res.status).toBe(404);
  });

  it("unsupported method on /api/status returns 405", async () => {
    const res = await worker.default.fetch(
      makeRequest("DELETE", "/api/status"),
      makeEnv()
    );
    expect(res.status).toBe(405);
  });
});
