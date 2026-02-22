// =============================================================================
// FILE: src/websocket/websocket.server.js
// Real-Time WebSocket Server Setup with STOMP Protocol
// =============================================================================

const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// =============================================================================
// WEBSOCKET SERVER SETUP
// =============================================================================

/**
 * Initialize WebSocket server with Socket.IO
 * Supports both polling and WebSocket transports
 */
const initWebSocketServer = (app) => {
  const server = http.createServer(app);
  
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Middleware: Authenticate WebSocket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ==========================================================================
  // CONNECTION EVENT HANDLERS
  // ==========================================================================

  io.on('connection', async (socket) => {
    console.log(`✅ Player ${socket.userId} connected: ${socket.id}`);

    try {
      // Register WebSocket session in database
      await registerWebSocketSession(socket.userId, socket.id);

      // Join player's personal room
      socket.join(`player:${socket.userId}`);

      // Emit welcome message
      socket.emit('connection:established', {
        playerId: socket.userId,
        sessionId: socket.id,
        message: 'Connected to real-time server'
      });

      // =======================================================================
      // CONTEST SUBSCRIPTIONS
      // =======================================================================

      socket.on('contest:subscribe', (data) => {
        const contestId = data.contestId;
        console.log(`📊 Player ${socket.userId} subscribed to contest ${contestId}`);

        // Join contest room (for leaderboard updates)
        socket.join(`contest:${contestId}`);
        socket.join(`contest:${contestId}:leaderboard`);

        // Send current leaderboard
        getContestLeaderboard(contestId).then(leaderboard => {
          socket.emit('leaderboard:snapshot', {
            contestId,
            leaderboard,
            timestamp: new Date()
          });
        });
      });

      socket.on('contest:unsubscribe', (data) => {
        const contestId = data.contestId;
        console.log(`📊 Player ${socket.userId} unsubscribed from contest ${contestId}`);
        socket.leave(`contest:${contestId}`);
        socket.leave(`contest:${contestId}:leaderboard`);
      });

      // =======================================================================
      // PROBLEM SUBSCRIPTIONS
      // =======================================================================

      socket.on('problem:subscribe', (data) => {
        const problemId = data.problemId;
        console.log(`🔧 Player ${socket.userId} subscribed to problem ${problemId}`);
        socket.join(`problem:${problemId}`);
      });

      socket.on('problem:unsubscribe', (data) => {
        const problemId = data.problemId;
        socket.leave(`problem:${problemId}`);
      });

      // =======================================================================
      // PLAYER NOTIFICATIONS
      // =======================================================================

      socket.on('notification:get-pending', async () => {
        try {
          const [notifications] = await db.query(
            'SELECT * FROM notification WHERE player_id = ? AND is_read = FALSE ORDER BY created_at DESC LIMIT 10',
            [socket.userId]
          );

          socket.emit('notification:pending', {
            count: notifications.length,
            notifications
          });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      socket.on('notification:mark-read', async (data) => {
        try {
          const { notificationId } = data;
          await db.query(
            'UPDATE notification SET is_read = TRUE, read_at = NOW() WHERE id = ? AND player_id = ?',
            [notificationId, socket.userId]
          );
          socket.emit('notification:read-success', { notificationId });
        } catch (err) {
          socket.emit('error', { message: err.message });
        }
      });

      // =======================================================================
      // HEARTBEAT / KEEP-ALIVE
      // =======================================================================

      socket.on('heartbeat', async () => {
        try {
          await db.query(
            'UPDATE websocket_session SET last_heartbeat = NOW() WHERE session_id = ?',
            [socket.id]
          );
        } catch (err) {
          console.error('Heartbeat error:', err);
        }
      });

      // =======================================================================
      // DISCONNECTION
      // =======================================================================

      socket.on('disconnect', async () => {
        console.log(`❌ Player ${socket.userId} disconnected: ${socket.id}`);
        try {
          await disconnectWebSocketSession(socket.id);
        } catch (err) {
          console.error('Disconnect error:', err);
        }
      });

    } catch (err) {
      console.error('Connection error:', err);
      socket.emit('error', { message: 'Connection failed' });
    }
  });

  return { server, io };
};

// =============================================================================
// DATABASE HELPER FUNCTIONS
// =============================================================================

/**
 * Register new WebSocket session in database
 */
const registerWebSocketSession = async (playerId, sessionId) => {
  try {
    await db.query(
      'INSERT INTO websocket_session (player_id, session_id, is_active) VALUES (?, ?, TRUE)',
      [playerId, sessionId]
    );
  } catch (err) {
    console.error('Error registering session:', err);
    throw err;
  }
};

/**
 * Disconnect WebSocket session from database
 */
const disconnectWebSocketSession = async (sessionId) => {
  try {
    await db.query(
      'UPDATE websocket_session SET is_active = FALSE, disconnected_at = NOW() WHERE session_id = ?',
      [sessionId]
    );
  } catch (err) {
    console.error('Error disconnecting session:', err);
    throw err;
  }
};

/**
 * Get current contest leaderboard from database
 */
const getContestLeaderboard = async (contestId) => {
  try {
    const [leaderboard] = await db.query(`
      SELECT 
        cp.final_rank,
        cp.final_rating,
        cp.problems_solved,
        cp.xp_earned,
        u.name as player_name,
        u.profile_picture,
        p.tier,
        p.level,
        p.global_rank
      FROM contest_participant cp
      JOIN player p ON cp.player_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE cp.contest_id = ?
      ORDER BY cp.final_rank ASC
    `, [contestId]);

    return leaderboard;
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
};

/**
 * Log activity to database
 */
const logActivity = async (playerId, actionType, data = {}) => {
  try {
    const [result] = await db.query(
      `INSERT INTO activity_log (player_id, action_type, contest_id, problem_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        playerId,
        actionType,
        data.contestId || null,
        data.problemId || null,
        JSON.stringify(data.oldValue || {}),
        JSON.stringify(data.newValue || {})
      ]
    );

    return result.insertId;
  } catch (err) {
    console.error('Error logging activity:', err);
    throw err;
  }
};

/**
 * Create notification for player
 */
const createNotification = async (playerId, notificationType, title, message, data = {}) => {
  try {
    await db.query(
      `INSERT INTO notification (player_id, type, title, message, data)
       VALUES (?, ?, ?, ?, ?)`,
      [
        playerId,
        notificationType,
        title,
        message,
        JSON.stringify(data)
      ]
    );
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

// =============================================================================
// BROADCAST FUNCTIONS (For use in other controllers)
// =============================================================================

/**
 * Broadcast event to all users in a contest
 */
const broadcastToContest = (io, contestId, eventName, data) => {
  io.to(`contest:${contestId}`).emit(eventName, {
    contestId,
    ...data,
    timestamp: new Date()
  });
};

/**
 * Broadcast leaderboard update
 */
const broadcastLeaderboardUpdate = async (io, contestId) => {
  try {
    const leaderboard = await getContestLeaderboard(contestId);
    io.to(`contest:${contestId}:leaderboard`).emit('leaderboard:update', {
      contestId,
      leaderboard,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error broadcasting leaderboard:', err);
  }
};

/**
 * Broadcast level-up notification to player and followers
 */
const broadcastLevelUp = async (io, playerId, levelData) => {
  try {
    // Create notification
    await createNotification(
      playerId,
      'LEVEL_UP',
      `Level Up! 🎉`,
      `Congratulations! You reached ${levelData.tier} ${levelData.subRank}`,
      levelData
    );

    // Send to player
    io.to(`player:${playerId}`).emit('player:level-up', {
      playerId,
      ...levelData,
      timestamp: new Date()
    });

    // Broadcast to global leaderboard
    io.emit('global:player-level-up', {
      playerId,
      ...levelData,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error broadcasting level up:', err);
  }
};

/**
 * Broadcast rank change
 */
const broadcastRankChange = async (io, playerId, contestId, oldRank, newRank) => {
  try {
    // Create notification
    await createNotification(
      playerId,
      'RANK_CHANGE',
      'Rank Update 📈',
      `Your rank changed from #${oldRank} to #${newRank} in the contest`,
      { contestId, oldRank, newRank }
    );

    // Send to player
    io.to(`player:${playerId}`).emit('player:rank-changed', {
      playerId,
      contestId,
      oldRank,
      newRank,
      timestamp: new Date()
    });

    // Broadcast to contest
    io.to(`contest:${contestId}`).emit('contest:rank-changed', {
      playerId,
      oldRank,
      newRank,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error broadcasting rank change:', err);
  }
};

/**
 * Broadcast contest status change
 */
const broadcastContestStatusChange = async (io, contestId, oldStatus, newStatus) => {
  try {
    // Create announcement
    const message = `Contest status changed from ${oldStatus} to ${newStatus}`;
    
    io.to(`contest:${contestId}`).emit('contest:status-changed', {
      contestId,
      oldStatus,
      newStatus,
      message,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error broadcasting contest status:', err);
  }
};

/**
 * Broadcast problem solution event
 */
const broadcastProblemSolved = async (io, playerId, problemId, contestId, points) => {
  try {
    // Create notification
    await createNotification(
      playerId,
      'ACHIEVEMENT',
      'Problem Solved! ✅',
      `You solved problem #${problemId} and earned ${points} points`,
      { problemId, contestId, points }
    );

    // Send to player
    io.to(`player:${playerId}`).emit('player:problem-solved', {
      playerId,
      problemId,
      contestId,
      points,
      timestamp: new Date()
    });

    // Broadcast to problem room
    io.to(`problem:${problemId}`).emit('problem:solved-by-player', {
      playerId,
      problemId,
      points,
      timestamp: new Date()
    });

    // Broadcast to contest if applicable
    if (contestId) {
      io.to(`contest:${contestId}`).emit('contest:problem-solved', {
        playerId,
        problemId,
        points,
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('Error broadcasting problem solved:', err);
  }
};

/**
 * Broadcast connection status
 */
const broadcastConnectionStatus = (io, playerId, isOnline) => {
  io.emit('global:player-status', {
    playerId,
    isOnline,
    timestamp: new Date()
  });
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  initWebSocketServer,
  
  // Broadcast functions
  broadcastToContest,
  broadcastLeaderboardUpdate,
  broadcastLevelUp,
  broadcastRankChange,
  broadcastContestStatusChange,
  broadcastProblemSolved,
  broadcastConnectionStatus,
  
  // Database functions
  logActivity,
  createNotification,
  getContestLeaderboard,
  registerWebSocketSession,
  disconnectWebSocketSession
};
