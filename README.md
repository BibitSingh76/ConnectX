# 1:1 WebRTC Video Call Application

Modern 1:1 Peer-to-Peer Video Calling Web Application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, and **Socket.io**.

## Project Architecture

```
video-call-app/
├── backend/          # Node.js + Express + Socket.io signaling server
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
└── frontend/         # React + Vite + Tailwind CSS SPA
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── context/
    │   ├── hooks/
    │   ├── pages/
    │   ├── services/
    │   ├── utils/
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env
    └── package.json
```

## Running the Application

### 1. Start the Backend Server (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Server (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
