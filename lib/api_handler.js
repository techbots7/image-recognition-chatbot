class APIHandler {
    constructor() {
        this.geminiApiKey = window._env?.GEMINI_API_KEY;
        this.isOnline = navigator.onLine;
        this.model = null;
        this.tfModel = null;
        this.modelLoader = new ModelLoader();
        this.chatbotData = null;
        this.modelLoadingAttempted = false;
        this.offlineMode = false;
        this.setupNetworkListeners();
        this.initModels();
    }

    setupNetworkListeners() {
        window.addEventListener('online', async () => {
            this.isOnline = true;
            if (!this.model && !this.offlineMode) {
                await this.initGeminiModel();
            }
            if (this.model) {
                this.hideOfflineNotification();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.offlineMode = true;
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
        notification.textContent = this.offlineMode ? 
            'Operating in offline mode. Some features may be limited.' :
            'You are offline. Using local resources for detection and conversation.';
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
            // Load chatbot data first for offline support
            const response = await fetch('chatbot_data.json');
            if (!response.ok) throw new Error('Failed to load chatbot data');
            this.chatbotData = await response.json();

            // Initialize TensorFlow model first for offline support
            await this.initTensorFlowModel();

            // Initialize Gemini model if online and not in offline mode
            if (this.isOnline && !this.offlineMode) {
                try {
                    await this.initGeminiModel();
                } catch (error) {
                    console.warn('Failed to initialize Gemini model, falling back to offline mode:', error);
                    this.offlineMode = true;
                }
            }
            
            // Show appropriate notification based on model status
            if (this.isOnline && this.model && !this.offlineMode) {
                this.hideOfflineNotification();
            } else {
                this.showOfflineNotification();
            }
        } catch (error) {
            console.error('Error initializing models:', error);
            this.offlineMode = true;
            this.showOfflineNotification();
        }
    }

    async initTensorFlowModel() {
        try {
            if (!this.tfModel) {
                const { model } = await this.modelLoader.loadModel();
                this.tfModel = model;
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
            this.offlineMode = true;
            return;
        }

        try {
            if (!window.google?.generativeAI) {
                throw new Error('Gemini API not loaded properly');
            }
            
            // Initialize the Gemini API with timeout
            const genAI = window.google.generativeAI;
            genAI.configure({ apiKey: this.geminiApiKey });
            
            // Get the Gemini Pro Vision model with timeout
            const modelPromise = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            this.model = await Promise.race([
                modelPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini model initialization timeout')), 10000)
                )
            ]);
            
            if (!this.model) {
                throw new Error('Failed to initialize Gemini model');
            }
            console.log('Gemini model initialized successfully');
            this.hideOfflineNotification();
        } catch (error) {
            console.error('Error initializing Gemini model:', error);
            this.offlineMode = true;
            this.showOfflineNotification();
            throw error;
        }
    }

    async detectObjects(imageData) {
        try {
            if (this.isOnline && this.model && !this.offlineMode) {
                const imageBlob = await this.processImage(imageData);
                const prompt = "Detect and list all objects in this image. Keep the response short and concise.";
                
                const result = await Promise.race([
                    this.model.generateContent([prompt, imageBlob]),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
                    )
                ]);
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
            const detections = await this.modelLoader.detectObjects(this.tfModel, img);
            
            // Draw detections on the canvas if available
            const canvas = document.getElementById('captured-frame');
            if (canvas) {
                this.modelLoader.drawDetections(canvas, detections);
            }

            // Format detections into a readable string
            return this.formatDetections(detections);
        } catch (error) {
            console.error('Error in offline detection:', error);
            return "Error performing offline detection";
        }
    }

    formatDetections(detections) {
        if (detections.length === 0) {
            return "No objects detected";
        }

        const objects = detections.map(d => `${d.class} (${Math.round(d.score * 100)}% confidence)`);
        return `Detected objects: ${objects.join(', ')}`;
    }

    async preprocessImage(imageData) {
        return tf.tidy(() => {
            const img = tf.browser.fromPixels(imageData);
            const resized = tf.image.resizeBilinear(img, [224, 224]);
            const normalized = resized.div(255.0);
            return normalized;
        });
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