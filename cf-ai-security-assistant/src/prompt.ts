// src/prompt.ts

/**
 * Build the prompt sent to the AI from a question and raw scan log.
 * Exported so it can be unit-tested.
 */
export function buildPrompt(question: string, scanLog: string): string {
    const safeQuestion = escapeForPrompt(question.trim());
    const safeLog = scanLog == null ? '' : scanLog;

    return `You are a senior security analyst providing a concise, expert summary of a vulnerability scan.\n` +
        `A junior engineer has uploaded the following scan log and asked the question: "${safeQuestion}"\n\n` +
        `Scan Log Content:\n\`\`\`\n${safeLog}\n\`\`\`\n\n` +
        `Based on the provided log, analyze the vulnerabilities. If the user asks for the "most critical risk", identify that specific risk. Otherwise, answer their question based on the log's content.\n\n` +
        `Explain your findings in simple, plain English. Describe the potential impact and suggest clear, actionable first steps for remediation. Structure your response in Markdown format.`;
}

function escapeForPrompt(input: string): string {
    // Minimal escaping: avoid backticks breaking the code block and keep quotes intact
    return input.replace(/`/g, "'");
}

export default buildPrompt;
