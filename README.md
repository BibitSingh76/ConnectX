# ConnectX — Production 1:1 WebRTC Video Conferencing Platform

**ConnectX** is an enterprise-grade 1:1 Peer-to-Peer video calling web application built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, **Socket.io**, and **MongoDB Atlas**.

---

## 🏗️ Project Architecture

```text
ConnectX/
├── backend/          # Node.js + Express + Socket.io + Mongoose
│   ├── src/
│   │   ├── config/       # Database & Server environment configurations
│   │   ├── controllers/  # Auth & Meeting controller handlers
│   │   ├── middleware/   # JWT protect, optionalAuth, rateLimit, Helmet, errorHandler
│   │   ├── models/       # User, Meeting, MeetingParticipant Mongoose schemas
│   │   ├── routes/       # Auth, Meeting, Health API REST endpoints
│   │   ├── services/     # Business logic & MongoDB data layer
│   │   ├── socket/       # Hardened Socket.io WebRTC signaling server
│   │   ├── utils/        # Logger & JWT generator utilities
│   │   ├── app.js        # Express middleware pipeline
│   │   └── server.js     # Server entry point with graceful shutdown
│   ├── .env.example      # Backend environment variables template
│   └── package.json
│
├── frontend/         # React 19 + Vite SPA + Tailwind CSS v4
│   ├── src/
│   │   ├── components/   # UI components, modals (DeviceSettings, ConfirmModal), panels (ChatPanel, ParticipantsPanel)
│   │   ├── context/      # AuthContext, MeetingContext, ToastContext, ThemeContext
│   │   ├── hooks/        # useWebRTC, useSocket custom hooks
│   │   ├── pages/        # Home, Login, Register, Dashboard, JoinMeeting, PreJoin, Meeting, MyMeetings, Profile, Settings
│   │   ├── services/     # apiService, socketService, webrtcService
│   │   ├── utils/        # Room ID generator
│   │   ├── App.jsx       # React Router layout & navigation
│   │   └── main.jsx      # Entry point
│   ├── .env.example      # Frontend environment variables template
│   └── package.json
│
└── README.md
```

---

## 💻 Local Development Setup

### 1. Backend Server Setup (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Development Setup (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Access the application locally at `http://localhost:3000`.

---

## 🚀 Production Deployment Guide

### 1. MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database named `connectx`.
3. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) or whitelist your Render backend IP.
4. Under **Database Access**, create a database user and copy the connection string.
   - Example: `mongodb+srv://<username>:<password>@cluster.mongodb.net/connectx?retryWrites=true&w=majority`

---

### 2. Backend Deployment on Render (Express + Socket.io)

1. Sign in to [Render](https://render.com).
2. Click **New +** -> Select **Web Service**.
3. Connect your GitHub repository: `https://github.com/BibitSingh76/ConnectX`.
4. Configure service settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Configure Environment Variables in Render:

| Key | Example / Description |
|---|---|
| `PORT` | `5000` (or leave default assigned by Render) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://your-frontend-domain.vercel.app` |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/connectx` |
| `JWT_SECRET` | `<your_secure_random_jwt_secret_64chars>` |
| `JWT_EXPIRES_IN` | `7d` |

6. Deploy the Web Service. Copy your live backend URL (e.g. `https://connectx-backend.onrender.com`).

---

### 3. Frontend Deployment on Vercel (React + Vite)

1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** -> Select **Project**.
3. Import your GitHub repository: `ConnectX`.
4. Configure deployment settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Configure Environment Variables in Vercel:

| Key | Example / Description |
|---|---|
| `VITE_API_URL` | `https://connectx-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://connectx-backend.onrender.com` |
| `VITE_TURN_URL` | `turn:turn.example.com:3478` *(Optional TURN server)* |
| `VITE_TURN_USERNAME` | `<turn_user>` *(Optional)* |
| `VITE_TURN_PASSWORD` | `<turn_password>` *(Optional)* |

6. Click **Deploy**. Copy your production frontend URL (e.g. `https://connectx.vercel.app`).
7. Go back to Render and update `CLIENT_URL` with your exact Vercel production domain.

---

## 🔒 Security & Verification Checklist

- [x] **CORS:** Configured dynamically to validate authorized origins against `CLIENT_URL`.
- [x] **Helmet Security Headers:** `X-Frame-Options`, `X-Content-Type-Options: nosniff`, HSTS active.
- [x] **Rate Limiting:** Auth endpoints rate limited to 100 req/15min; API endpoints capped at 300 req/15min.
- [x] **Payload Limit:** Request body hard-capped at 10kb (HTTP 413 error on flooding).
- [x] **NoSQL Injection Guard:** `express-mongo-sanitize` strips `$` and `.` payload keys.
- [x] **Secret Isolation:** No `.env` files committed to Git; backend secrets isolated from client bundles.
- [x] **WebRTC 2-Participant Cap:** Hardened Socket.io signaling enforces exact 2-user room capacity.
