class APIHandler {
    constructor() {
        this.geminiApiKey = window._env?.GEMINI_API_KEY;
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
            this.hideOfflineNotification();
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

            // Initialize TensorFlow model first
            await this.initTensorFlowModel();

            // Initialize Gemini model if online
            if (this.isOnline) {
                await this.initGeminiModel();
            }
        } catch (error) {
            console.error('Error initializing models:', error);
            this.showOfflineNotification();
        }
    }

    async initTensorFlowModel() {
        try {
            if (!this.tfModel) {
                this.tfModel = await tf.loadGraphModel('model/model.json');
                console.log('TensorFlow model loaded successfully');
            }
        } catch (error) {
            console.error('Error loading TensorFlow model:', error);
            throw error;
        }
    }

    async initGeminiModel() {
        if (!this.geminiApiKey) {
            console.error('Gemini API key not found. Please set your API key.');
            return;
        }

        try {
            if (!window.google?.generativeAI) {
                throw new Error('Gemini API not loaded properly');
            }
            
            // Initialize the Gemini API
            const genAI = window.google.generativeAI;
            genAI.configure({ apiKey: this.geminiApiKey });
            
            // Get the Gemini Pro Vision model
            this.model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            
            if (!this.model) {
                throw new Error('Failed to initialize Gemini model');
            }
            console.log('Gemini model initialized successfully');
        } catch (error) {
            console.error('Error initializing Gemini model:', error);
            throw error;
        }
    }

    async detectObjects(imageData) {
        try {
            if (this.isOnline && this.model) {
                const imageBlob = await this.processImage(imageData);
                const prompt = "Detect and list all objects in this image. Keep the response short and concise.";
                
                const result = await this.model.generateContent([prompt, imageBlob]);
                const response = await result.response;
                return response.text();
            } else {
                return this.offlineDetectObjects(imageData);
            }
        } catch (error) {
            console.error('Error in object detection:', error);
            return this.offlineDetectObjects(imageData);
        }
    }

    async offlineDetectObjects(imageData) {
        try {
            if (!this.tfModel) {
                await this.initTensorFlowModel();
            }

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
        try {
            // Convert predictions to a more readable format
            const data = predictions.dataSync();
            const maxIndex = Array.from(data).indexOf(Math.max(...data));
            const classes = ['person', 'car', 'bicycle', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat'];
            return `Detected object: ${classes[maxIndex] || 'unknown'}`;
        } catch (error) {
            console.error('Error formatting predictions:', error);
            return "Basic object detection using local TensorFlow model";
        }
    }

    async generateResponse(query, context = '') {
        try {
            if (this.isOnline && this.model) {
                const prompt = `Context: ${context}\nUser: ${query}\nKeep the response short and concise.`;
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } else {
                return this.offlineGenerateResponse(query, context);
            }
        } catch (error) {
            console.error('Error generating response:', error);
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
        try {
            const response = await fetch(imageData);
            const blob = await response.blob();
            return new Blob([blob], { type: 'image/jpeg' });
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
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