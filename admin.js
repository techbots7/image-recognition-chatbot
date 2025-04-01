document.addEventListener("DOMContentLoaded", async () => {
    // Check admin authentication
    if (!localStorage.getItem("adminAuthenticated")) {
        window.location.href = "login.html";
        return;
    }

    const dbHandler = new DBHandler();
    const menuBtn = document.getElementById("menu-btn");
    const menuPane = document.getElementById("menu-pane");
    const menuCloseBtn = document.querySelector(".menu-close-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const userSearch = document.getElementById("user-search");
    const timeFilter = document.getElementById("time-filter");
    const chatList = document.getElementById("chat-list");
    const feedbackList = document.getElementById("feedback-list");

    // Initialize UI
    await updateStats();
    await createActivityChart();
    await displayChats();
    await displayFeedback();

    // Event Listeners
    menuBtn.addEventListener("click", () => {
        menuPane.classList.toggle("hidden");
    });

    menuCloseBtn.addEventListener("click", () => {
        menuPane.classList.add("hidden");
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("adminAuthenticated");
        window.location.href = "login.html";
    });

    userSearch.addEventListener("input", () => {
        filterAndDisplayChats();
    });

    timeFilter.addEventListener("change", () => {
        filterAndDisplayChats();
    });

    async function updateStats() {
        const chats = await dbHandler.getAllChats();
        const feedback = await dbHandler.getAllFeedback();
        const users = new Set(chats.map(chat => chat.userId));

        document.getElementById("total-users").textContent = users.size;
        document.getElementById("total-chats").textContent = chats.length;
        
        const avgRating = feedback.reduce((sum, fb) => sum + fb.rating, 0) / (feedback.length || 1);
        document.getElementById("avg-rating").textContent = avgRating.toFixed(1);
    }

    async function createActivityChart() {
        const chats = await dbHandler.getAllChats();
        const timeData = generateTimeData(chats);
        
        const canvas = document.getElementById('userActivityChart');
        const ctx = canvas.getContext('2d');
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'User Activity (chats)',
                    data: timeData,
                    borderColor: 'rgba(106, 13, 173, 1)',
                    backgroundColor: 'rgba(106, 13, 173, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'white'
                        }
                    },
                    title: {
                        display: true,
                        text: '24-Hour User Activity',
                        color: 'white',
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }

    function generateTimeData(chats) {
        const hourlyData = new Array(24).fill(0);
        chats.forEach(chat => {
            const hour = new Date(chat.startTime).getHours();
            hourlyData[hour]++;
        });
        return hourlyData;
    }

    async function displayChats() {
        const chats = await dbHandler.getAllChats();
        const searchTerm = userSearch.value.toLowerCase();
        const timeFilterValue = timeFilter.value;

        let filteredChats = filterChats(chats, searchTerm, timeFilterValue);
        
        chatList.innerHTML = filteredChats.map(chat => `
            <div class="chat-entry">
                <div class="chat-header">
                    <span class="chat-id">
                        <i class="fas fa-hashtag"></i>
                        ${chat.id}
                    </span>
                    <span class="user-id">
                        <i class="fas fa-user"></i>
                        ${chat.userId}
                    </span>
                    <span class="chat-time">
                        <i class="fas fa-clock"></i>
                        ${formatTime(chat.startTime)}
                    </span>
                </div>
                <div class="chat-content">
                    <div class="chat-image">
                        <img src="${chat.image}" alt="Captured Image">
                    </div>
                    <div class="chat-messages">
                        ${chat.messages.map(msg => `
                            <div class="chat-message ${msg.sender}">
                                <i class="fas fa-${msg.sender === 'user' ? 'user' : 'robot'}"></i>
                                <span>${msg.text}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `).join("");
    }

    function filterChats(chats, searchTerm, timeFilter) {
        return chats.filter(chat => {
            const matchesSearch = chat.userId.toLowerCase().includes(searchTerm);
            const chatDate = new Date(chat.startTime);
            const now = new Date();
            
            let matchesTime = true;
            switch(timeFilter) {
                case 'today':
                    matchesTime = chatDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(now.setDate(now.getDate() - 7));
                    matchesTime = chatDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                    matchesTime = chatDate >= monthAgo;
                    break;
            }
            
            return matchesSearch && matchesTime;
        });
    }

    async function displayFeedback() {
        const feedback = await dbHandler.getAllFeedback();
        
        feedbackList.innerHTML = feedback.map(fb => `
            <div class="feedback-entry">
                <div class="feedback-header">
                    <span class="user-id">
                        <i class="fas fa-user"></i>
                        ${fb.userId}
                    </span>
                    <span class="chat-id">
                        <i class="fas fa-hashtag"></i>
                        ${fb.chatId}
                    </span>
                    <span class="rating">
                        <i class="fas fa-star"></i>
                        ${fb.rating}/5
                    </span>
                </div>
                <div class="feedback-content">
                    <p>${fb.comments}</p>
                    <span class="feedback-time">
                        <i class="fas fa-clock"></i>
                        ${formatTime(fb.timestamp)}
                    </span>
                </div>
            </div>
        `).join("");
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    function filterAndDisplayChats() {
        displayChats();
    }
}); 