document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginStatus = document.getElementById("login-status");
    const generateCredentialsBtn = document.getElementById("generate-credentials");

    if (localStorage.getItem("authenticated")) {
        window.location.href = "index.html";
        return;
    }

    generateCredentialsBtn.addEventListener("click", () => {
        const credentials = generateCredentials();
        localStorage.setItem("credentials", JSON.stringify(credentials));
        
        loginStatus.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Credentials generated. Valid for 24 hours.
        `;
        console.log(`Generated Credentials:
            ID: ${credentials.id}
            Password: ${credentials.password}
            Expires: ${new Date(credentials.expiration).toLocaleString()}`);
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("id").value;
        const password = document.getElementById("password").value;
        const credentialsData = JSON.parse(localStorage.getItem("credentials"));

        if (!credentialsData) {
            showStatus("No credentials found. Generate credentials first.", "error");
            return;
        }

        const now = new Date();
        const expiration = new Date(credentialsData.expiration);

        if (now > expiration) {
            showStatus("Credentials have expired. Please generate new ones.", "error");
            localStorage.removeItem("credentials");
            return;
        }

        if (id === credentialsData.id && password === credentialsData.password) {
            try {
                const authData = {
                    userId: id,
                    loginTime: new Date().toISOString(),
                    sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                };
                
                localStorage.setItem("authenticated", "true");
                localStorage.setItem("authData", JSON.stringify(authData));
                
                showStatus("Login successful! Redirecting...", "success");
                setTimeout(() => window.location.href = "index.html", 1500);
            } catch (error) {
                console.error("Login error:", error);
                showStatus("An error occurred during login.", "error");
            }
        } else {
            showStatus("Invalid credentials.", "error");
        }
    });

    function showStatus(message, type) {
        loginStatus.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            ${message}
        `;
        loginStatus.className = `status-text ${type}`;
    }

    function generateCredentials() {
        const id = generateRandomString(7, true, true);
        const password = generateRandomString(13, true, true);
        const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        return { id, password, expiration };
    }

    function generateRandomString(length, includeSpecial = true, includeNumbers = true) {
        const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const specials = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        let characters = alphabets;
        if (includeNumbers) characters += numbers;
        if (includeSpecial) characters += specials;

        let result = "";
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        result = ensureChars(result, 3, specials);
        result = ensureChars(result, 2, numbers);
        return result;
    }

    function ensureChars(str, count, source) {
        for (let i = 0; i < count; i++) {
            const pos = Math.floor(Math.random() * str.length);
            str = str.substring(0, pos) + source.charAt(Math.floor(Math.random() * source.length)) + str.substring(pos + 1);
        }
        return str;
    }
});
