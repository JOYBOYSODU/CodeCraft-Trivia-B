const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const [players] = await db.execute(
            `SELECT p.*, u.name, u.email, u.profile_picture 
       FROM player p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
            [req.player.id]
        );

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Get level info
        const [levelInfo] = await db.execute(
            'SELECT * FROM level_config WHERE level = ?',
            [players[0].level]
        );

        res.json({
            success: true,
            profile: players[0],
            levelInfo: levelInfo[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const playerId = req.player.id;

        // Get submission stats
        const [stats] = await db.execute(
            `SELECT 
         COUNT(*) as total_submissions,
         SUM(CASE WHEN verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN verdict = 'WRONG_ANSWER' THEN 1 ELSE 0 END) as wrong_answer
       FROM submission WHERE player_id = ?`,
            [playerId]
        );

        // Get recent contests
        const [recentContests] = await db.execute(
            `SELECT cp.*, c.title, c.status 
       FROM contest_participant cp
       JOIN contest c ON cp.contest_id = c.id
       WHERE cp.player_id = ?
       ORDER BY cp.joined_at DESC
       LIMIT 5`,
            [playerId]
        );

        res.json({
            success: true,
            stats: stats[0],
            recentContests
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

exports.getXpHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [history] = await db.execute(
            `SELECT xl.*, c.title as contest_title
       FROM xp_ledger xl
       LEFT JOIN contest c ON xl.contest_id = c.id
       WHERE xl.player_id = ?
       ORDER BY xl.earned_at DESC
       LIMIT ? OFFSET ?`,
            [req.player.id, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, history });
    } catch (error) {
        console.error('Get XP history error:', error);
        res.status(500).json({ success: false, message: 'Failed to get history' });
    }
};

exports.updatePreferredMode = async (req, res) => {
    try {
        const { mode } = req.body;
        const validModes = ['PRECISION', 'GRINDER', 'LEGEND'];

        if (!validModes.includes(mode)) {
            return res.status(400).json({ success: false, message: 'Invalid mode' });
        }

        await db.execute(
            'UPDATE player SET preferred_mode = ? WHERE id = ?',
            [mode, req.player.id]
        );

        res.json({ success: true, message: 'Mode updated' });
    } catch (error) {
        console.error('Update mode error:', error);
        res.status(500).json({ success: false, message: 'Failed to update mode' });
    }
};