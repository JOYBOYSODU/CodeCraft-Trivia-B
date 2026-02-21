const db = require('../config/db');
const { generateInviteCode } = require('../utils/helpers');
const { XP } = require('../config/constants');

exports.getAllContests = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM contest WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [contests] = await db.execute(query, params);

        res.json({ success: true, contests });
    } catch (error) {
        console.error('Get contests error:', error);
        res.status(500).json({ success: false, message: 'Failed to get contests' });
    }
};

exports.getContest = async (req, res) => {
    try {
        const [contests] = await db.execute('SELECT * FROM contest WHERE id = ?', [req.params.id]);

        if (contests.length === 0) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        res.json({ success: true, contest: contests[0] });
    } catch (error) {
        console.error('Get contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to get contest' });
    }
};

exports.getContestProblems = async (req, res) => {
    try {
        const [contests] = await db.execute('SELECT * FROM contest WHERE id = ?', [req.params.id]);

        if (contests.length === 0) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        const contest = contests[0];

        // Check if user has joined (for private contests)
        if (!contest.is_public && req.user.role === 'PLAYER') {
            const [participation] = await db.execute(
                'SELECT id FROM contest_participant WHERE contest_id = ? AND player_id = (SELECT id FROM player WHERE user_id = ?)',
                [contest.id, req.user.id]
            );

            if (participation.length === 0) {
                return res.status(403).json({ success: false, message: 'Join contest first' });
            }
        }

        // Check if contest is live or ended
        if (contest.status !== 'LIVE' && contest.status !== 'ENDED') {
            return res.status(403).json({ success: false, message: 'Contest not started yet' });
        }

        const problemIds = typeof contest.problems === 'string'
            ? JSON.parse(contest.problems)
            : contest.problems;

        if (!problemIds || problemIds.length === 0) {
            return res.json({ success: true, problems: [] });
        }

        const placeholders = problemIds.map(() => '?').join(',');
        const [problems] = await db.execute(
            `SELECT id, title, description, examples, difficulty, points, tags, starter_code, time_limit_ms, memory_limit_mb
       FROM problem WHERE id IN (${placeholders})`,
            problemIds
        );

        // Sort by original order and filter test cases
        const orderedProblems = problemIds.map(id => {
            const problem = problems.find(p => p.id === id);
            if (problem && problem.test_cases) {
                const testCases = typeof problem.test_cases === 'string'
                    ? JSON.parse(problem.test_cases)
                    : problem.test_cases;
                problem.test_cases = testCases.filter(tc => tc.is_sample);
            }
            return problem;
        }).filter(Boolean);

        res.json({ success: true, problems: orderedProblems });
    } catch (error) {
        console.error('Get contest problems error:', error);
        res.status(500).json({ success: false, message: 'Failed to get problems' });
    }
};

