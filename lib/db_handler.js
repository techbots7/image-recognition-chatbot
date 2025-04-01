// Database Handler for managing data storage
class DBHandler {
    constructor() {
        this.dbName = 'chatbotDB';
        this.dbVersion = 1;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.setupNetworkListeners();
        this.initDB();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineNotification();
        });
    }

    showOfflineNotification() {
        // Create or update offline notification
        let notification = document.getElementById('offline-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'offline-notification';
            document.body.appendChild(notification);
        }
        notification.textContent = 'You are offline. Changes will sync when connection is restored.';
        notification.style.display = 'block';
    }

    hideOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create chats store with sync status
                if (!db.objectStoreNames.contains('chats')) {
                    const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    chatsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Create feedback store with sync status
                if (!db.objectStoreNames.contains('feedback')) {
                    const feedbackStore = db.createObjectStore('feedback', { keyPath: 'id' });
                    feedbackStore.createIndex('timestamp', 'timestamp', { unique: false });
                    feedbackStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Create users store
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id' });
                    usersStore.createIndex('email', 'email', { unique: true });
                }

                // Create sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id' });
                }
            };
        });
    }

    async saveChat(chat) {
        const chatWithSync = {
            ...chat,
            syncStatus: this.isOnline ? 'synced' : 'pending',
            lastModified: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chats', 'syncQueue'], 'readwrite');
            const chatsStore = transaction.objectStore('chats');
            const syncQueueStore = transaction.objectStore('syncQueue');

            const request = chatsStore.put(chatWithSync);

            request.onsuccess = () => {
                if (!this.isOnline) {
                    syncQueueStore.add({
                        id: Date.now().toString(),
                        type: 'chat',
                        data: chatWithSync,
                        timestamp: new Date().toISOString()
                    });
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getChats() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveFeedback(feedback) {
        const feedbackWithSync = {
            ...feedback,
            syncStatus: this.isOnline ? 'synced' : 'pending',
            lastModified: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['feedback', 'syncQueue'], 'readwrite');
            const feedbackStore = transaction.objectStore('feedback');
            const syncQueueStore = transaction.objectStore('syncQueue');

            const request = feedbackStore.put(feedbackWithSync);

            request.onsuccess = () => {
                if (!this.isOnline) {
                    syncQueueStore.add({
                        id: Date.now().toString(),
                        type: 'feedback',
                        data: feedbackWithSync,
                        timestamp: new Date().toISOString()
                    });
                }
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getFeedback() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['feedback'], 'readonly');
            const store = transaction.objectStore('feedback');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUser(email) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('email');
            const request = index.get(email);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAdminStats() {
        const [chats, feedback, users] = await Promise.all([
            this.getChats(),
            this.getFeedback(),
            this.getUsers()
        ]);

        const totalUsers = users.length;
        const totalChats = chats.length;
        const averageRating = feedback.length > 0
            ? feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length
            : 0;

        const averageResponseTime = chats.length > 0
            ? chats.reduce((sum, chat) => {
                const messages = chat.messages;
                if (messages.length < 2) return sum;
                const lastUserMsg = messages.filter(m => m.type === 'user').pop();
                const firstBotMsg = messages.find(m => m.type === 'bot');
                if (!lastUserMsg || !firstBotMsg) return sum;
                return sum + (firstBotMsg.timestamp - lastUserMsg.timestamp);
            }, 0) / chats.length / 1000 // Convert to seconds
            : 0;

        return {
            totalUsers,
            totalChats,
            averageRating,
            averageResponseTime
        };
    }

    async getUserActivity() {
        const chats = await this.getChats();
        const now = new Date();
        const hours = Array.from({ length: 24 }, (_, i) => {
            const date = new Date(now);
            date.setHours(date.getHours() - i);
            return date;
        }).reverse();

        const activityData = hours.map(hour => {
            const count = chats.filter(chat => {
                const chatDate = new Date(chat.timestamp);
                return chatDate.getHours() === hour.getHours() &&
                    chatDate.getDate() === hour.getDate() &&
                    chatDate.getMonth() === hour.getMonth() &&
                    chatDate.getFullYear() === hour.getFullYear();
            }).length;
            return count;
        });

        return {
            labels: hours.map(h => h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            data: activityData
        };
    }

    async getUsers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async syncData() {
        if (!this.isOnline) return;

        try {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();

            request.onsuccess = async () => {
                const queue = request.result;
                for (const item of queue) {
                    try {
                        await this.syncItem(item);
                        store.delete(item.id);
                    } catch (error) {
                        console.error('Error syncing item:', error);
                    }
                }
                this.hideOfflineNotification();
            };
        } catch (error) {
            console.error('Error syncing data:', error);
        }
    }

    async syncItem(item) {
        // Implement your sync logic here
        // This could involve sending data to your backend server
        // For now, we'll just mark items as synced
        const transaction = this.db.transaction([item.type], 'readwrite');
        const store = transaction.objectStore(item.type);
        const data = { ...item.data, syncStatus: 'synced' };
        await store.put(data);
    }
}

// Export the database handler
window.DBHandler = DBHandler; 