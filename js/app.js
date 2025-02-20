// Global variables
let currentUser = null;
let peer = null;
let connections = new Map();
// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const userSetup = document.getElementById('user-setup');
const chatOptions = document.getElementById('chat-options');
const privateChatScreen = document.getElementById('private-chat-screen');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen after 3 seconds
    setTimeout(() => {
        gsap.to(loadingScreen, {
            opacity: 0,
            duration: 1,
            onComplete: () => {
                loadingScreen.classList.add('hidden');
                userSetup.classList.remove('hidden');
                gsap.from(userSetup, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5
                });
            }
        });
    }, 3000);

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // User Setup
    document.getElementById('start-chat').addEventListener('click', handleUserSetup);

    // Chat Options
    document.getElementById('private-chat').addEventListener('click', () => showScreen('private-chat-screen'));

    // Private Chat
    document.getElementById('connect-peer').addEventListener('click', connectToPeer);
    document.getElementById('send-private').addEventListener('click', sendPrivateMessage);

    // Message input enter key handling
    document.getElementById('private-msg-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendPrivateMessage();
    });
}

// Handle user setup
function handleUserSetup() {
    const displayName = document.getElementById('display-name').value.trim();
    if (!displayName) {
        alert('Please enter a display name');
        return;
    }

    currentUser = {
        name: displayName,
        id: `user-${Math.random().toString(36).substr(2, 9)}`
    };

    // Initialize PeerJS
    peer = new Peer(currentUser.id);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        document.getElementById('my-peer-id').textContent = id;
        showScreen('chat-options');

        // Setup copy button
        const copyBtn = document.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(id).then(() => {
                copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8v2H4V2zM2 5h12v9H2V5zm2 2v5h8V7H4z"/></svg>';
                }, 2000);
            });
        });
    });

    peer.on('connection', handleIncomingConnection);
    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        updateConnectionStatus(false);
    });
}

// Show specific screen and hide others
function showScreen(screenId) {
    const screens = ['user-setup', 'chat-options', 'private-chat-screen'];
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
    const screenToShow = document.getElementById(screenId);
    screenToShow.classList.remove('hidden');

    gsap.from(screenToShow, {
        opacity: 0,
        y: 20,
        duration: 0.5
    });
}

// Private Chat Functions
function connectToPeer() {
    const peerId = document.getElementById('peer-id-input').value.trim();
    if (!peerId) {
        alert('Please enter a peer ID');
        return;
    }

    const conn = peer.connect(peerId);
    setupConnection(conn);
}

function handleIncomingConnection(conn) {
    setupConnection(conn);
}

function updateConnectionStatus(isConnected, peerName = '') {
    const statusIndicator = document.querySelector('.connection-status .status-indicator');
    const statusText = document.querySelector('.connection-status .status-text');
    const connectedPeerIndicator = document.querySelector('.connected-peer .status-indicator');
    const connectedPeerName = document.getElementById('connected-peer-name');

    if (isConnected) {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        connectedPeerIndicator.classList.add('connected');
        connectedPeerName.textContent = peerName;
    } else {
        statusIndicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectedPeerIndicator.classList.remove('connected');
        connectedPeerName.textContent = 'Not connected';
    }
}

function setupConnection(conn) {
    conn.on('open', () => {
        connections.set(conn.peer, conn);
        conn.send({
            type: 'user-info',
            data: { name: currentUser.name }
        });
        updateConnectionStatus(true);
    });

    conn.on('data', (data) => {
        if (data.type === 'message') {
            displayMessage(data.data, false);
        } else if (data.type === 'user-info') {
            updateConnectionStatus(true, data.data.name);
        }
    });

    conn.on('close', () => {
        connections.delete(conn.peer);
        updateConnectionStatus(false);
    });

    conn.on('error', () => {
        connections.delete(conn.peer);
        updateConnectionStatus(false);
    });
}

function sendPrivateMessage() {
    const input = document.getElementById('private-msg-input');
    const message = input.value.trim();
    if (!message) return;

    connections.forEach(conn => {
        conn.send({
            type: 'message',
            data: {
                text: message,
                sender: currentUser.name,
                timestamp: new Date().toISOString()
            }
        });
    });

    displayMessage({
        text: message,
        sender: currentUser.name,
        timestamp: new Date().toISOString()
    }, true);

    input.value = '';
}

// UI Functions
function displayMessage(message, isSent) {
    const messagesContainer = document.getElementById('private-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = new Date(message.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: time.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    messageElement.innerHTML = `
        <div class="message-content">
            <p>${message.text}</p>
            <div class="message-meta">
                <span class="sender">${message.sender}</span>
                <span class="time">${timeStr}</span>
                <span class="date">${dateStr}</span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Animate message
    gsap.from(messageElement, {
        opacity: 0,
        y: 20,
        duration: 0.3,
        ease: "back.out(1.7)"
    });
}