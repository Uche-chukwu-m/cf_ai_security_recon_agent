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
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const [client, server] = Object.values(new WebSocketPair());

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
        (webSocket as any).accept();

        webSocket.addEventListener("message", async (msg: MessageEvent) => {
            // For now, we'll just log the message.
            // Later, this is where we'll trigger the AI workflow.
            console.log("Received message, triggering AI workflow:", msg.data);

            const scanResults = {
			host: "198.51.100.42",
			ports: [
				{ port: 22, protocol: "tcp", service: "ssh", state: "open", banner: "OpenSSH 8.2p1 Ubuntu 4ubuntu0.5" },
				{ port: 80, protocol: "tcp", service: "http", state: "open", banner: "Apache httpd 2.4.41 ((Ubuntu))" },
				{ port: 443, protocol: "tcp", service: "https", state: "open", banner: "nginx/1.18.0 (Ubuntu)" },
				{ port: 3306, protocol: "tcp", service: "mysql", state: "open", banner: "MySQL 5.7.33-0ubuntu0.18.04.1" },
				{ port: 8080, protocol: "tcp", service: "http-proxy", state: "open", banner: "Apache Tomcat/9.0.55" }
			]
		};

		// --- 2. Craft the Prompt for the LLM ---
		// This is the most important part. We give the AI a role, context,
		// the data, and a clear command for what we want it to do.
		const prompt = `
        You are a senior security analyst providing a concise, expert summary of a vulnerability scan.
        A junior engineer has given you the following scan results and asked: "What’s the most critical risk here?"

        Scan Data:
        \`\`\`json
        ${JSON.stringify(scanResults, null, 2)}
        \`\`\`

        Based on the scan data, identify the single most critical risk. Explain it in simple, plain English.
        Describe the potential impact and suggest a clear, actionable first step for remediation.
        Structure your response in Markdown format. Start with a "## Most Critical Risk" heading.
        `;    
        try {
            // Use the env binding to access Workers AI
            const aiResponse = await this.env.AI.run(
            '@cf/meta/llama-3-8b-instruct',
            { prompt: prompt, stream: false }
            );
            webSocket.send(aiResponse.response);
        } catch (error) {
            console.error("Error occurred while calling AI:", error);
        }
    });
        webSocket.addEventListener("close", (evt) => {
            console.log("WebSocket closed:", evt);
        });
        webSocket.addEventListener("error", (err) => {
            console.error("WebSocket error:", err);
        });
    }
}

// ... The rest of your index.ts file (export interface Env, export default)
// will go below this class.

/**
 * Define the environment bindings for our Worker.
 * This is how we tell TypeScript what is available on the `env` object.
 */
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
			const id = env.CHAT_ROOM.idFromName("shared-chat-room");
			const stub = env.CHAT_ROOM.get(id);
			return stub.fetch(request);
		}

		// If we reach here, it means the request is not a WebSocket connection.
		// We can return a simple text response for now.
		return new Response("This is the main Worker entry point. Visit the homepage to use the chat.");
	}
};