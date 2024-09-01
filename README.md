
# DeveloCoop

DeveloCoop is a collaborative coding platform designed to help developers improve their Python skills through interactive problem-solving sessions. It supports both single-player and two-player modes, allowing users to work on coding challenges individually or cooperatively.

## Features

- Single-player mode for individual practice
- Two-player mode for collaborative coding
- Real-time code sharing and editing
- Chat functionality for two-player mode
- Dynamic question generation and follow-up questions
- Code execution and testing
- Dark mode support

## Technologies Used

- Backend: FastAPI, WebSocket, MongoDB
- Frontend: React, CodeMirror
- Additional: y-webrtc for real-time collaboration

## Prerequisites

- Python 3.7+
- Node.js 12+
- MongoDB

## Running the Application

1. Install craco:

   ```
   cd Frontend/develocoop
   npm install @craco/craco --save
   ```
2. Start the backend server:

   ```
   cd Backend
   python main.py
   ```
3. Start the frontend development server:

   ```
   cd Frontend/develocoop
   npm start
   ```
4. Open your web browser and navigate to:

   ```
   http://localhost:3000/
   ```
