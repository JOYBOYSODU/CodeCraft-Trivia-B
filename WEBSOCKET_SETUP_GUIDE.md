# WebSocket Real-Time Backend Setup Guide

## 📦 Installation & Setup

### **Phase 1: Install Dependencies**

```bash
npm install socket.io
npm install cors
npm install jsonwebtoken
npm install dotenv
```

### **Phase 2: Update package.json**

```json
{
  "name": "codecraft-trivia-backend",
  "version": "1.0.0",
  "description": "Competitive Coding Platform Backend with Real-Time WebSocket",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.1.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.0.3",
    "socket.io": "^4.5.4",
    "bcrypt": "^5.1.0",
    "axios": "^1.3.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "jest": "^29.4.0"
  }
}
```

### **Phase 3: Create WebSocket Directory**

```bash
mkdir -p src/websocket
```

### **Phase 4: Import Files**

Copy these files to your project:
- ✅ `websocket-tables.sql` → Root directory
- ✅ `src/websocket/websocket.server.js` → For server setup
- ✅ `src/websocket/websocket.events.js` → For event handlers
- ✅ `src/websocket/websocket.integration.js` → For integration guide

### **Phase 5: Create Database Tables**

Run the WebSocket SQL migrations:

```bash
# Option 1: MySQL Command Line
mysql -h 127.0.0.1 -u root codecraft < websocket-tables.sql

# Option 2: phpMyAdmin
# 1. Open http://localhost/phpmyadmin
# 2. Select "codecraft" database
# 3. Go to "SQL" tab
# 4. Copy content of websocket-tables.sql
# 5. Execute
```

### **Phase 6: Update Main Server File**

Update `src/index.js`:

```javascript
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// Import WebSocket setup
const { initWebSocketServer } = require('./websocket/websocket.server');
const { simulateActivity } = require('./websocket/websocket.events');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const problemRoutes = require('./routes/problem.routes');
const contestRoutes = require('./routes/contest.routes');
const submissionRoutes = require('./routes/submission.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const adminRoutes = require('./routes/admin.routes');
const companyRoutes = require('./routes/company.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);

// Initialize WebSocket Server
console.log('🔌 Initializing WebSocket server...');
const { server, io } = initWebSocketServer(app);

// Make io accessible to route handlers
app.set('io', io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    websocket: 'active',
    timestamp: new Date()
  });
});

// Optional: WebSocket demo mode
if (process.env.ENABLE_WEBSOCKET_DEMO === 'true') {
  console.log('🎮 WebSocket demo mode enabled');
  setInterval(() => {
    const activities = ['level-up', 'problem-solved', 'rank-change', 'achievement'];
    const random = activities[Math.floor(Math.random() * activities.length)];
    simulateActivity(io, random).catch(console.error);
  }, 10000); // Every 10 seconds
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server active on ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});
```

### **Phase 7: Update .env File**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=codecraft

# JWT
JWT_SECRET=your_super_secret_key_change_this

# CORS
CORS_ORIGIN=http://localhost:3000

# WebSocket
ENABLE_WEBSOCKET=true
ENABLE_WEBSOCKET_DEMO=false

# Frontend
REACT_APP_WEBSOCKET_URL=http://localhost:5000
```

---

## 🔌 Using WebSocket in Controllers

### **Example 1: Emit on Problem Solved**

```javascript
// File: src/controllers/submission.controller.js

const { onProblemSolved, onPlayerLevelUp } = require('../websocket/websocket.events');
const db = require('../config/db');

const submitSolution = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { problem_id, code, language, contest_id } = req.body;
    const playerId = req.user.id;

    // ... existing submission logic ...
    // Assume: const verdict = 'ACCEPTED'; const points = 100;

    if (verdict === 'ACCEPTED') {
      // Emit problem solved event
      await onProblemSolved(io, playerId, problem_id, contest_id, points);
    }

    // Check for level up
    const [player] = await db.promise().query(
      'SELECT xp, level FROM player WHERE id = ?',
      [playerId]
    );

    if (player[0].xp > 7600 && player[0].level === 10) {
      await onPlayerLevelUp(io, playerId, 10, 11, {
        tier: 'SILVER',
        subRank: 'Silver III'
      });
    }

    res.json({ success: true, verdict, points });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
