const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import WebSocket setup
const { initWebSocketServer } = require('./websocket/websocket.server');
const { simulateActivity } = require('./websocket/websocket.events');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const problemRoutes = require('./routes/problem.routes');
const contestRoutes = require('./routes/contest.routes');
const submissionRoutes = require('./routes/submission.routes');
const playerRoutes = require('./routes/player.routes');
const companyRoutes = require('./routes/company.routes');
const adminRoutes = require('./routes/admin.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

// Middleware
const allowedOrigins = new Set(
    (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.has(origin) || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/player', playerRoutes); // Alias for singular form (frontend compatibility)
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), websocket: 'active' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Initialize WebSocket Server
const { server, io } = initWebSocketServer(app);

// Make io accessible to route handlers
app.set('io', io);

// OPTIONAL: Enable WebSocket Demo Mode for testing
if (process.env.ENABLE_WEBSOCKET_DEMO === 'true') {
    console.log('🧪 WebSocket Demo Mode ENABLED - Simulating activities...');
    setInterval(() => {
        const activities = ['level-up', 'problem-solved', 'rank-change', 'achievement'];
        const random = activities[Math.floor(Math.random() * activities.length)];
        simulateActivity(io, random);
    }, 10000); // Every 10 seconds
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 WebSocket server active`);
    console.log(`🔗 WebSocket URL: http://localhost:${PORT}`);
    if (process.env.ENABLE_WEBSOCKET_DEMO === 'true') {
        console.log('🧪 Demo mode: Check browser console for simulated events');
    }
});