# CF AI Security Recon Agent

A small Cloudflare Workers project that provides an AI-assisted vulnerability-scan analysis assistant.

This repository contains a Cloudflare Worker (with a Durable Object) and a minimal frontend in `cf-ai-security-assistant/public` that lets you upload scan logs and ask an AI for a concise, actionable security summary.

## Contents

- `cf-ai-security-assistant/src` - Worker source (TypeScript). The Durable Object `ChatRoom` upgrades WebSocket connections and invokes the Workers AI.
- `cf-ai-security-assistant/public` - Static frontend (HTML, `client.js`) served as assets by the Worker.
- `cf-ai-security-assistant/wrangler.jsonc` - Wrangler configuration including AI binding and Durable Object class.
- `cf-ai-security-assistant/package.json` - npm scripts for development and deployment.

## Quick overview

The Worker exposes a WebSocket endpoint at `/connect` which the frontend uses to send scan data and receive the AI's response. The Worker code demonstrates how to call the Workers AI via the `AI` binding defined in `wrangler.jsonc`.
Important: the Durable Object now expects incoming WebSocket messages to be JSON strings with the shape: `{ "question": string, "scan_log": string }`. See the "How to use the UI" section for an example payload.

## Prerequisites

- Node.js (recommended LTS). Verify with `node -v` and `npm -v`.
- Wrangler v4 (Cloudflare Workers CLI) — the project already uses `wrangler` as a devDependency. You can install it globally or use the npm scripts which use the local `wrangler` binary.
- A Cloudflare account with Workers & Workers AI access enabled. The AI integration requires the `ai` section in `wrangler.jsonc` and appropriate Cloudflare permissions.

On Windows PowerShell, commands shown below are formatted for that shell.

## Install

Open a terminal in the project root and change into the worker folder, then install dependencies:

```powershell
cd .\cf-ai-security-assistant
npm install
```

Note: the repository does not contain a root-level `package.json` for the entire workspace; the Worker project lives in `cf-ai-security-assistant`.

## Development (local)

The `package.json` contains convenient scripts. During development you can run Wrangler in dev mode which serves the Worker and static assets locally.

```powershell
# from c:\Users\...\cf_ai_security_recon_agent\cf-ai-security-assistant
npm run dev
```

This runs `wrangler dev` and will serve the site and Worker on a localhost URL (printed by Wrangler). The frontend (`public/index.html`) will load `client.js` which connects to the Worker via WebSocket.

Tips:
- If you change TypeScript sources, Wrangler will compile and reload.
- The WebSocket endpoint used by the frontend is `/connect` and the Durable Object `ChatRoom` handles sessions.

## How to use the UI

1. Start `npm run dev` (see above).
2. Open the local URL shown by Wrangler in your browser.
3. Use the UI to attach a scan log (text file) and/or type a question about the scan and click Send/Analyze.
4. The frontend should send a single JSON message (stringified) over the WebSocket to `/connect`. Example payload:

```json
{ "question": "What's the most critical risk?", "scan_log": "<contents of your scan log as plain text>" }
```

5. The Worker will forward the prompt to the Workers AI and return the model's response over the same WebSocket. On success the model's plain-text Markdown response is sent back. On errors the Worker will return a small JSON error object, for example:

```json
{ "error": "AI service error", "details": "..." }
```

## Contact / Contributing

Feel free to open issues or PRs. If you want help wiring this to a particular CI/CD or customizing the model/prompt, describe your target Cloudflare account and model access.

