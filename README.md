# Echo

A real-time chat application built with React and Socket.io, featuring secure authentication and room-based messaging.

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
# Install dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies  
cd ../server && npm install
```

### Running the Application
```bash
# Start the server (from server directory)
cd server && npm start

# Start the client (from client directory)
cd ../client && npm start
```

## Features
- 🔐 Secure authentication with JWT tokens
- 💬 Real-time messaging with Socket.io
- 🏠 Public and private chat rooms
- 🔒 Room-based permissions
- 👥 User management
- 📱 Responsive design

## Security
- bcrypt password hashing with salt rounds
- JWT token authentication
- Socket.io authentication middleware
- Room-based authorization

## Environment Variables
Create `.env` files in both client and server directories:

**Server (.env):**
```
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key
CLIENT_URL=http://localhost:3000
```

**Client (.env):**
```
REACT_APP_SERVER_URL=http://localhost:5000
```

## Documentation
Comprehensive documentation is available in the `/documents` folder (excluded from version control).

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
MIT License 