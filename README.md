# Status

Personal status page powered by **Cloudflare Workers** + **KV**.

Shows what you're currently doing – phone, working, sleeping, watching, etc. – with a large icon and text. Update it from your iPhone/Mac with a single HTTP call.

---

## Features

- 🎨 Clean, dark-mode status page at your custom domain
- 📡 REST API to update status from any device or automation
- 🔑 Token-protected `POST /api/status` endpoint
- ⚡ Served at the edge via Cloudflare Workers – no server needed

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a KV namespace

```bash
npx wrangler kv namespace create STATUS_KV
npx wrangler kv namespace create STATUS_KV --preview
```

Copy the `id` values into `wrangler.toml`.

### 3. Set your secret auth token

```bash
npx wrangler secret put AUTH_TOKEN
# Enter a strong random string when prompted
```

### 4. Deploy

```bash
npm run deploy
```

Set up a custom domain in the Cloudflare dashboard (e.g. `status.msar.me`).

---

## Usage

### Update status from iPhone / Mac / cURL

```bash
curl -X POST https://status.msar.me/api/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "coding", "message": "Building something cool"}'
```

### Built-in status presets

| Key          | Icon | Label              |
| ------------ | ---- | ------------------ |
| `phone`      | 📱   | On my phone        |
| `working`    | 💻   | Working            |
| `coding`     | 👨‍💻   | Writing code       |
| `sleeping`   | 😴   | Sleeping           |
| `watching`   | 🎬   | Watching something |
| `praying`    | 🎮   | Praying            |
| `gaming`     | 🎮   | Gaming             |
| `eating`     | 🍽️   | Having a meal      |
| `commuting`  | 🚗   | Commuting          |
| `exercising` | 🏃   | Exercising         |
| `reading`    | 📚   | Reading            |
| `away`       | 🌙   | Away               |
| `available`  | ✅   | Available          |

You can also pass custom `icon` and `label` fields to override any preset.

### Get current status (JSON)

```bash
curl https://status.msar.me/api/status
```

---

## Automation ideas

- **iOS Shortcut**: trigger on Focus mode change → POST to `/api/status`
- **Mac**: use a shell script triggered by a Calendar event or Focus filter
- **Sleep/Wake**: trigger `sleeping` / `available` on Mac sleep/wake via a launchd agent

---

## Development

```bash
npm run dev   # local dev server with wrangler
npm test      # run vitest unit tests
```
