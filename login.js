import emailService from './lib/email_service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const generateBtn = document.getElementById('generate-credentials');
    const loginStatus = document.getElementById('login-status');

    // Initialize email service
    try {
        await emailService.init();
    } catch (error) {
        console.error('Failed to initialize email service:', error);
        loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Email service initialization failed.';
    }

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('id').value;
        const password = document.getElementById('password').value;

        try {
            // Store credentials in localStorage
            localStorage.setItem('userCredentials', JSON.stringify({ id, password }));
            
            // Redirect to main page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Login failed. Please try again.';
        }
    });

    // Handle credentials generation
    generateBtn.addEventListener('click', async () => {
        try {
            // Generate random credentials
            const id = Math.random().toString(36).substring(2, 8);
            const password = Math.random().toString(36).substring(2, 12);
            
            // Show loading state
            loginStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating credentials...';
            generateBtn.disabled = true;

            // Send credentials via email (using default email)
            await emailService.sendCredentials(null, { id, password });

            // Show success message
            loginStatus.innerHTML = '<i class="fas fa-check-circle"></i> Credentials sent successfully!';
            
            // Clear form
            document.getElementById('id').value = '';
            document.getElementById('password').value = '';
        } catch (error) {
            console.error('Error generating credentials:', error);
            loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to generate credentials. Please try again.';
        } finally {
            generateBtn.disabled = false;
        }
    });
});