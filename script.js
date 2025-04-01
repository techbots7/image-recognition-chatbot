document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("authenticated")) {
        window.location.href = "login.html";
        return;
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

    let stream;
    let chatbotData = {};
    let chatStartTime;
    let currentChatId;

    // Initialize handlers
    const apiHandler = new APIHandler();
    const dbHandler = new DBHandler();
    const emailService = new EmailService();

    try {
        const response = await fetch("chatbot_data.json");
        chatbotData = await response.json();
        addMessage("System initialized successfully! Start the webcam to capture an image.", "bot");
    } catch (error) {
        console.error("Error loading resources:", error);
        addMessage("Error loading resources. Please refresh the page.", "bot");
    }

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
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith("image/")) {
                addMessage("Please upload an image file.", "error");
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                addMessage("Image size exceeds maximum limit (5MB).", "error");
                return;
            }
            
            try {
                const img = new Image();
                img.onerror = () => {
                    addMessage("Failed to load the image. Please try another file.", "error");
                };
                img.onload = async () => {
                    if (img.width > 4096 || img.height > 4096) {
                        addMessage("Image dimensions too large. Maximum size is 4096x4096 pixels.", "error");
                        return;
                    }
                    const canvas = document.getElementById("captured-frame");
                    const context = canvas.getContext("2d");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);
                    showChatInterface();
                    await detectObject(canvas);
                    
                    // Save chat with uploaded image
                    const userId = localStorage.getItem("userId");
                    const chatData = {
                        id: generateChatId(),
                        userId,
                        startTime: chatStartTime,
                        lastMessageTime: Date.now(),
                        image: canvas.toDataURL('image/jpeg', 0.8),
                        uploaded: true,
                        messages: []
                    };
                    
                    await dbHandler.saveChat(chatData);
                    currentChatId = chatData.id;
                    
                    // Clean up
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            } catch (error) {
                console.error("Error processing image:", error);
                addMessage("An error occurred while processing the image. Please try again.", "error");
            }
        };
        input.click();
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

    sendBtn.addEventListener("click", handleUserInput);
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleUserInput();
    });

    function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, "user");
            processUserQuery(message);
            userInput.value = "";
        }
    }

    async function processUserQuery(query) {
        query = query.toLowerCase().trim();
        let reply;
        try {
            function fuzzyMatch(str1, str2) {
                str1 = str1.toLowerCase();
                str2 = str2.toLowerCase();
                const threshold = 0.7;
                let matches = 0;
                for (let i = 0; i < str1.length; i++) {
                    if (str2.includes(str1[i])) matches++;
                }
                return (matches / Math.max(str1.length, str2.length)) >= threshold;
            }

            const memberMatch = chatbotData.team?.members.find(member => {
                const nameParts = member.name.toLowerCase().split(' ');
                const queryWords = query.split(' ');
                return nameParts.some(part => queryWords.some(word => fuzzyMatch(part, word)));
            });

            if (memberMatch) {
                const responses = [
                    `${memberMatch.name} (ID: ${memberMatch.id}) is one of our talented team members working on the ${chatbotData.project.metadata.title} project.`,
                    `Ah yes, ${memberMatch.name}! They're doing great work on our team with ID ${memberMatch.id}.`,
                    `I know ${memberMatch.name}! They're contributing to our ${chatbotData.project.metadata.title} project.`
                ];
                reply = responses[Math.floor(Math.random() * responses.length)];
            } else if (query.includes("project") || query.includes("work") || query.includes("doing")) {
                const projectInfo = {
                    basic: `Our project "${chatbotData.project.metadata.title}" ${chatbotData.project.metadata.description}`,
                    technical: `We're using ${chatbotData.project.technical_details.functionalities.object_detection.current_model} for object detection`,
                    status: `Currently, we're ${chatbotData.project.development_status.integration.current_task}`
                };
                if (query.includes("tech") || query.includes("how")) reply = projectInfo.technical;
                else if (query.includes("status") || query.includes("progress")) reply = projectInfo.status;
                else reply = projectInfo.basic;
            } else if (query.includes("guide") || query.includes("professor") || query.includes("teacher")) {
                const guide = chatbotData.team.guide.personal_info;
                reply = `Our project is guided by ${guide.name}, who is a ${guide.designation} in the ${guide.department} department.`;
            } else if (query.includes("college") || query.includes("institute") || query.includes("study")) {
                const edu = chatbotData.team.education;
                reply = `We're ${edu.degree.year} ${edu.degree.name} students from ${edu.institution.name}, ${edu.institution.address.city}.`;
            } else if (query.includes("joke") || query.includes("funny")) {
                reply = getRandomResponse(chatbotData.interaction.responses.jokes.messages);
            } else if (query.match(/\b(hello|hi|hey|greetings)\b/i)) {
                const hour = new Date().getHours();
                let timeContext = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
                reply = `Good ${timeContext}! ${getRandomResponse(chatbotData.interaction.responses.greetings.messages)}`;
            } else if (query.match(/\b(bye|goodbye|see you|farewell)\b/i)) {
                reply = getRandomResponse(chatbotData.interaction.responses.farewell.messages);
            } else {
                reply = getRandomResponse(chatbotData.interaction.responses.unknown.messages);
            }

            addMessage(reply, "bot");

            // Update chat in database
            if (currentChatId) {
                const chatData = {
                    id: currentChatId,
                    lastMessageTime: Date.now(),
                    messages: [
                        { sender: "user", text: query },
                        { sender: "bot", text: reply }
                    ]
                };
                await dbHandler.saveChat(chatData);
            }
        } catch (error) {
            console.error("Error processing query:", error);
            addMessage("Sorry, I encountered an error. Please try again.", "error");
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add(sender);
        messageDiv.innerHTML = `
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            <span>${text}</span>
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
        localStorage.removeItem("authenticated");
        localStorage.removeItem("authData");
        window.location.href = "login.html";
    });
});