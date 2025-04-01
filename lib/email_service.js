class EmailService {
    constructor() {
        // Use environment variables or fallback to default values
        this.serviceId = process.env.EMAILJS_SERVICE_ID || 'service_dqganhw';
        this.templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_wavm5up';
        this.userId = process.env.EMAILJS_USER_ID || 'tXX17RsjHw9DKzwVu';
        this.initialized = false;
    }

    async init() {
        try {
            if (!this.serviceId || !this.templateId || !this.userId) {
                throw new Error('EmailJS configuration is incomplete');
            }
            
            // Initialize EmailJS if not already initialized
            if (!this.initialized) {
                await emailjs.init(this.userId);
                this.initialized = true;
                console.log('EmailJS initialized successfully');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            return false;
        }
    }

    async sendCredentials(email, credentials) {
        try {
            // Ensure EmailJS is initialized
            if (!this.initialized) {
                const initialized = await this.init();
                if (!initialized) {
                    throw new Error('Failed to initialize EmailJS');
                }
            }

            // Validate email configuration
            if (!this.serviceId || !this.templateId || !this.userId) {
                throw new Error('EmailJS configuration is incomplete');
            }

            const templateParams = {
                to_email: email,
                user_id: credentials.id,
                password: credentials.password,
                to_name: 'User'
            };

            console.log('Sending email with params:', {
                serviceId: this.serviceId,
                templateId: this.templateId,
                templateParams
            });

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams,
                this.userId
            );

            console.log('EmailJS response:', response);

            if (response.status !== 200) {
                throw new Error(`EmailJS returned status ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Failed to send credentials:', error);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
            throw error;
        }
    }

    updateConfig(serviceId, templateId, userId) {
        this.serviceId = serviceId;
        this.templateId = templateId;
        this.userId = userId;
        this.initialized = false; // Reset initialization state
    }
}

// Create and export a single instance
const emailService = new EmailService();
export default emailService;