// test/prompt.test.js
const { readFileSync } = require('fs');
const path = require('path');

// Load the TypeScript source and extract the buildPrompt function by simple evaluation.
// This keeps the test runnable with plain Node without requiring compilation.
const srcPath = path.resolve(__dirname, '../src/prompt.ts');
const src = readFileSync(srcPath, 'utf8');

// Very small, controlled evaluation: extract the buildPrompt function body using a regex.
const match = src.match(/export function buildPrompt\([\s\S]*?\) : string \{([\s\S]*?)\n\}/);
if (!match) {
    console.error('Could not extract buildPrompt implementation from src/prompt.ts');
    process.exit(2);
}

const impl = match[1];

// Build a wrapper to run the function.
const wrapper = `
function testBuildPrompt(question, scanLog) {\n${impl}\n}
testBuildPrompt;
`;

const testBuildPrompt = eval(wrapper);

function runTest() {
    const question = 'What is the most critical risk?';
    const scanLog = 'Host: 198.51.100.42\nPorts: 22/tcp open ssh\n';
    const prompt = testBuildPrompt(question, scanLog);

    console.log('--- Prompt Preview ---');
    console.log(prompt);

    if (!prompt.includes('most critical risk') || !prompt.includes(scanLog)) {
        console.error('Prompt test failed: expected content missing');
        process.exit(2);
    }

    console.log('Prompt test passed.');
}

runTest();
