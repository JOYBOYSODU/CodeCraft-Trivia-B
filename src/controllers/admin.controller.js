const db = require('../config/db');

exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, name, email, role, status, created_at, last_login FROM users WHERE 1=1';
        const params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await db.execute(query, params);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'BANNED', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);

        // Also update player status if exists
        await db.execute(
            'UPDATE player SET status = ? WHERE user_id = ?',
            [status === 'ACTIVE' ? 'ACTIVE' : status, id]
        );

        res.json({ success: true, message: 'User status updated' });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [playerCount] = await db.execute('SELECT COUNT(*) as count FROM player');
        const [contestCount] = await db.execute('SELECT COUNT(*) as count FROM contest');
        const [problemCount] = await db.execute('SELECT COUNT(*) as count FROM problem WHERE is_active = true');
        const [submissionCount] = await db.execute('SELECT COUNT(*) as count FROM submission');

        const [recentContests] = await db.execute(
            'SELECT * FROM contest ORDER BY created_at DESC LIMIT 5'
        );

        res.json({
            success: true,
            stats: {
                users: userCount[0].count,
                players: playerCount[0].count,
                contests: contestCount[0].count,
                problems: problemCount[0].count,
                submissions: submissionCount[0].count
            },
            recentContests
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
};

exports.createAnnouncement = async (req, res) => {
    try {
        const { title, message, type, target_role, target_contest, expires_at } = req.body;

        await db.execute(
            `INSERT INTO announcement (title, message, type, target_role, target_contest, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, message, type || 'INFO', target_role, target_contest, expires_at, req.user.id]
        );

        res.status(201).json({ success: true, message: 'Announcement created' });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ success: false, message: 'Failed to create announcement' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const [announcements] = await db.execute(
            'SELECT * FROM announcement WHERE is_active = true ORDER BY created_at DESC'
        );
        res.json({ success: true, announcements });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ success: false, message: 'Failed to get announcements' });
    }
};