class SessionManager {
    constructor() {
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    isLoggedIn() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const loginTime = localStorage.getItem('loginTime');
        
        if (!isLoggedIn || !loginTime) {
            return false;
        }

        const currentTime = new Date().getTime();
        const timeSinceLogin = currentTime - parseInt(loginTime);
        
        if (timeSinceLogin >= this.sessionTimeout) {
            this.logout();
            return false;
        }

        return true;
    }

    login() {
        const currentTime = new Date().getTime();
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginTime', currentTime.toString());
    }

    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('userCredentials');
        window.location.href = 'login.html';
    }

    getCredentials() {
        const credentials = localStorage.getItem('userCredentials');
        return credentials ? JSON.parse(credentials) : null;
    }

    checkSession() {
        if (!this.isLoggedIn()) {
            this.logout();
            return false;
        }
        return true;
    }
}

// Create and export a single instance
const sessionManager = new SessionManager();
export default sessionManager; 