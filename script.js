document.addEventListener("DOMContentLoaded", async () => {
    // Check authentication using SessionManager
    if (!window.SessionManager.checkSession()) {
        window.location.href = "login.html";
        return;
    }

    const webcamElement = document.getElementById("webcam");
    const startWebcamBtn = document.getElementById("start-webcam");
    const captureBtn = document.getElementById("capture-btn");
    const uploadBtn = document.getElementById("upload-btn");
    const chatbotPopup = document.getElementById("chatbot-popup");
    const capturedCanvas = document.getElementById("captured-frame");
    const chatbox = document.getElementById("chatbox");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const menuBtn = document.getElementById("menu-btn");
    const menuPane = document.getElementById("menu-pane");
    const blurOverlay = document.getElementById("blur-overlay");
    const menuCloseBtn = document.querySelector(".menu-close-btn");
    const popupCloseBtn = document.querySelector(".popup-close-btn");
    const logoutBtn = document.getElementById("logout-btn");

    let model = null;
    let stream = null;
    const chat = new window.Chat();
    const camera = new window.Camera(webcamElement);
    const ui = new window.UI();

    try {
        model = await window.ModelLoader.loadModel("lib/model/model.json");
        console.log("Model loaded successfully");
    } catch (error) {
        console.error("Error loading model:", error);
        ui.showError("Failed to load the recognition model. Please try again later.");
    }

    startWebcamBtn.addEventListener("click", async () => {
        try {
            await camera.start();
            startWebcamBtn.disabled = true;
            captureBtn.disabled = false;
        } catch (error) {
            console.error("Error accessing webcam:", error);
            ui.showError("Could not access webcam. Please check permissions.");
        }
    });

    captureBtn.addEventListener("click", () => {
        const imageData = camera.capture(capturedCanvas);
        camera.stop();
        ui.showChatbotPopup(chatbotPopup, blurOverlay);
        processImage(imageData);
    });

    uploadBtn.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const context = capturedCanvas.getContext("2d");
                        capturedCanvas.width = img.width;
                        capturedCanvas.height = img.height;
                        context.drawImage(img, 0, 0);
                        ui.showChatbotPopup(chatbotPopup, blurOverlay);
                        processImage(capturedCanvas);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });

    async function processImage(imageElement) {
        try {
            const prediction = await window.ModelLoader.predict(model, imageElement);
            const topPredictions = window.ModelLoader.getTopPredictions(prediction, 3);
            
            chat.addMessage("I can see the following objects in the image:", false);
            topPredictions.forEach(pred => {
                chat.addMessage(`- ${pred.label} (${(pred.probability * 100).toFixed(1)}% confident)`, false);
            });
            chat.addMessage("What would you like to know about these objects?", false);
            
            // Save interaction in database
            await window.DBHandler.saveInteraction({
                type: "image_recognition",
                predictions: topPredictions,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error processing image:", error);
            ui.showError("Failed to process the image. Please try again.");
        }
    }

    sendBtn.addEventListener("click", async () => {
        const text = userInput.value.trim();
        if (text) {
            chat.addMessage(text, true);
            userInput.value = "";
            
            try {
                const response = await window.APIHandler.getChatResponse(text);
                chat.addMessage(response, false);
                
                // Save chat message
                await window.DBHandler.saveChatMessage({
                    user: text,
                    bot: response,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error("Error getting response:", error);
                ui.showError("Failed to get response. Please try again.");
            }
        }
    });

    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendBtn.click();
        }
    });

    menuBtn.addEventListener("click", () => {
        ui.toggleMenu(menuPane, blurOverlay, true);
    });

    menuCloseBtn.addEventListener("click", () => {
        ui.toggleMenu(menuPane, blurOverlay, false);
    });

    popupCloseBtn.addEventListener("click", () => {
        ui.hidePopup(chatbotPopup, blurOverlay);
        camera.reset();
        startWebcamBtn.disabled = false;
        captureBtn.disabled = true;
    });

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        window.SessionManager.logout();
    });

    blurOverlay.addEventListener("click", () => {
        if (!chatbotPopup.classList.contains("hidden")) {
            ui.hidePopup(chatbotPopup, blurOverlay);
            camera.reset();
        }
        ui.toggleMenu(menuPane, blurOverlay, false);
    });
});
