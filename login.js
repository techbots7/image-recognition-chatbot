document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const generateCredentialsBtn = document.getElementById('generate-credentials');
    const loginStatus = document.getElementById('login-status');
    const emailService = new EmailService();

    // Set default credentials
    const defaultId = 'admin';
    const defaultPassword = 'admin123';

    // Store credentials in localStorage
    localStorage.setItem('userId', defaultId);
    localStorage.setItem('userPassword', defaultPassword);

    // Generate credentials button click handler
    generateCredentialsBtn.addEventListener('click', async () => {
        try {
            // Show loading state
            loginStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating credentials...';
            
            // Send credentials via email
            const emailSent = await emailService.sendCredentials(defaultId, defaultPassword);
            
            if (emailSent) {
                loginStatus.innerHTML = '<i class="fas fa-check-circle"></i> Credentials sent successfully!';
                loginStatus.style.color = 'green';
            } else {
                loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to send credentials. Please try again.';
                loginStatus.style.color = 'red';
            }
        } catch (error) {
            console.error('Error sending credentials:', error);
            loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error sending credentials. Please try again.';
            loginStatus.style.color = 'red';
        }
    });

    // Login form submission handler
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('id').value;
        const password = document.getElementById('password').value;

        // Check against stored credentials
        if (id === defaultId && password === defaultPassword) {
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('loginTime', new Date().toISOString());
            
            // Show success message
            loginStatus.innerHTML = '<i class="fas fa-check-circle"></i> Login successful! Redirecting...';
            loginStatus.style.color = 'green';
            
            // Redirect to main page after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            loginStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid credentials. Please try again.';
            loginStatus.style.color = 'red';
        }
    });
});