document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("authenticated")) {
        window.location.href = "login.html";
        return;
    }

    const chatList = document.getElementById("chat-list");
    const noChats = document.getElementById("no-chats");
    const searchInput = document.getElementById("chat-search");
    const filterRadios = document.querySelectorAll('input[name="chat-filter"]');
    
    const userId = localStorage.getItem("userId");
    let chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "{}")[userId] || [];
    const feedbackData = JSON.parse(localStorage.getItem("feedbackData") || "{}")[userId] || [];

    let filteredChats = [...chatHistory];
    showLoadingState();

    searchInput.addEventListener("input", () => {
        filterAndDisplayChats();
    });

    filterRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            filterAndDisplayChats();
        });
    });

    function filterAndDisplayChats() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterValue = document.querySelector('input[name="chat-filter"]:checked').value;

        filteredChats = chatHistory.filter(chat => {
            const matchesSearch = chat.messages.some(msg => 
                msg.text.toLowerCase().includes(searchTerm)
            );

            const hasRating = feedbackData.some(fb => fb.chatId === chat.id);
            
            switch(filterValue) {
                case "rated":
                    return matchesSearch && hasRating;
                case "unrated":
                    return matchesSearch && !hasRating;
                default:
                    return matchesSearch;
            }
        });

        displayChats();
    }

    function displayChats() {
        hideLoadingState();
        chatList.innerHTML = "";

        if (filteredChats.length === 0) {
            noChats.classList.remove("hidden");
            return;
        }

        noChats.classList.add("hidden");
        
        filteredChats.forEach(chat => {
            const chatFeedback = feedbackData.find(fb => fb.chatId === chat.id);
            const chatDiv = document.createElement("div");
            chatDiv.classList.add("chat-entry");
            
            chatDiv.innerHTML = `
                <div class="chat-header">
                    <span class="chat-id">
                        <i class="fas fa-hashtag"></i>
                        ${chat.id}
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
                <div class="chat-footer">
                    ${chatFeedback ? `
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${chatFeedback.rating}/5</span>
                        </div>
                    ` : `
                        <button class="rate-btn" onclick="window.location.href='feedback.html?chatId=${chat.id}'">
                            <i class="fas fa-star"></i>
                            Rate Chat
                        </button>
                    `}
                </div>
            `;
            
            chatList.appendChild(chatDiv);
        });
    }

    function showLoadingState() {
        chatList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                Loading chats...
            </div>
        `;
    }

    function hideLoadingState() {
        const spinner = chatList.querySelector(".loading-spinner");
        if (spinner) spinner.remove();
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }

    setTimeout(() => {
        displayChats();
    }, 500);
});