document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("authenticated")) {
        window.location.href = "login.html";
        return;
    }

    const userId = localStorage.getItem("userId");
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "{}")[userId] || [];
    const authData = JSON.parse(localStorage.getItem("authData"));
    const loginTime = new Date(authData.loginTime);
    const currentTime = new Date();

    const noInteractions = document.getElementById("no-interactions");
    const chartContainer = document.querySelector(".chart-container");
    const statsContainer = document.getElementById("stats");

    if (chatHistory.length === 0) {
        noInteractions.classList.remove("hidden");
        chartContainer.classList.add("hidden");
        statsContainer.classList.add("hidden");
    } else {
        noInteractions.classList.add("hidden");
        chartContainer.classList.remove("hidden");
        statsContainer.classList.remove("hidden");

        const timeData = generateTimeData(loginTime, currentTime, chatHistory);
        createActivityChart(timeData);
        updateStatistics(chatHistory, userId);
    }
});

function generateTimeData(loginTime, currentTime, chatHistory) {
    const hourlyData = new Array(24).fill(0);

    chatHistory.forEach(chat => {
        const chatStart = new Date(chat.startTime);
        const chatEnd = new Date(chat.lastMessageTime || chat.startTime);
        const duration = (chatEnd - chatStart) / (1000 * 60); // Convert to minutes
        const hourIndex = chatStart.getHours(); // Use actual hour instead of relative
        
        hourlyData[hourIndex] += duration;
    });

    return hourlyData;
}

function createActivityChart(timeData) {
    const canvas = document.getElementById('userActivityChart');
    if (!canvas) {
        console.error('Canvas element with ID "userActivityChart" not found');
        return;
    }

    // Destroy existing chart if it exists
    if (window.userActivityChart instanceof Chart) {
        window.userActivityChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    window.userActivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Activity (minutes)',
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
                    text: '24-Hour Activity Timeline',
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
                        color: 'white',
                        callback: function(value) {
                            return value + ' min';
                        }
                    }
                }
            }
        }
    });
}

function formatTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function updateStatistics(chatHistory, userId) {
    const stats = {
        totalTime: 0,
        totalUploads: 0,
        totalCaptures: 0,
        totalInteractions: chatHistory.length,
        totalFeedback: 0,
        feedbackCount: 0,
        keywords: new Map()
    };

    chatHistory.forEach(chat => {
        const startTime = new Date(chat.startTime);
        const endTime = new Date(chat.lastMessageTime || chat.startTime);
        const duration = (endTime - startTime) / 1000;
        stats.totalTime += duration;

        // Check if the chat has an image and determine its source
        if (chat.image) {
            if (chat.uploaded === true) {
                stats.totalUploads++;
            } else {
                stats.totalCaptures++;
            }
        }

        // Process messages for keywords (only user messages)
        chat.messages.forEach(msg => {
            if (msg.sender === 'user') {
                const words = msg.text.toLowerCase()
                    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                    .split(/\s+/);
                
                words.forEach(word => {
                    if (word.length > 3) {
                        stats.keywords.set(word, (stats.keywords.get(word) || 0) + 1);
                    }
                });
            }
        });
    });

    // Calculate feedback score from localStorage
    const feedbackData = JSON.parse(localStorage.getItem("feedbackData") || "{}");
    if (feedbackData[userId]) {
        const userFeedback = feedbackData[userId];
        stats.totalFeedback = userFeedback.reduce((sum, feedback) => sum + feedback.rating, 0);
        stats.feedbackCount = userFeedback.length;
    }

    // Update DOM elements
    document.getElementById('total-interactions').textContent = stats.totalInteractions;
    document.getElementById('total-time').textContent = formatTime(stats.totalTime);
    document.getElementById('avg-time').textContent = 
        formatTime(stats.totalTime / (stats.totalInteractions || 1));
    document.getElementById('total-images').textContent = stats.totalInteractions;
    document.getElementById('total-uploads').textContent = stats.totalUploads;
    document.getElementById('total-captures').textContent = stats.totalCaptures;
    document.getElementById('feedback-score').textContent = 
        stats.feedbackCount > 0 ? (stats.totalFeedback / stats.feedbackCount).toFixed(1) : "0.0";

    // Update keywords
    const topKeywords = Array.from(stats.keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const keywordsHtml = topKeywords.map(([word, count]) => 
        `<div class="keyword-item">
            <span>${word}</span>
            <span class="count">${count} times</span>
        </div>`
    ).join('');

    const keywordStats = document.getElementById('keyword-stats');
    if (keywordStats) {
        keywordStats.innerHTML = topKeywords.length ? keywordsHtml : 
            '<div class="keyword-item">No keywords recorded yet</div>';
    }
}