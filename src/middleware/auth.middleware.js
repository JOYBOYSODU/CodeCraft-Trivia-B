const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await db.execute(
            'SELECT id, name, email, role, status FROM users WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        if (rows[0].status === 'BANNED') {
            return res.status(403).json({ success: false, message: 'Account banned' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

const playerOnly = async (req, res, next) => {
    if (req.user.role !== 'PLAYER') {
        return res.status(403).json({ success: false, message: 'Player access required' });
    }

    const [rows] = await db.execute(
        'SELECT * FROM player WHERE user_id = ?',
        [req.user.id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Player profile not found' });
    }

    req.player = rows[0];
    next();
};

module.exports = { protect, adminOnly, playerOnly };