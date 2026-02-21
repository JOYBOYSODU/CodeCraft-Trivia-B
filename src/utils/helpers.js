const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const calculateLevel = async (xp) => {
    const [rows] = await db.execute(
        'SELECT level, tier, sub_rank FROM level_config WHERE xp_required <= ? ORDER BY level DESC LIMIT 1',
        [xp]
    );
    return rows[0] || { level: 1, tier: 'BRONZE', sub_rank: 'Bronze III' };
};

const calculateFinalRating = (mode, rawScore, accuracyScore, xpScore) => {
    const { MODE_WEIGHTS } = require('../config/constants');
    const weights = MODE_WEIGHTS[mode];
    return (weights.accuracy * accuracyScore) + (weights.raw * rawScore) + (weights.xp * xpScore);
};

const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = { generateToken, calculateLevel, calculateFinalRating, generateInviteCode };