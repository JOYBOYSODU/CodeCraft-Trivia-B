// =============================================================================
// FILE: src/websocket/websocket.integration.js
// How to integrate WebSocket into Express app
// =============================================================================

/**
 * SETUP INSTRUCTIONS FOR src/index.js
 * 
 * Follow these steps to integrate WebSocket server:
 */

// =============================================================================
// STEP 1: Install Required Dependencies
// =============================================================================

/*
npm install socket.io
npm install --save-dev @types/socket.io

Update package.json:
"dependencies": {
  "socket.io": "^4.5.4",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.0",
  "mysql2": "^3.1.0",
  ...
}
*/

// =============================================================================
// STEP 2: Updated src/index.js with WebSocket
// =============================================================================

/*

const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// Import WebSocket setup
const { initWebSocketServer } = require('./websocket/websocket.server');
const { simulateActivity } = require('./websocket/websocket.events');

// Import existing routes
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);

// Initialize WebSocket Server
const { server, io } = initWebSocketServer(app);

// Make io accessible to route handlers
app.set('io', io);

// OPTIONAL: Test WebSocket with simulated activities
if (process.env.ENABLE_WEBSOCKET_DEMO === 'true') {
  // Simulate activities every 5 seconds for testing
  setInterval(() => {
    const activities = ['level-up', 'problem-solved', 'rank-change', 'achievement'];
    const random = activities[Math.floor(Math.random() * activities.length)];
    simulateActivity(io, random);
  }, 5000);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', websocket: 'active' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server active`);
});

*/

// =============================================================================
// STEP 3: Using WebSocket in Controllers
// =============================================================================

/*

Example: How to emit events from controllers

// In src/controllers/submission.controller.js

const { 
  onProblemSolved, 
  onPlayerLevelUp, 
  onPlayerRankChanged 
} = require('../websocket/websocket.events');

const submitSolution = async (req, res) => {
  try {
    const { problem_id, code, language } = req.body;
    const playerId = req.user.id;
    
    // ... existing submission logic ...
    
    // If submission is accepted
    if (verdict === 'ACCEPTED') {
      const io = req.app.get('io');
      const points = 100; // Get from problem
      
      // Emit problem solved event
      await onProblemSolved(io, playerId, problem_id, contestId, points);
    }
    
    res.json({ success: true, verdict });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

*/

// =============================================================================
// STEP 4: Frontend WebSocket Client Setup
// =============================================================================

// File: src/services/websocket.client.js (Frontend/React)

/*

import io from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:5000';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect(token) {
    if (this.socket) return; // Already connected

    this.socket = io(SOCKET_SERVER_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection events
    this.socket.on('connection:established', (data) => {
      console.log('✅ WebSocket connected:', data);
      this.emit('connected', data);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Subscribe to events
    this.subscribeToEvents();
  }

  subscribeToEvents() {
    // Level up
    this.socket.on('player:level-up', (data) => {
      console.log('🎉 Level up!', data);
      this.emit('level-up', data);
    });

    // Rank change
    this.socket.on('player:rank-changed', (data) => {
      console.log('📈 Rank changed!', data);
      this.emit('rank-changed', data);
    });

    // Problem solved
    this.socket.on('player:problem-solved', (data) => {
      console.log('✅ Problem solved!', data);
      this.emit('problem-solved', data);
    });

    // Contest status change
    this.socket.on('contest:status-changed', (data) => {
      console.log('📊 Contest status changed!', data);
      this.emit('contest-status-changed', data);
    });

    // Leaderboard update
    this.socket.on('leaderboard:update', (data) => {
      console.log('📊 Leaderboard updated!', data);
      this.emit('leaderboard-update', data);
    });

    // Notifications
    this.socket.on('notification:pending', (data) => {
      console.log('🔔 Notifications:', data);
      this.emit('notifications', data);
    });

    // Global leaderboard
    this.socket.on('global:leaderboard-update', (data) => {
      console.log('🌍 Global leaderboard updated!', data);
      this.emit('global-leaderboard', data);
    });

    // Achievement
    this.socket.on('player:achievement-earned', (data) => {
      console.log('🏆 Achievement earned!', data);
      this.emit('achievement', data);
    });
  }

  // Subscribe to contest updates
  subscribeToContest(contestId) {
    this.socket.emit('contest:subscribe', { contestId });
  }

  unsubscribeFromContest(contestId) {
    this.socket.emit('contest:unsubscribe', { contestId });
  }

  // Subscribe to problem updates
  subscribeToProblem(problemId) {
    this.socket.emit('problem:subscribe', { problemId });
  }

  unsubscribeFromProblem(problemId) {
    this.socket.emit('problem:unsubscribe', { problemId });
  }

  // Get pending notifications
  getPendingNotifications() {
    this.socket.emit('notification:get-pending');
  }

  // Mark notification as read
  markNotificationRead(notificationId) {
    this.socket.emit('notification:mark-read', { notificationId });
  }

  // Send heartbeat
  sendHeartbeat() {
    this.socket.emit('heartbeat');
  }

  // Event listener
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Emit to listeners
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsClient = new WebSocketClient();

*/

