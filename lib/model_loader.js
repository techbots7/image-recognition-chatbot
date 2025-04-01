// Model Loader for TensorFlow.js
class ModelLoader {
    constructor() {
        this.MODEL_PATH = 'my_model';
        this.MODEL_JSON = 'model.json';
        this.WEIGHTS_BIN = 'weights.bin';
        this.CLASS_NAMES = [
            'Satya Sai Nadigadda',
            'Ashok Pallapu',
            'Javeed Anwar Shaik',
            'Dayananda Sagar Munagala',
            'Sandeep Munaga'
        ];
    }

    async loadModel() {
        try {
            // First try to load from local path
            try {
                const model = await tf.loadGraphModel(`${this.MODEL_PATH}/${this.MODEL_JSON}`);
                console.log('Loaded model from local path');
                return { model, classNames: this.CLASS_NAMES };
            } catch (localError) {
                console.log('Could not load model from local path:', localError);
                throw new Error('Failed to load the face recognition model. Please ensure the model files are present.');
            }
        } catch (error) {
            console.error('Error loading model:', error);
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
        const batched = tf.tidy(() => {
            const normalized = tf.div(tf.cast(img, 'float32'), 255);
            return tf.expandDims(normalized, 0);
        });

        try {
            const predictions = await model.predict(batched);
            const scores = await predictions.data();
            
            batched.dispose();
            tf.dispose(predictions);

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
            batched.dispose();
            return [];
        }
    }

    drawDetections(canvas, detections) {
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
    }
}

// Make ModelLoader available globally
window.ModelLoader = ModelLoader; 