import sessionManager from './lib/session_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Check session before proceeding
    if (!sessionManager.checkSession()) {
        return; // Will redirect to login if session is invalid
    }

    const webcam = document.getElementById("webcam");
    const startWebcam = document.getElementById("start-webcam");
    const captureBtn = document.getElementById("capture-btn");
    const uploadBtn = document.getElementById("upload-btn");
    const canvas = document.getElementById("captured-frame");
    const chatbox = document.getElementById("chatbox");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const popup = document.getElementById("chatbot-popup");
    const menuBtn = document.getElementById("menu-btn");
    const menuPane = document.getElementById("menu-pane");
    const menuCloseBtn = document.querySelector(".menu-close-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const popupCloseBtn = document.querySelector(".popup-close-btn");
    const imageInput = document.getElementById('image-input');

    let stream;
    let chatbotData = null;
    let chatStartTime;
    let currentChatId;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Initialize handlers
    const apiHandler = new APIHandler();
    const dbHandler = new DBHandler();
    const emailService = new EmailService();

    // Function to load chatbot data
    async function loadChatbotData() {
        try {
            const response = await fetch("chatbot_data.json");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            chatbotData = await response.json();
            addMessage("System initialized successfully! Start the webcam to capture an image.", "bot");
            return true;
        } catch (error) {
            console.error("Error loading resources:", error);
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                addMessage(`Failed to load data, retrying... (Attempt ${retryCount}/${MAX_RETRIES})`, "bot");
                setTimeout(loadChatbotData, 2000); // Retry after 2 seconds
                return false;
            } else {
                addMessage("Error: Unable to load system resources. Please check your connection and refresh the page.", "error");
                return false;
            }
        }
    }

    // Initial data load
    await loadChatbotData();

    startWebcam.addEventListener("click", async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            webcam.srcObject = stream;
            await webcam.play();
            captureBtn.disabled = false;
            startWebcam.disabled = true;
            addMessage("Webcam started! Capture an image to begin.", "bot");
        } catch (error) {
            console.error("Error accessing webcam:", error);
            addMessage("Unable to access webcam. Check permissions.", "bot");
        }
    });

    captureBtn.addEventListener("click", async () => {
        if (!stream) return;
        const context = canvas.getContext("2d");
        canvas.width = webcam.videoWidth;
        canvas.height = webcam.videoHeight;
        context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        showChatInterface();
        await detectObject(canvas);
    });

    uploadBtn.addEventListener("click", () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64Image = event.target.result;
                    await handleImageUpload(base64Image);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error reading image:', error);
                addMessage('Error processing image. Please try again.', 'error');
            }
        }
    });

    async function detectObject(imageCanvas) {
        try {
            const imageData = imageCanvas.toDataURL('image/jpeg', 0.8);
            const result = await apiHandler.detectObject(imageData);
            
            if (result.success) {
                addMessage(result.description, "bot");
                
                // Save chat with detected object
                const userId = localStorage.getItem("userId");
                const chatData = {
                    id: generateChatId(),
                    userId,
                    startTime: chatStartTime,
                    lastMessageTime: Date.now(),
                    image: imageData,
                    uploaded: false,
                    messages: [{
                        sender: "bot",
                        text: result.description
                    }]
                };
                
                await dbHandler.saveChat(chatData);
                currentChatId = chatData.id;
            }
        } catch (error) {
            console.error("Error detecting object:", error);
            addMessage("Error detecting object. Please try again.", "error");
        }
    }

    sendBtn.addEventListener("click", async () => {
        const message = userInput.value.trim();
        if (message) {
            await handleUserMessage(message);
            userInput.value = "";
        }
    });

    userInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const message = userInput.value.trim();
            if (message) {
                await handleUserMessage(message);
                userInput.value = "";
            }
        }
    });

    async function handleImageUpload(base64Image) {
        try {
            addMessage('Processing image...', 'bot');
            // Add your image processing logic here
            addMessage('Image processed successfully!', 'bot');
        } catch (error) {
            console.error('Error processing image:', error);
            addMessage('Error processing image. Please try again.', 'error');
        }
    }

    async function handleUserMessage(message) {
        try {
            addMessage(message, 'user');
            // Add your message handling logic here
            addMessage('I received your message: ' + message, 'bot');
        } catch (error) {
            console.error('Error handling message:', error);
            addMessage('Error processing message. Please try again.', 'error');
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

    function showChatInterface() {
        popup.classList.remove("hidden");
        document.getElementById("blur-overlay").classList.remove("hidden");
        chatStartTime = Date.now();
    }

    function getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    function generateChatId() {
        const date = new Date();
        const timestamp = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0') + '_' +
            date.getHours().toString().padStart(2, '0') +
            date.getMinutes().toString().padStart(2, '0') +
            date.getSeconds().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `CHAT_${timestamp}_${random}`;
    }

    // Menu and popup controls
    menuBtn.addEventListener("click", () => {
        menuPane.classList.toggle("hidden");
    });

    menuCloseBtn.addEventListener("click", () => {
        menuPane.classList.add("hidden");
    });

    popupCloseBtn.addEventListener("click", () => {
        popup.classList.add("hidden");
        document.getElementById("blur-overlay").classList.add("hidden");
    });

    logoutBtn.addEventListener("click", () => {
        sessionManager.logout();
    });
});