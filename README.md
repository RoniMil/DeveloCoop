# DeveloCoop

DeveloCoop is a collaborative coding platform designed to help developers improve their Python skills through interactive problem-solving sessions. It supports both single-player and two-player modes, allowing users to work on coding challenges individually or cooperatively.

[demo video](https://drive.google.com/file/d/1Dj1u0EZ083T-5t9uM0xs5KDJ3Gd0X0D-/view?usp=drive_link)

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

## Disclaimer

This project includes a Python script designed to scrape questions from GeeksforGeeks (GFG). **The script is intended solely for personal use and practice.** Scraping and using content from GFG must comply with their [Terms of Service](https://www.geeksforgeeks.org/terms-of-service). Users are responsible for ensuring their actions do not breach GFG's policies, including restrictions on automation and redistribution of content.

### Important Notes:

- The scraped data is **not included** in this repository to avoid potential copyright or TOS violations.
- Do not use the scraping script for commercial purposes or to redistribute GFG's content.

## Ethical Use

Please ensure the ethical use of this project:

- Use the script for educational and personal purposes only.
- Do not share or publish any scraped data or content derived from GeeksforGeeks.
- If unsure, contact GFG for permission or clarification regarding acceptable usage.

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
