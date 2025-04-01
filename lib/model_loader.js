// Model Loader for TensorFlow.js
class ModelLoader {
    constructor() {
        // Get the base URL from the current window location
        this.BASE_URL = window.location.origin;
        this.MODEL_PATH = 'my_model';  // Relative path
        this.MODEL_JSON = 'model.json';
        this.WEIGHTS_BIN = 'weights.bin';
        this.CLASS_NAMES = [
            'Satya Sai Nadigadda',
            'Ashok Pallapu',
            'Javeed Anwar Shaik',
            'Dayananda Sagar Munagala',
            'Sandeep Munaga'
        ];
        this.modelLoadAttempts = 0;
        this.maxLoadAttempts = 3;
    }

    async loadModel() {
        try {
            // Try loading with different path variations
            const paths = [
                // Try relative paths first
                `./${this.MODEL_PATH}/${this.MODEL_JSON}`,
                `${this.MODEL_PATH}/${this.MODEL_JSON}`,
                // Then try absolute paths
                `/${this.MODEL_PATH}/${this.MODEL_JSON}`,
                `${this.BASE_URL}/${this.MODEL_PATH}/${this.MODEL_JSON}`,
                // Try direct paths as fallback
                '/my_model/model.json',
                `${this.BASE_URL}/my_model/model.json`
            ];

            console.log('Base URL:', this.BASE_URL);
            console.log('Available paths to try:', paths);

            let lastError = null;
            for (const path of paths) {
                try {
                    console.log(`Attempting to load model from: ${path}`);
                    
                    // Log the full URL being requested
                    const fullUrl = path.startsWith('http') ? path : new URL(path, window.location.href).href;
                    console.log('Full URL being requested:', fullUrl);

                    // Try to fetch the model.json first to verify it exists
                    const response = await fetch(path);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch model.json: ${response.status} ${response.statusText}`);
                    }
                    
                    // If fetch successful, try loading the model
                    const model = await tf.loadGraphModel(path);
                    console.log('Successfully loaded model from:', path);
                    
                    // Verify model is loaded correctly
                    if (!model || !model.predict) {
                        throw new Error('Model loaded but predict function not available');
                    }

                    return { model, classNames: this.CLASS_NAMES };
                } catch (error) {
                    console.log(`Failed to load from ${path}:`, error.message);
                    lastError = error;
                    
                    // Log additional error details
                    if (error.response) {
                        console.log('Error response:', await error.response.text());
                    }
                }
            }

            // If we get here, all paths failed
            throw new Error(`Failed to load model from all paths. Last error: ${lastError.message}`);
        } catch (error) {
            console.error('Error in loadModel:', error);
            
            // Increment attempt counter and try again if under max attempts
            this.modelLoadAttempts++;
            if (this.modelLoadAttempts < this.maxLoadAttempts) {
                console.log(`Retrying model load (attempt ${this.modelLoadAttempts + 1}/${this.maxLoadAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                return this.loadModel();
            }
            
            throw error;
        }
    }

    async saveModel(model) {
        try {
            const saveResult = await model.save(`downloads://${this.MODEL_PATH}`);
            console.log('Model saved successfully:', saveResult);
        } catch (error) {
            console.error('Error saving model:', error);
            throw error;
        }
    }

    async detectObjects(model, img) {
        let batched = null;
        try {
            batched = tf.tidy(() => {
                const normalized = tf.div(tf.cast(img, 'float32'), 255);
                return tf.expandDims(normalized, 0);
            });

            console.log('Running prediction on image...');
            const predictions = await model.predict(batched);
            console.log('Raw predictions:', predictions);
            
            const scores = await predictions.data();
            console.log('Prediction scores:', scores);
            
            // Cleanup
            batched.dispose();
            predictions.dispose();

            // Find the class with highest confidence
            const maxScore = Math.max(...scores);
            const classIndex = scores.indexOf(maxScore);

            console.log('Max score:', maxScore, 'Class index:', classIndex);

            if (maxScore > 0.7) { // Confidence threshold of 70%
                const result = [{
                    class: this.CLASS_NAMES[classIndex],
                    score: maxScore,
                    bbox: {
                        top: 0,
                        left: 0,
                        bottom: img.height,
                        right: img.width
                    }
                }];
                console.log('Detection result:', result);
                return result;
            }
            
            console.log('No confident predictions found');
            return []; // Return empty array if no confident predictions
        } catch (error) {
            console.error('Error during detection:', error);
            if (batched) {
                try {
                    batched.dispose();
                } catch (disposeError) {
                    console.error('Error disposing tensor:', disposeError);
                }
            }
            return [];
        }
    }

    drawDetections(canvas, detections) {
        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            detections.forEach(detection => {
                const { bbox, class: label, score } = detection;
                
                // Draw semi-transparent overlay
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                ctx.fillRect(bbox.left, bbox.top, bbox.right - bbox.left, bbox.bottom - bbox.top);
                
                // Draw border
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(bbox.left, bbox.top, bbox.right - bbox.left, bbox.bottom - bbox.top);

                // Draw label background
                const labelText = `${label} (${Math.round(score * 100)}%)`;
                const textMetrics = ctx.measureText(labelText);
                const textHeight = 20;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(bbox.left, bbox.top - textHeight, textMetrics.width + 10, textHeight);

                // Draw label text
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText(labelText, bbox.left + 5, bbox.top - 5);
            });
        } catch (error) {
            console.error('Error drawing detections:', error);
        }
    }
}

// Make ModelLoader available globally
window.ModelLoader = ModelLoader; 