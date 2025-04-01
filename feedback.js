document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("authenticated")) {
        window.location.href = "login.html";
        return;
    }

    const feedbackForm = document.getElementById("feedback-form");
    const feedbackStatus = document.getElementById("feedback-status");
    const stars = document.querySelectorAll(".star-rating i");
    const ratingInput = document.getElementById("rating");
    const chatIdInput = document.getElementById("chat-id");
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('chatId')) {
        chatIdInput.value = urlParams.get('chatId');
        if (urlParams.has('rating')) {
            const urlRating = parseInt(urlParams.get('rating'));
            setRating(urlRating);
        }
    }

    stars.forEach((star, index) => {
        star.addEventListener("mouseover", () => {
            updateStars(index + 1, "hover");
        });

        star.addEventListener("mouseout", () => {
            updateStars(ratingInput.value, "active");
        });

        star.addEventListener("click", () => {
            setRating(index + 1);
        });
    });

    function updateStars(count, className) {
        stars.forEach((star, index) => {
            if (className === "hover") {
                star.classList.toggle("active", index < count);
            } else {
                star.classList.toggle(className, index < count);
            }
        });
    }

    function setRating(rating) {
        ratingInput.value = rating;
        updateStars(rating, "active");
    }

    feedbackForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const chatId = chatIdInput.value;
        const rating = ratingInput.value;
        const comments = document.getElementById("comments").value;

        if (!chatId) {
            showStatus("Please enter a Chat ID", "error");
            return;
        }

        if (!rating || rating < 1) {
            showStatus("Please select a rating", "error");
            return;
        }

        try {
            const userId = localStorage.getItem("userId");
            let feedbackData = JSON.parse(localStorage.getItem("feedbackData") || "{}");
            
            if (!feedbackData[userId]) feedbackData[userId] = [];

            const newFeedback = {
                chatId,
                rating: parseInt(rating),
                comments,
                timestamp: Date.now()
            };

            feedbackData[userId].push(newFeedback);
            localStorage.setItem("feedbackData", JSON.stringify(feedbackData));

            showStatus("Feedback submitted successfully!", "success");
            feedbackForm.reset();
            setRating(0);

            setTimeout(() => {
                window.location.href = "chats.html";
            }, 2000);

        } catch (error) {
            console.error("Error submitting feedback:", error);
            showStatus("Error submitting feedback. Please try again.", "error");
        }
    });

    function showStatus(message, type) {
        feedbackStatus.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            ${message}
        `;
        feedbackStatus.className = `status-text ${type}`;
    }

    document.querySelector(".back-btn").addEventListener("click", (e) => {
        e.preventDefault();
        window.history.back();
    });
});