```

### **Example 2: Emit Contest Status Change**

```javascript
// File: src/controllers/contest.controller.js

const { onContestStatusChanged, broadcastLeaderboardUpdate } = require('../websocket/websocket.events');

const updateContestStatus = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { contestId } = req.params;
    const { status } = req.body;

    // Get old status
    const [contest] = await db.promise().query(
      'SELECT status FROM contest WHERE id = ?',
      [contestId]
    );

    const oldStatus = contest[0].status;

    // Update status
    await db.promise().query(
      'UPDATE contest SET status = ? WHERE id = ?',
      [status, contestId]
    );

    // Broadcast status change
    await onContestStatusChanged(io, contestId, oldStatus, status);

    res.json({ success: true, message: 'Contest status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
```

### **Example 3: Broadcast Leaderboard Updates**

```javascript
// File: src/controllers/contest.controller.js

const { broadcastLeaderboardUpdate } = require('../websocket/websocket.events');

const updateLeaderboard = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { contestId } = req.params;

    // ... calculate rankings ...

    // Broadcast updated leaderboard
    await broadcastLeaderboardUpdate(io, contestId);

    res.json({ success: true, message: 'Leaderboard updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
```

---

## 🎯 Frontend WebSocket Client Setup

### **Install Socket.IO Client (Frontend)**

```bash
npm install socket.io-client
```

### **Create WebSocket Service**

```javascript
// File: src/services/websocket.client.js

import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5000';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.socket.on('connection:established', (data) => {
      console.log('✅ Connected:', data);
      this.emit('connected', data);
    });

    this.socket.on('player:level-up', (data) => {
      console.log('🎉 Level up!', data);
      this.emit('levelUp', data);
    });

    this.socket.on('player:rank-changed', (data) => {
      console.log('📈 Rank changed!', data);
      this.emit('rankChanged', data);
    });

    this.socket.on('player:problem-solved', (data) => {
      console.log('✅ Problem solved!', data);
      this.emit('problemSolved', data);
    });

    this.socket.on('contest:status-changed', (data) => {
      console.log('📊 Contest status!', data);
      this.emit('contestStatusChanged', data);
    });

    this.socket.on('leaderboard:update', (data) => {
      console.log('📊 Leaderboard updated!', data);
      this.emit('leaderboardUpd', data);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected');
      this.emit('disconnected');
    });
  }

  subscribeToContest(contestId) {
    this.socket?.emit('contest:subscribe', { contestId });
  }

  unsubscribeFromContest(contestId) {
    this.socket?.emit('contest:unsubscribe', { contestId });
  }

  getNotifications() {
    this.socket?.emit('notification:get-pending');
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const wsClient = new WebSocketClient();
```

### **Create React Hook**

```javascript
// File: src/hooks/useWebSocket.js

import { useEffect, useRef } from 'react';
import { wsClient } from '../services/websocket.client';

export const useWebSocket = (token) => {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (token && !connectedRef.current) {
      wsClient.connect(token);
      connectedRef.current = true;

      const heartbeat = setInterval(() => {
        wsClient.socket?.emit('heartbeat');
      }, 30000);

      return () => clearInterval(heartbeat);
    }
  }, [token]);

  return wsClient;
};
```

### **Use in Component**

```javascript
// File: src/components/ContestArena.jsx

import { useWebSocket } from '../hooks/useWebSocket';
import { useState, useEffect } from 'react';

