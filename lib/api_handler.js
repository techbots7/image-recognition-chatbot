class APIHandler {
    constructor(geminiApiKey) {
        this.geminiApiKey = geminiApiKey;
        this.isOnline = navigator.onLine;
        this.modelLoader = new ModelLoader();
        this.model = null;
        this.modelLoadingAttempted = false;
        this.modelLoadError = null;
        this.geminiModel = null;

        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Network is online');
            this.isOnline = true;
            // Try loading Gemini if it wasn't loaded before
            if (!this.geminiModel) {
                this.initGeminiModel();
            }
        });

        window.addEventListener('offline', () => {
            console.log('Network is offline');
            this.isOnline = false;
        });
    }

    async init() {
        try {
            // Initialize both models in parallel
            const [tfResult] = await Promise.all([
                this.initTensorFlowModel(),
                this.initGeminiModel()
            ]);

            // If TensorFlow model failed to load but we're online, throw error
            if (!tfResult && this.isOnline) {
                throw new Error('Failed to initialize TensorFlow model');
            }

            return true;
        } catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }

    async initTensorFlowModel() {
        if (this.modelLoadingAttempted) {
            console.log('Model loading already attempted');
            if (this.modelLoadError) {
                console.error('Previous model loading error:', this.modelLoadError);
            }
            return this.model !== null;
        }

        try {
            console.log('Initializing TensorFlow model...');
            const { model } = await this.modelLoader.loadModel();
            this.model = model;
            this.modelLoadingAttempted = true;
            console.log('TensorFlow model loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading TensorFlow model:', error);
            this.modelLoadError = error;
            this.modelLoadingAttempted = true;
            
            // If we're offline, don't throw - we'll use Gemini as fallback
            if (!this.isOnline) {
                console.log('Offline mode - will use Gemini API as fallback');
                return false;
            }
            throw error;
        }
    }

    async initGeminiModel() {
        if (!this.isOnline) {
            console.log('Offline - skipping Gemini initialization');
            return false;
        }

        try {
            console.log('Initializing Gemini API...');
            
            // Check if the Gemini API is already loaded
            if (window.google?.generativeAI) {
                const genAI = window.google.generativeAI;
                genAI.configure({ apiKey: this.geminiApiKey });
                this.geminiModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
                console.log('Gemini API initialized successfully');
                return true;
            } else {
                // Try loading the Gemini API dynamically
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(this.geminiApiKey);
                this.geminiModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
                console.log('Gemini API initialized successfully');
                return true;
            }
        } catch (error) {
            console.error('Error initializing Gemini API:', error);
            // Don't throw if TensorFlow is working
            if (!this.model) {
                throw error;
            }
            return false;
        }
    }

    async processImage(imageData, canvas) {
        try {
            // Try TensorFlow model first
            if (this.model) {
                console.log('Processing image with TensorFlow model...');
                const detections = await this.modelLoader.detectObjects(this.model, imageData);
                
                if (detections && detections.length > 0) {
                    console.log('TensorFlow detections:', detections);
                    this.modelLoader.drawDetections(canvas, detections);
                    return {
                        success: true,
                        detections,
                        source: 'tensorflow'
                    };
                }
                console.log('No detections from TensorFlow model');
            }

            // Fallback to Gemini if online and available
            if (this.isOnline && this.geminiModel) {
                console.log('Falling back to Gemini API...');
                const result = await this.processWithGemini(imageData);
                return {
                    success: true,
                    detections: result,
                    source: 'gemini'
                };
            }

            // If neither model worked
            throw new Error(
                this.model ? 'No detections found' :
                this.isOnline ? 'Both models failed to process the image' :
                'Offline and TensorFlow model not available'
            );

        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    async processWithGemini(imageData) {
        try {
            // Convert canvas data to blob
            const blob = await new Promise(resolve => {
                const canvas = document.createElement('canvas');
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                const ctx = canvas.getContext('2d');
                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg');
            });

            // Create file-like object
            const imageFile = {
                data: new Uint8Array(await blob.arrayBuffer()),
                mimeType: "image/jpeg"
            };

            // Generate content
            const result = await this.geminiModel.generateContent([
                "Analyze this image and identify if any of these people are present: " +
                "Satya Sai Nadigadda, Ashok Pallapu, Javeed Anwar Shaik, " +
                "Dayananda Sagar Munagala, or Sandeep Munaga. " +
                "Return ONLY the name if found, or 'Unknown Person' if not recognized.",
                imageFile
            ]);

            const response = await result.response;
            const text = response.text().trim();

            // Format response to match TensorFlow output
            return [{
                class: text,
                score: 0.9, // Gemini doesn't provide confidence scores
                bbox: {
                    top: 0,
                    left: 0,
                    bottom: imageData.height,
                    right: imageData.width
                }
            }];
        } catch (error) {
            console.error('Error processing with Gemini:', error);
            throw error;
        }
    }
}

// Make APIHandler available globally
window.APIHandler = APIHandler;