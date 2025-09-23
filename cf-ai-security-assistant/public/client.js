// public/client.js

document.addEventListener('DOMContentLoaded', () => {
    const messagesDiv = document.getElementById('messages');
    const inputForm = document.getElementById('input-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = inputForm.querySelector('button');

    let socket;

    function connectWebSocket() {
        // Determine the WebSocket protocol based on the window's protocol.
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Construct the WebSocket URL to connect to our Durable Object.
        const wsUrl = `${protocol}//${window.location.host}/connect`;

        console.log('Connecting to:', wsUrl);
        socket = new WebSocket(wsUrl);

        socket.addEventListener('open', (event) => {
            console.log('WebSocket connection opened.');
            addMessage('Connected to the server.', 'ai-message');
            sendButton.disabled = false;
        });

        socket.addEventListener('message', (event) => {
            console.log('Message from server:', event.data);
            addMessage(event.data, 'ai-message');
            sendButton.disabled = false;
            sendButton.textContent = 'Analyze Scan';
        });

        socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed:', event);
            addMessage('Connection closed. Reconnecting...', 'ai-message');
            sendButton.disabled = true;
            // Attempt to reconnect after a short delay
            setTimeout(connectWebSocket, 3000);
        });

        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            addMessage('Error connecting to the server.', 'ai-message');
            sendButton.disabled = true;
        });
    }

    function addMessage(text, className) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${className}`;
        messageElement.textContent = text;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the bottom
    }

    inputForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = messageInput.value;
        if (message && socket && socket.readyState === WebSocket.OPEN) {
            addMessage(message, 'user-message');
            socket.send(message); // Send the user's query to the backend
            sendButton.disabled = true;
            sendButton.textContent = 'Analyzing...';
            // Clear the input after sending
            // messageInput.value = '';
        }
    });

    // Initial connection attempt
    connectWebSocket();
});