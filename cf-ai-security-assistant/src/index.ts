// src/index.ts

/**
 * Define the environment bindings for our Worker.
 * This is how we tell TypeScript what is available on the `env` object.
 */
export interface Env {
	// This binding is created by the "ai" section in our wrangler.jsonc
	// and provides access to the Workers AI service.
	AI: any;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// --- 1. Define a Sample Security Scan Result ---
		// In a real application, this would come from a user upload.
		// For now, we'll hardcode a simple Nmap-style JSON output.
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

		// --- 3. Send the Prompt to the AI Model ---
		// We use the `env.AI` binding to interact with Workers AI.
		// We're using Llama-3.1-8b-instruct, a powerful and fast model.
		const response = await env.AI.run(
			'@cf/meta/llama-3-8b-instruct',
			{
				prompt: prompt,
				stream: false, // We want the full response at once for now
			}
		);

		// --- 4. Return the AI's Response ---
		// The response from the model is in the `response` property of the object.
		// We return this as a text response with a Markdown content type.
		return new Response(response.response, {
			headers: { "Content-Type": "text/markdown" }
		});
	},
};