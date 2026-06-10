# IntelMeet 🚀

IntelMeet (AI Meet) is an enterprise-grade, AI-powered real-time video/audio meeting and collaboration platform. Built with modern web technologies, it offers high-fidelity peer-to-peer audio calls, live collaborative tools, automated AI summarization, and robust session scheduling.

---

## 🌟 Features

### 📡 Core Communication
*   **WebRTC Peer-to-Peer Calls**: Built on top of `peerjs` and `simple-peer` for low-latency audio stream communication.
*   **99%+ Traversal Reliability**: Configured with multiple fallback STUN/TURN servers to bypass strict NAT/firewalls.
*   **Automated Mic Recovery**: Smart permission retry mechanism with up to 3 automated acquisition attempts and user-friendly error fallback.
*   **Live Speaking Indicator**: Real-time microphone analysis to identify and display who is currently speaking.

### 🎨 Live Collaboration
*   **Synchronized Whiteboard**: Interactive, multi-user drawing canvas synced via Socket.IO.
*   **Interactive Polls**: Create, vote, and view live results of polls with dynamic distribution percentages.
*   **Floating Reactions**: Zoom-style interactive emoji reactions (👍, ❤️, 😂, 😮, 😢, 🎉, 🔥, 👏) that animate across participants' screens.
*   **File Sharing**: Instant upload and listing of documents, images, audio, and video files with automatic type-detection and download links.

### 🤖 AI-Powered Intelligence
*   **Gemini AI Summarization**: Direct integration with Google's Gemini API (`@google/genai`) to generate meeting summaries, bulleted action items, and structural takeaways from live transcriptions.
*   **Fail-Safe Backoff**: Resilient 3x exponential backoff and JSON-fallback schema parsing for AI generation endpoints.

### 🔐 Security & Reliability
*   **Socket.IO JWT Authentication**: Secures WebSockets by requiring valid JWT tokens during the handshake.
*   **Granular Authorization**: API and Socket event-level middleware checking host and participant permissions before data mutations.
*   **Database Transactions**: MongoDB session transactions ensuring atomic updates to meeting analytics and contribution percentages.
*   **Connection Health Checks**: Periodic sweepers to prune stale peer states, preventing memory leaks.
*   **SPA Routing Fallback**: Express wildcard route handling to ensure React Router paths refresh seamlessly without returning 404s.

### 📅 Coordination & Alerts
*   **Scheduled Meetings**: Calendar scheduler supporting timezones, attendee invitations, and RSVP status tracking.
*   **Automated Email Invites**: Integrates with Nodemailer to email invites and track confirmations.
*   **Real-time @Mentions & Notification Center**: Live alert system when participants are tagged in chat.

---

## 🛠️ Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS 4, Framer Motion, Lucide React, Socket.IO Client, PeerJS, Simple-Peer |
| **Backend** | Node.js, Express, Socket.IO, Nodemailer, Cloudinary, Multer, Helmet, Morgan |
| **Database** | MongoDB, Mongoose |
| **AI Integration** | Google Gemini API (`@google/genai` & `@google/generative-ai`), OpenAI API |
| **Media Relay** | STUN (Google), TURN (Metered.ca / Coturn / Xirsys) |

---

## 📁 Repository Structure

```text
IntelMeet/
├── backend/                  # Node.js/Express Server
│   ├── src/
│   │   ├── controllers/      # Route logic handlers
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # REST endpoints
│   │   ├── sockets/          # Socket.IO event controllers & handlers
│   │   ├── app.js            # Express application setup
│   │   └── server.js         # Entrypoint & HTTP/WebSocket initialization
│   └── package.json
│
├── frontend/                 # React SPA (Vite)
│   ├── src/
│   │   ├── components/       # Collaboration & core features (Whiteboard, Polls, etc.)
│   │   ├── pages/            # Application views (Dashboard, Meeting, Login)
│   │   ├── socket.js         # Socket.IO client instance
│   │   ├── App.jsx           # PeerJS initialization & main router
│   │   └── main.jsx
│   └── package.json
│
└── README.md