exports.createContest = async (req, res) => {
    try {
        const {
            title, description, problems, start_time, end_time, duration_mins, is_public
        } = req.body;

        const inviteCode = is_public ? null : generateInviteCode();

        const [result] = await db.execute(
            `INSERT INTO contest (title, description, problems, start_time, end_time, duration_mins, is_public, invite_code, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
            [
                title,
                description,
                JSON.stringify(problems),
                start_time,
                end_time,
                duration_mins || 90,
                is_public !== false,
                inviteCode,
                req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Contest created',
            contestId: result.insertId,
            inviteCode
        });
    } catch (error) {
        console.error('Create contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to create contest' });
    }
};

exports.updateContest = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (['title', 'description', 'problems', 'start_time', 'end_time',
                'duration_mins', 'is_public', 'leaderboard_frozen'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields' });
        }

        values.push(id);
        await db.execute(`UPDATE contest SET ${fields.join(', ')} WHERE id = ?`, values);

        res.json({ success: true, message: 'Contest updated' });
    } catch (error) {
        console.error('Update contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contest' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['DRAFT', 'UPCOMING', 'LIVE', 'ENDED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        await db.execute('UPDATE contest SET status = ? WHERE id = ?', [status, id]);

        // If ending contest, calculate final ranks
        if (status === 'ENDED') {
            await calculateFinalRanks(id);
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

exports.joinContest = async (req, res) => {
    try {
        const { id } = req.params;
        const { mode = 'GRINDER', invite_code } = req.body;
        const playerId = req.player.id;

        // Get contest
        const [contests] = await db.execute('SELECT * FROM contest WHERE id = ?', [id]);
        if (contests.length === 0) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        const contest = contests[0];

        // Check if already joined
        const [existing] = await db.execute(
            'SELECT id FROM contest_participant WHERE contest_id = ? AND player_id = ?',
            [id, playerId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Already joined' });
        }

        // Check status
        if (contest.status !== 'UPCOMING' && contest.status !== 'LIVE') {
            return res.status(400).json({ success: false, message: 'Cannot join this contest' });
        }

        // Check invite code for private contests
        if (!contest.is_public && contest.invite_code !== invite_code) {
            return res.status(403).json({ success: false, message: 'Invalid invite code' });
        }

        // Join contest
        await db.execute(
            'INSERT INTO contest_participant (contest_id, player_id, mode) VALUES (?, ?, ?)',
            [id, playerId, mode]
        );

        // Update participant count
        await db.execute(
            'UPDATE contest SET participant_count = participant_count + 1 WHERE id = ?',
            [id]
        );

        // Update player
        await db.execute(
            'UPDATE player SET total_contests = total_contests + 1, last_contest_at = NOW() WHERE id = ?',
            [playerId]
        );

        // Add XP for joining
        await db.execute(
            'INSERT INTO xp_ledger (player_id, contest_id, source, base_xp, final_xp) VALUES (?, ?, ?, ?, ?)',
            [playerId, id, 'CONTEST_JOIN', XP.CONTEST_JOIN, XP.CONTEST_JOIN]
        );

        await db.execute('UPDATE player SET xp = xp + ? WHERE id = ?', [XP.CONTEST_JOIN, playerId]);

        res.json({ success: true, message: 'Joined contest successfully' });
    } catch (error) {
        console.error('Join contest error:', error);
        res.status(500).json({ success: false, message: 'Failed to join contest' });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const [leaderboard] = await db.execute(
            `SELECT cp.*, u.name, u.profile_picture, p.tier, p.sub_rank
       FROM contest_participant cp
       JOIN player p ON cp.player_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE cp.contest_id = ?
       ORDER BY cp.final_rating DESC, cp.last_solved_at ASC
       LIMIT ? OFFSET ?`,
            [id, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, leaderboard });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
    }
};

// Helper function
async function calculateFinalRanks(contestId) {
    const [participants] = await db.execute(
        `SELECT id FROM contest_participant 
     WHERE contest_id = ? 
     ORDER BY final_rating DESC, last_solved_at ASC`,
        [contestId]
    );

    for (let i = 0; i < participants.length; i++) {
        await db.execute(
            'UPDATE contest_participant SET final_rank = ? WHERE id = ?',
            [i + 1, participants[i].id]
        );

        // Add rank bonus XP for top 5
        if (i < 5) {
            const bonus = XP.RANK_BONUS[i];
            const [cp] = await db.execute('SELECT player_id FROM contest_participant WHERE id = ?', [participants[i].id]);

            await db.execute(
                'INSERT INTO xp_ledger (player_id, contest_id, source, base_xp, final_xp) VALUES (?, ?, ?, ?, ?)',
                [cp[0].player_id, contestId, 'RANK_BONUS', bonus, bonus]
            );

            await db.execute('UPDATE player SET xp = xp + ? WHERE id = ?', [bonus, cp[0].player_id]);
        }
    }

    // Update winner_ids
    const topThree = participants.slice(0, 3).map(p => p.id);
    await db.execute(
        'UPDATE contest SET winner_ids = ? WHERE id = ?',
        [JSON.stringify(topThree), contestId]
    );
}