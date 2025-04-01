class Chat {
    constructor() {
        this.messages = [];
        this.maxMessages = 100;
    }

    addMessage(message, isUser = false) {
        this.messages.push({
            text: message,
            isUser: isUser,
            timestamp: new Date().toISOString()
        });

        // Keep only the last maxMessages
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Update UI
        window.ui.addMessage(message, isUser);
    }

    addSystemMessage(message) {
        this.addMessage(message, false);
    }

    addUserMessage(message) {
        this.addMessage(message, true);
    }

    clear() {
        this.messages = [];
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }

    getMessages() {
        return this.messages;
    }

    getLastMessage() {
        return this.messages[this.messages.length - 1];
    }
}

// Export for use in other files
window.Chat = Chat; 