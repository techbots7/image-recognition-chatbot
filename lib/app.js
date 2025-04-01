document.addEventListener('DOMContentLoaded', async () => {
    // Check session before proceeding
    if (!window.SessionManager.checkSession()) {
        return; // Will redirect to login if session is invalid
    }

    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const imageInput = document.getElementById('image-input');
    const logoutBtn = document.getElementById('logout-btn');
    const menuBtn = document.getElementById('menu-btn');
    const menuPane = document.getElementById('menu-pane');
    const menuCloseBtn = document.querySelector('.menu-close-btn');
    const popupCloseBtn = document.querySelector('.popup-close-btn');
    const chatbotPopup = document.getElementById('chatbot-popup');
    const startWebcamBtn = document.getElementById('start-webcam');
    const captureBtn = document.getElementById('capture-btn');
    const webcamVideo = document.getElementById('webcam');
    const capturedFrame = document.getElementById('captured-frame');
    const chatbox = document.getElementById('chatbox');

    // Initialize API handler
    const apiHandler = new window.APIHandler();
    let stream = null;

    // Handle menu toggle
    menuBtn.addEventListener('click', () => {
        menuPane.classList.toggle('hidden');
    });

    menuCloseBtn.addEventListener('click', () => {
        menuPane.classList.add('hidden');
    });

    // Handle popup close
    popupCloseBtn.addEventListener('click', () => {
        chatbotPopup.classList.add('hidden');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    });

    // Handle webcam
    startWebcamBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            webcamVideo.srcObject = stream;
            captureBtn.disabled = false;
        } catch (error) {
            console.error('Error accessing webcam:', error);
            addMessage('Failed to access webcam. Please check permissions.', 'error');
        }
    });

    captureBtn.addEventListener('click', async () => {
        if (!stream) return;

        const context = capturedFrame.getContext('2d');
        capturedFrame.width = webcamVideo.videoWidth;
        capturedFrame.height = webcamVideo.videoHeight;
        context.drawImage(webcamVideo, 0, 0);

        // Stop webcam
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        webcamVideo.srcObject = null;
        captureBtn.disabled = true;

        // Show chat interface
        chatbotPopup.classList.remove('hidden');
        await processImage(capturedFrame);
    });

    // Handle image upload
    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                addMessage('Please upload an image file.', 'error');
                return;
            }

            try {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.getElementById('captured-frame');
                    const context = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);
                    chatbotPopup.classList.remove('hidden');
                    await processImage(canvas);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            } catch (error) {
                console.error('Error processing image:', error);
                addMessage('Error processing image. Please try again.', 'error');
            }
        }
    });

    // Handle text input
    sendBtn.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    async function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            userInput.value = '';
            
            try {
                const response = await apiHandler.generateResponse(message);
                addMessage(response, 'bot');
            } catch (error) {
                console.error('Error generating response:', error);
                addMessage('Sorry, I encountered an error. Please try again.', 'error');
            }
        }
    }

    async function processImage(canvas) {
        try {
            addMessage('Processing image...', 'bot');
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            const objects = await apiHandler.detectObjects(imageData);
            addMessage(`I can see: ${objects}`, 'bot');
        } catch (error) {
            console.error('Error processing image:', error);
            addMessage('Error processing image. Please try again.', 'error');
        }
    }

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas ${type === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                <p>${text}</p>
            </div>
        `;
        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        window.SessionManager.logout();
    });

    // Add welcome message
    addMessage('Hello! I can help you analyze images. Upload an image or use your webcam to get started!', 'bot');
});