export default function ContestArena({ contestId, token }) {
  const ws = useWebSocket(token);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    ws.subscribeToContest(contestId);

    ws.on('leaderboardUpd', (data) => {
      setLeaderboard(data.leaderboard);
    });

    ws.on('levelUp', (data) => {
      alert(`🎉 ${data.playerName} leveled up!`);
    });

    return () => ws.unsubscribeFromContest(contestId);
  }, [contestId]);

  return (
    <div>
      <h2>Live Leaderboard</h2>
      {leaderboard.map((player, i) => (
        <div key={i}>
          #{player.final_rank} {player.player_name} - {player.final_rating} pts
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing WebSocket

### **Enable Demo Mode**

```bash
# In .env
ENABLE_WEBSOCKET_DEMO=true

# Start server
npm start
```

This will simulate:
- 🎉 Level ups
- ✅ Problems solved
- 📈 Rank changes
- 🏆 Achievements

### **Manual Testing with Postman/WebSocket Client**

```javascript
// Test with Node.js client
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connection:established', (data) => {
  console.log('Connected:', data);
  socket.emit('contest:subscribe', { contestId: 1 });
});

socket.on('leaderboard:update', (data) => {
  console.log('Leaderboard updated:', data);
});

socket.on('player:level-up', (data) => {
  console.log('Level up:', data);
});
```

---

## 📊 WebSocket Event Map

| **Event** | **Direction** | **Purpose** | **Trigger** |
|-----------|---------------|-----------|-----------|
| `player:level-up` | Server → Client | Notify level up | XP threshold reached |
| `player:rank-changed` | Server → Client | Notify rank change | Leaderboard update |
| `player:problem-solved` | Server → Client | Notify solve | Submission accepted |
| `contest:status-changed` | Server → Client | Notify status | Admin updates contest |
| `leaderboard:update` | Server → Client | Update scores | After submission |
| `notification:pending` | Server → Client | Pending notifications | On demand |
| `global:leaderboard-update` | Server → Client | Global rankings | Periodic/OnChange |
| `player:achievement-earned` | Server → Client | Notify achievement | Milestone reached |
| `contest:subscribe` | Client → Server | Join contest room | User enters arena |
| `contest:unsubscribe` | Client → Server | Leave contest room | User exits arena |
| `heartbeat` | Client → Server | Keep connection alive | Every 30 seconds |

---

## 🛠️ Troubleshooting

### **Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:5000
```
**Fix:** Make sure server is running on correct port
```bash
npm start
# Check: http://localhost:5000/health
```

### **Invalid Token**
```
Error: Invalid token
```
**Fix:** Pass valid JWT token in auth
```javascript
const token = localStorage.getItem('token');
wsClient.connect(token);
```

### **CORS Error**
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Fix:** Update CORS in websocket.server.js
```javascript
const io = socketIO(app, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});
```

### **Events Not Firing**
- Check browser console for connection status
- Verify emit names match exactly (case-sensitive)
- Check if listener is attached BEFORE event happens

---

## ✅ Checklist

- [ ] Installed socket.io: `npm install socket.io`
- [ ] Created websocket directory: `src/websocket/`
- [ ] Copied websocket.server.js to project
- [ ] Copied websocket.events.js to project
- [ ] Updated src/index.js with WebSocket init
- [ ] Ran SQL migrations: `mysql ... < websocket-tables.sql`
- [ ] Updated .env with WEBSOCKET settings
- [ ] Frontend: `npm install socket.io-client`
- [ ] Created websocket client service
- [ ] Created useWebSocket hook
- [ ] Updated controllers to emit events
- [ ] Tested with demo mode
- [ ] Tested with actual submissions
- [ ] All event listeners working

---

## 🚀 Next Steps

1. **Deploy** to production with ENABLE_WEBSOCKET_DEMO=false
2. **Monitor** WebSocket connections in logs
3. **Scale** with Redis pub/sub for multi-server setup
4. **Add** more events as needed (achievements, announcements, etc)
5. **Optimize** database queries for high-frequency updates

---

Need help? Check `websocket.integration.js` for detailed examples! 🎉
