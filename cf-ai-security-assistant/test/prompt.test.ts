// test/prompt.test.ts
import { buildPrompt } from '../src/prompt';

function runTest() {
    const question = 'What is the most critical risk?';
    const scanLog = 'Host: 198.51.100.42\nPorts: 22/tcp open ssh\n';
    const prompt = buildPrompt(question, scanLog);

    console.log('--- Prompt Preview ---');
    console.log(prompt);

    if (!prompt.includes('most critical risk') || !prompt.includes(scanLog)) {
        // Throw an error instead of calling process.exit so this file does not
        // require Node type definitions to compile in TypeScript.
        throw new Error('Prompt test failed: expected content missing');
    }

    console.log('Prompt test passed.');
}

runTest();
