# Image Recognition Chatbot

A conversational chatbot with image recognition capabilities, built using TensorFlow.js and modern web technologies.

## Features

- Real-time image recognition using webcam
- Image upload and analysis
- Interactive chat interface
- User authentication system
- Admin dashboard with analytics
- Feedback collection system
- Chat history management

## Project Structure

```
project_fv5/
├── index.html          # Main application interface
├── login.html          # User login page
├── admin.html          # Admin dashboard
├── statistics.html     # Usage statistics
├── feedback.html       # User feedback interface
├── chats.html         # Chat history view
├── lib/               # Core libraries
│   ├── model/         # TensorFlow.js model files
│   ├── api_handler.js # API communication
│   ├── camera.js      # Webcam functionality
│   ├── chat.js        # Chat core logic
│   ├── db_handler.js  # Database operations
│   ├── email_service.js # Email functionality
│   ├── model_loader.js # Model management
│   ├── session_manager.js # Authentication
│   ├── ui.js          # UI components
│   └── tf.min.js      # TensorFlow.js library
├── script.js          # Main application logic
├── login.js           # Login functionality
├── admin.js           # Admin dashboard logic
├── statistics.js      # Statistics functionality
├── feedback.js        # Feedback system logic
├── styles.css         # Global styles
└── vercel.json        # Deployment configuration
```

## Setup

1. Clone the repository
2. Configure email service in `lib/email_service.js`
3. Set up your TensorFlow.js model in `lib/model/`
4. Deploy to Vercel or serve locally

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel
```

## Configuration

### Email Service
Configure your email service credentials in `lib/email_service.js`:
```javascript
const EMAIL_CONFIG = {
    service: 'your_service',
    template: 'your_template',
    user: 'your_user_id'
};
```

### Model Configuration
Place your TensorFlow.js model files in `lib/model/`:
- model.json
- weights.bin
- metadata.json

## Security

- User authentication with temporary credentials
- Secure session management
- Email-based credential distribution
- Admin access control

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - See LICENSE file for details