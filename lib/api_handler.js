class APIHandler {
    constructor() {
        this.geminiApiKey = window._env?.GEMINI_API_KEY || 'your_gemini_api_key';
        this.isOnline = navigator.onLine;
        this.model = null;
        this.tfModel = null;
        this.chatbotData = null;
        this.setupNetworkListeners();
        this.initModels();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.initGeminiModel();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineNotification();
        });
    }

    showOfflineNotification() {
        let notification = document.getElementById('offline-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'offline-notification';
            document.body.appendChild(notification);
        }
        notification.textContent = 'You are offline. Using local resources for detection and conversation.';
        notification.style.display = 'block';
    }

    hideOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    async initModels() {
        try {
            // Load chatbot data
            const response = await fetch('chatbot_data.json');
            this.chatbotData = await response.json();

            // Load TensorFlow.js model for offline detection
            if (this.isOnline) {
                await this.initGeminiModel();
            }
        } catch (error) {
            console.error('Error initializing models:', error);
        }
    }

    async initGeminiModel() {
        if (!this.geminiApiKey) {
            console.error('Gemini API key not found. Please set your API key.');
            return;
        }
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(this.geminiApiKey);
            this.model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        } catch (error) {
            console.error('Error initializing Gemini model:', error);
        }
    }

    async detectObjects(imageData) {
        if (this.isOnline && this.model) {
            try {
                const imageBlob = await this.processImage(imageData);
                const result = await this.model.generateContent([
                    "Detect and list all objects in this image. Keep the response short and concise.",
                    imageBlob
                ]);
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.error('Error in online detection:', error);
                return this.offlineDetectObjects(imageData);
            }
        } else {
            return this.offlineDetectObjects(imageData);
        }
    }

    async offlineDetectObjects(imageData) {
        // Use TensorFlow.js for offline detection
        // This is a placeholder - you'll need to implement the actual TensorFlow.js model
        return "Offline detection: Basic object detection using local model";
    }

    async generateResponse(query, context = '') {
        if (this.isOnline && this.model) {
            try {
                const prompt = `Context: ${context}\nUser: ${query}\nKeep the response short and concise, similar to the style in chatbot_data.json.`;
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.error('Error in online response:', error);
                return this.offlineGenerateResponse(query, context);
            }
        } else {
            return this.offlineGenerateResponse(query, context);
        }
    }

    offlineGenerateResponse(query, context = '') {
        // Use local chatbot_data.json for offline responses
        if (!this.chatbotData) return "I'm currently offline. Please try again when you're connected.";
        
        // Simple keyword matching for offline mode
        const keywords = Object.keys(this.chatbotData);
        for (const keyword of keywords) {
            if (query.toLowerCase().includes(keyword.toLowerCase())) {
                return this.chatbotData[keyword];
            }
        }
        
        return "I'm currently offline. Please try again when you're connected.";
    }

    async analyzeSentiment(text) {
        if (this.isOnline && this.model) {
            try {
                const prompt = `Analyze the sentiment of this text: "${text}". Respond with only "positive", "negative", or "neutral".`;
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text().toLowerCase();
            } catch (error) {
                console.error('Error in online sentiment analysis:', error);
                return this.offlineAnalyzeSentiment(text);
            }
        } else {
            return this.offlineAnalyzeSentiment(text);
        }
    }

    offlineAnalyzeSentiment(text) {
        // Simple keyword-based sentiment analysis for offline mode
        const positiveWords = ['good', 'great', 'excellent', 'happy', 'love'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike'];
        
        const words = text.toLowerCase().split(' ');
        let sentiment = 'neutral';
        
        for (const word of words) {
            if (positiveWords.includes(word)) {
                sentiment = 'positive';
                break;
            } else if (negativeWords.includes(word)) {
                sentiment = 'negative';
                break;
            }
        }
        
        return sentiment;
    }

    async processImage(imageData) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        return blob;
    }

    setApiKey(key) {
        this.geminiApiKey = key;
        localStorage.setItem('geminiApiKey', key);
        this.initGeminiModel();
    }

    getApiKey() {
        return this.geminiApiKey;
    }
}

// Export the API handler
window.APIHandler = APIHandler;