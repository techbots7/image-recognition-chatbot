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

            // Initialize models
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
            // The Gemini API is already loaded in the HTML
            this.model = window.google?.generativeLanguage;
            if (!this.model) {
                throw new Error('Gemini API not loaded properly');
            }
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
        if (!this.tfModel) {
            try {
                this.tfModel = await tf.loadGraphModel('model/model.json');
            } catch (error) {
                console.error('Error loading TensorFlow model:', error);
                return "Error loading offline detection model";
            }
        }

        try {
            const img = await this.preprocessImage(imageData);
            const predictions = await this.tfModel.predict(img);
            return this.formatPredictions(predictions);
        } catch (error) {
            console.error('Error in offline detection:', error);
            return "Error performing offline detection";
        }
    }

    async preprocessImage(imageData) {
        return tf.tidy(() => {
            const img = tf.browser.fromPixels(imageData);
            const resized = tf.image.resizeBilinear(img, [224, 224]);
            const normalized = resized.div(255.0);
            return normalized.expandDims(0);
        });
    }

    formatPredictions(predictions) {
        // Format TensorFlow.js predictions
        return "Basic object detection using local TensorFlow model";
    }

    async generateResponse(query, context = '') {
        if (this.isOnline && this.model) {
            try {
                const prompt = `Context: ${context}\nUser: ${query}\nKeep the response short and concise.`;
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
        if (!this.chatbotData) {
            return "I'm currently offline. Please try again when you're connected.";
        }
        
        const keywords = Object.keys(this.chatbotData);
        for (const keyword of keywords) {
            if (query.toLowerCase().includes(keyword.toLowerCase())) {
                return this.chatbotData[keyword];
            }
        }
        
        return "I'm currently offline. Please try again when you're connected.";
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

// Make APIHandler available globally
window.APIHandler = APIHandler;