// =============================================================================
// STEP 5: React Hook for WebSocket
// =============================================================================

/*

// File: src/hooks/useWebSocket.js

import { useEffect, useCallback, useRef } from 'react';
import { wsClient } from '../services/websocket.client';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const { token } = useAuth();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (token && !connectedRef.current) {
      wsClient.connect(token);
      connectedRef.current = true;

      // Heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        wsClient.sendHeartbeat();
      }, 30000);

      return () => {
        clearInterval(heartbeatInterval);
      };
    }
  }, [token]);

  return wsClient;
};

// Usage in component:
// const ws = useWebSocket();
// ws.on('level-up', (data) => console.log('Level up!', data));
// ws.subscribeToContest(contestId);

*/

// =============================================================================
// STEP 6: Calling Events from Controllers
// =============================================================================

/*

Example: Submission Controller

const {
  onProblemSolved,
  onPlayerLevelUp,
  onPlayerRankChanged
} = require('../websocket/websocket.events');

const submitSolution = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { problem_id, code, language } = req.body;
    const playerId = req.user.id;
    const contestId = req.body.contest_id;

    // ... Process submission and get verdict ...

    if (verdict === 'ACCEPTED') {
      const points = 100; // Get from problem table
      
      // Broadcast problem solved
      await onProblemSolved(io, playerId, problem_id, contestId, points);

      // Check if player leveled up
      const [player] = await db.query(
        'SELECT xp, level FROM player WHERE id = ?',
        [playerId]
      );

      // If XP crossed threshold
      if (player[0].xp > 7600 && player[0].level === 10) {
        // Call level up event
        await onPlayerLevelUp(io, playerId, 10, 11, {
          tier: 'SILVER',
          subRank: 'Silver III'
        });
      }
    }

    res.json({ success: true, verdict });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

*/

// =============================================================================
// ENVIRONMENT VARIABLES (.env)
// =============================================================================

/*

# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=codecraft

# JWT
JWT_SECRET=your_super_secret_key

# CORS
CORS_ORIGIN=http://localhost:3000

# WebSocket (Frontend)
REACT_APP_WEBSOCKET_URL=http://localhost:5000

# Features
ENABLE_WEBSOCKET=true
ENABLE_WEBSOCKET_DEMO=false

*/

// =============================================================================
// DATABASE MIGRATION SCRIPT
// =============================================================================

/*

Run this to create WebSocket tables:

mysql -h 127.0.0.1 -u root codecraft < websocket-tables.sql

Or manually:
1. Open phpMyAdmin
2. Go to SQL tab in codecraft database
3. Copy content of websocket-tables.sql
4. Execute

*/

module.exports = {
  instructions: {
    step1: 'Install socket.io: npm install socket.io',
    step2: 'Update src/index.js with WebSocket initialization',
    step3: 'Run SQL: mysql -h 127.0.0.1 -u root codecraft < websocket-tables.sql',
    step4: 'Setup frontend WebSocket client',
    step5: 'Call websocket.events from controllers',
    step6: 'Test with ENABLE_WEBSOCKET_DEMO=true'
  }
};
