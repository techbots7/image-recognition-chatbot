class Camera {
    constructor() {
        this.video = null;
        this.stream = null;
        this.isActive = false;
    }

    async initialize(videoElement) {
        try {
            this.video = videoElement;
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            this.isActive = true;
            return true;
        } catch (error) {
            console.error('Error initializing camera:', error);
            return false;
        }
    }

    async captureImage() {
        if (!this.video || !this.isActive) {
            throw new Error('Camera not initialized');
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(this.video, 0, 0);
        return canvas.toDataURL('image/jpeg');
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isActive = false;
        }
    }
}

// Export for use in other files
window.Camera = Camera; 