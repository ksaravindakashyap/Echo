# Just-Chat

A real-time chat application built with React, Express.js, and WebSocket.

## Features

- Real-time messaging using WebSocket
- Modern and responsive UI
- User authentication
- Multiple chat rooms support
- Message history

## Tech Stack

- Frontend:
  - React
  - Chakra UI (for styling)
  - Socket.io-client (for WebSocket)
  
- Backend:
  - Node.js
  - Express.js
  - Socket.io
  - MongoDB (for message persistence)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Just-Chat.git
   cd Just-Chat
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Create `.env` files:
   
   In the server directory:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   ```

   In the client directory:
   ```
   REACT_APP_SERVER_URL=http://localhost:5000
   ```

4. Start the application:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # In a new terminal, start frontend
   cd client
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 