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

## Deploy to Cloudflare

Make sure you are authenticated with Wrangler (see `wrangler login` or `wrangler login --api-key` per Cloudflare docs) and have the account/zone set up for the Worker.

From `cf-ai-security-assistant` run:

```powershell
npm run deploy
```

This runs `wrangler deploy` and publishes the Worker and its assets to Cloudflare. The `wrangler.jsonc` in this project already configures:

- `ai.binding` → provides the `AI` binding used in the Worker to call the Workers AI service.
- `durable_objects.bindings` → registers the `CHAT_ROOM` Durable Object of class `ChatRoom`.
- `assets` → serves the `public` directory as static assets.

Important: ensure your Cloudflare account has access to Workers AI and that your account is authorized to use the model(s) referenced in the code. The sample code calls `env.AI.run('@cf/meta/llama-3-8b-instruct', ...)` — you may need to update the model identifier per your Cloudflare account limits and availability.

## Configuration

- `cf-ai-security-assistant/wrangler.jsonc`: main config for Wrangler, assets, AI binding, durable objects and compatibility date.
- `cf-ai-security-assistant/src/index.ts`: Worker entry. Edit this file to change prompt templates, model selection, or WebSocket behavior.
- `cf-ai-security-assistant/public/client.js`: frontend logic that connects to `/connect` and sends messages/scan logs. (You can customize the UI there.)

## Prompt builder and local test

To make prompt generation testable and easier to modify, a small prompt builder was added at `cf-ai-security-assistant/src/prompt.ts`.

There is a minimal runnable test at `cf-ai-security-assistant/test/prompt.test.js` that prints a prompt preview and passes/fails with an exit code. Run it from the worker directory using Node (no build step required):

```powershell
cd .\cf-ai-security-assistant
node test\prompt.test.js
```

Client behavior notes:
- The frontend (`public/client.js`) now attempts to parse incoming WebSocket messages as JSON first. If the message contains an `error` field the UI shows it as a system error message; otherwise the message is displayed as the AI's Markdown/plain-text response.


## Code pointers

- The Durable Object class `ChatRoom` handles incoming WebSocket connections and calls `this.env.AI.run(...)` with a crafted prompt. See `cf-ai-security-assistant/src/index.ts` for details. The current implementation expects the `{ question, scan_log }` payload and builds a prompt that includes the raw scan log. The code also includes a small helper `escapeForPrompt` to avoid accidental template-breaking characters in the user-provided question.
- The Worker routes `/connect` requests to the Durable Object.

## Troubleshooting

- If you get authentication errors when calling the AI, verify your Cloudflare account's Workers AI access and review Wrangler authentication (`wrangler whoami`).
- If `wrangler dev` does not serve assets, ensure `assets.directory` in `wrangler.jsonc` is `./public` and that `public` contains `index.html` and `client.js`.
- If deployment fails, run `wrangler deploy --verbose` to see detailed errors.

## Security / Safety notes

This project demonstrates how to wire up Workers AI to process scan data. Do not send sensitive production data to experimental models without appropriate data handling, privacy, and compliance checks.

## Next steps (suggested)

- Ensure the frontend sends `{ question, scan_log }` JSON payloads to the `/connect` WebSocket. If you want richer parsing, replace the raw-log approach with a parser that extracts structured findings (for example from nmap output) and update the prompt accordingly.
- Add authentication to the frontend/Worker if you intend to limit access to the assistant.
- Add tests for prompt generation and for parsing the AI response.

## Contact / Contributing

Feel free to open issues or PRs. If you want help wiring this to a particular CI/CD or customizing the model/prompt, describe your target Cloudflare account and model access.

