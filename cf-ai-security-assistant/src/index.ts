// src/index.ts

// Define the Durable Object class
export class ChatRoom {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    // The fetch handler is called when a client connects.
    // It's responsible for upgrading the connection to a WebSocket.
    async fetch(request: Request) {
        const url = new URL(request.url);

        // In a real app, you might have many rooms. Here, we use a single one.
        if (url.pathname === "/connect") {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];

            // We need to tell the Durable Object to accept and hold onto the WebSocket.
            await this.handleSession(server);

            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }

        return new Response("Not found", { status: 404 });
    }

    // This method handles the WebSocket connection for a user's session.
    async handleSession(webSocket: WebSocket) {
        // Accept the WebSocket connection so we can use event listeners.
        (webSocket as any).accept();

        webSocket.addEventListener('message', async (evt: MessageEvent) => {
            try {
                // Parse incoming message as JSON payload { question, scan_log }
                const text = typeof evt.data === 'string' ? evt.data : String(evt.data);
                const payload = JSON.parse(text);
                const question = (payload.question ?? '').toString().trim();
                const scan_log = (payload.scan_log ?? '').toString().trim();

                // Basic validation
                if (!question || !scan_log) {
                    const errMsg = JSON.stringify({ error: "Invalid payload. 'question' and 'scan_log' are required." });
                    webSocket.send(errMsg);
                    return;
                }

                console.log('Received question and scan log, triggering AI analysis.');

                // Build the prompt using a template literal (safe and readable)
                const prompt = `You are a senior security analyst providing a concise, expert summary of a vulnerability scan.\n` +
                    `A junior engineer has uploaded the following scan log and asked the question: "${escapeForPrompt(question)}"\n\n` +
                    `Scan Log Content:\n\`\`\`\n${scan_log}\n\`\`\`\n\n` +
                    `Based on the provided log, analyze the vulnerabilities. If the user asks for the "most critical risk", identify that specific risk. Otherwise, answer their question based on the log's content.\n\n` +
                    `Explain your findings in simple, plain English. Describe the potential impact and suggest clear, actionable first steps for remediation. Structure your response in Markdown format.`;

                // Call the AI binding. Model identifier may need to be changed for your account.
                const model = '@cf/meta/llama-3-8b-instruct';
                let aiResponse: any;
                try {
                    aiResponse = await this.env.AI.run(model, { prompt, stream: false });
                } catch (aiErr) {
                    console.error('AI.run error:', aiErr);
                    webSocket.send(JSON.stringify({ error: 'AI service error', details: String(aiErr) }));
                    return;
                }

                const responseText = aiResponse?.response ?? String(aiResponse ?? '');
                // Send the AI's response back to the client as plain text.
                webSocket.send(responseText);
            } catch (err) {
                console.error('Error processing message or calling AI:', err);
                try {
                    webSocket.send(JSON.stringify({ error: 'Processing error. Ensure the message is valid JSON with `question` and `scan_log`.' }));
                } catch (sendErr) {
                    console.error('Failed to send error message to client:', sendErr);
                }
            }
        });

        webSocket.addEventListener('close', (evt) => {
            console.log('WebSocket closed:', evt);
        });

        webSocket.addEventListener('error', (evt) => {
            console.error('WebSocket error:', evt);
        });
    }
}

export interface Env {
    // This binding is created by the "ai" section in our wrangler.jsonc
    // and provides access to the Workers AI service.
    AI: any;
    CHAT_ROOM: DurableObjectNamespace;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // All WebSocket connections will be handled by the Durable Object.
        // We'll use a unique ID for our single chat room.
        if (url.pathname.startsWith('/connect')) {
            const id = env.CHAT_ROOM.idFromName('shared-chat-room');
            const stub = env.CHAT_ROOM.get(id);
            return stub.fetch(request);
        }

        // If we reach here, it means the request is not a WebSocket connection.
        // We can return a simple text response for now.
        return new Response('This is the main Worker entry point. Visit the homepage to use the chat.');
    }
};

/**
 * Small helper to escape double quotes in the question when embedding into the prompt.
 * Keeps things simple and avoids accidental template breaks.
 */
function escapeForPrompt(input: string): string {
    return input.replace(/`/g, "`").replace(/\"/g, '"');
}