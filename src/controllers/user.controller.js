const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getPublicProfile = async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT u.id, u.name, u.profile_picture, u.created_at,
              p.xp, p.level, p.tier, p.sub_rank, p.total_contests, p.total_wins, p.streak_days
       FROM users u
       LEFT JOIN player p ON u.id = p.user_id
       WHERE u.id = ? AND u.status = 'ACTIVE'`,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, profile: users[0] });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, profile_picture, current_password, new_password } = req.body;

        // If changing password, verify current
        if (new_password) {
            const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
            const isMatch = await bcrypt.compare(current_password, users[0].password);

            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password incorrect' });
            }

            const hashedPassword = await bcrypt.hash(new_password, 12);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        }

        // Update other fields
        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }

        if (profile_picture) {
            updates.push('profile_picture = ?');
            values.push(profile_picture);
        }

        if (updates.length > 0) {
            values.push(req.user.id);
            await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};