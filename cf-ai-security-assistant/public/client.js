// public/client.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const messagesDiv = document.getElementById('messages');
    const inputForm = document.getElementById('input-form');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const fileNameSpan = document.getElementById('file-name');
    const sendButton = inputForm.querySelector('button[type="submit"]');

    let socket;
    let selectedFileContent = null; // Variable to store file content

    // --- WebSocket Connection Logic (same as before) ---
    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/connect`;
        console.log('Connecting to:', wsUrl);
        socket = new WebSocket(wsUrl);

        socket.addEventListener('open', () => {
            console.log('WebSocket connection opened.');
            addMessage('Connected. Please attach a scan log and ask a question.', 'ai-message');
            sendButton.disabled = false;
        });

        socket.addEventListener('message', (event) => {
            console.log('Message from server:', event.data);
            addMessage(event.data, 'ai-message'); // The AI response is raw text/markdown
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        });

        socket.addEventListener('close', () => {
            console.log('WebSocket connection closed. Reconnecting...');
            addMessage('Connection closed. Reconnecting...', 'ai-message');
            sendButton.disabled = true;
            setTimeout(connectWebSocket, 3000);
        });

        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            addMessage('Error connecting to the server.', 'ai-message');
            sendButton.disabled = true;
        });
    }

    // --- DOM Helper (same as before) ---
    function addMessage(text, className) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${className}`;
        // In a real app, you'd use a library like 'marked' to parse markdown safely.
        // For this demo, we'll just set the text content.
        messageElement.textContent = text;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // --- NEW: Event Handlers for File Upload ---
    uploadButton.addEventListener('click', () => {
        fileInput.click(); // Trigger the hidden file input
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        fileNameSpan.textContent = file.name;
        const reader = new FileReader();

        reader.onload = (e) => {
            selectedFileContent = e.target.result;
            console.log('File read successfully.');
            addMessage(`File "${file.name}" is ready to be analyzed.`, 'system-message');
        };

        reader.onerror = (e) => {
            console.error('Error reading file:', e);
            addMessage(`Error reading file "${file.name}".`, 'system-message error');
            selectedFileContent = null;
        };

        reader.readAsText(file); // Read the file as a plain text string
    });


    // --- UPDATED: Form Submission Logic ---
    inputForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const question = messageInput.value.trim();

        if (!selectedFileContent) {
            addMessage('Please attach a scan log file first.', 'system-message error');
            return;
        }
        if (!question) {
            addMessage('Please ask a question about the scan.', 'system-message error');
            return;
        }

        if (socket && socket.readyState === WebSocket.OPEN) {
            addMessage(question, 'user-message');

            // Package the question and file content into a single JSON object
            const payload = {
                question: question,
                scan_log: selectedFileContent,
            };

            socket.send(JSON.stringify(payload)); // Send the payload as a JSON string

            sendButton.disabled = true;
            sendButton.textContent = 'Analyzing...';
            messageInput.value = '';
        }
    });

    // --- Initial Connection ---
    connectWebSocket();
});
