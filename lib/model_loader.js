// Model Loader for TensorFlow.js
class ModelLoader {
    constructor() {
        this.MODEL_PATH = '/my_model';  // Use absolute path
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
        this.modelLoadTimeout = 10000; // 10 seconds timeout
    }

    async loadModel() {
        try {
            // Try loading with different path variations
            const paths = [
                `${this.MODEL_PATH}/${this.MODEL_JSON}`,
                `my_model/${this.MODEL_JSON}`,
                `./my_model/${this.MODEL_JSON}`,
                `../my_model/${this.MODEL_JSON}`
            ];

            let lastError = null;
            for (const path of paths) {
                try {
                    console.log(`Attempting to load model from: ${path}`);
                    const model = await Promise.race([
                        tf.loadLayersModel(path),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Model load timeout')), this.modelLoadTimeout)
                        )
                    ]);
                    console.log('Successfully loaded model from:', path);
                    return { model, classNames: this.CLASS_NAMES };
                } catch (error) {
                    console.log(`Failed to load from ${path}:`, error.message);
                    lastError = error;
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

            const predictions = await model.predict(batched);
            const scores = await predictions.data();
            
            // Cleanup
            batched.dispose();
            predictions.dispose();

            // Find the class with highest confidence
            const maxScore = Math.max(...scores);
            const classIndex = scores.indexOf(maxScore);

            if (maxScore > 0.7) { // Confidence threshold of 70%
                return [{
                    class: this.CLASS_NAMES[classIndex],
                    score: maxScore,
                    bbox: {
                        top: 0,
                        left: 0,
                        bottom: img.height,
                        right: img.width
                    }
                }];
            }
            
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