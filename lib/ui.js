class UI {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.uploadButton = document.getElementById('upload-button');
        this.webcamButton = document.getElementById('webcam-button');
        this.webcamContainer = document.getElementById('webcam-container');
        this.webcamVideo = document.getElementById('webcam-video');
        this.captureButton = document.getElementById('capture-button');
        this.closeWebcamButton = document.getElementById('close-webcam-button');
        this.menuButton = document.getElementById('menu-button');
        this.sidebar = document.getElementById('sidebar');
        this.closeSidebarButton = document.getElementById('close-sidebar-button');
        this.popup = document.getElementById('popup');
        this.closePopupButton = document.getElementById('close-popup-button');
    }

    initialize() {
        this.setupEventListeners();
        this.setupMenuToggle();
        this.setupPopupClose();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleSendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
        this.uploadButton.addEventListener('click', () => this.handleImageUpload());
        this.webcamButton.addEventListener('click', () => this.handleWebcamToggle());
        this.captureButton.addEventListener('click', () => this.handleCapture());
        this.closeWebcamButton.addEventListener('click', () => this.handleCloseWebcam());
    }

    setupMenuToggle() {
        this.menuButton.addEventListener('click', () => {
            this.sidebar.classList.toggle('active');
        });

        this.closeSidebarButton.addEventListener('click', () => {
            this.sidebar.classList.remove('active');
        });
    }

    setupPopupClose() {
        this.closePopupButton.addEventListener('click', () => {
            this.popup.classList.remove('active');
        });
    }

    handleSendMessage() {
        const message = this.userInput.value.trim();
        if (message) {
            window.APIHandler.handleUserInput(message);
            this.userInput.value = '';
        }
    }

    handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                window.APIHandler.handleImageUpload(file);
            }
        };
        input.click();
    }

    handleWebcamToggle() {
        this.webcamContainer.classList.add('active');
        window.camera.initialize(this.webcamVideo);
    }

    handleCapture() {
        window.camera.captureImage().then(imageData => {
            window.APIHandler.handleImageUpload(imageData);
            this.handleCloseWebcam();
        });
    }

    handleCloseWebcam() {
        window.camera.stop();
        this.webcamContainer.classList.remove('active');
    }

    addMessage(message, isUser = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isUser ? 'user' : 'bot'}`;
        messageElement.textContent = message;
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showPopup(message) {
        const popupMessage = document.getElementById('popup-message');
        popupMessage.textContent = message;
        this.popup.classList.add('active');
    }
}

// Export for use in other files
window.UI = UI; 