# Image Recognition Chatbot

A conversational chatbot with image recognition capabilities using Google Gemini API and TensorFlow.js for offline functionality.

## Features

- Real-time image recognition using Google Gemini API
- Offline image detection using TensorFlow.js
- Conversational interface with context-aware responses
- Admin interface for managing users and viewing analytics
- Secure login system with email-based credential management
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Gemini API key
- EmailJS account for email notifications

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/image-recognition-chatbot.git
cd image-recognition-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Configure EmailJS:
   - Sign up for EmailJS (https://www.emailjs.com/)
   - Create an email service and template
   - Update the credentials in `lib/email_service.js`

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to `http://localhost:3000`

3. Login with the default credentials:
   - ID: admin
   - Password: admin123

4. Use the chatbot:
   - Click "Start Webcam" to use your camera
   - Click "Upload Image" to use an image file
   - Type questions about the detected objects
   - View analytics in the admin interface

## Offline Functionality

The chatbot works offline using:
- TensorFlow.js for image detection
- Local chatbot data for responses
- IndexedDB for data storage

## Project Structure

```
image-recognition-chatbot/
├── index.html              # Main application page
├── login.html             # Login page
├── admin.html             # Admin interface
├── styles.css             # Global styles
├── script.js              # Main application logic
├── login.js               # Login functionality
├── lib/
│   ├── api_handler.js     # API integration
│   ├── db_handler.js      # Database operations
│   └── email_service.js   # Email notifications
└── chatbot_data.json      # Predefined responses
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini for providing the image recognition API
- TensorFlow.js for offline detection capabilities
- EmailJS for email notification service 