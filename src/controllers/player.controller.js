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

// ===== Player Goals System Endpoints =====

exports.getPlayerSnapshot = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get player data with user info
        const [players] = await db.execute(
            `SELECT p.*, u.name, u.email, u.profile_picture, u.status as user_status
             FROM player p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.user_id = ?`,
            [userId]
        );

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        const player = players[0];

        // Get level config
        const [levelInfo] = await db.execute(
            'SELECT * FROM level_config WHERE level = ?',
            [player.level]
        );

        // Get stats
        const [submissionStats] = await db.execute(
            `SELECT 
                COUNT(DISTINCT problem_id) as unique_problems_solved,
                COUNT(*) as total_submissions,
                SUM(CASE WHEN verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_submissions,
                SUM(CASE WHEN verdict = 'WRONG_ANSWER' THEN 1 ELSE 0 END) as wrong_answers,
                SUM(CASE WHEN verdict IN ('TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR') THEN 1 ELSE 0 END) as errors
             FROM submission 
             WHERE player_id = ?`,
            [player.id]
        );

        const stats = submissionStats[0] || {};
        const acceptanceRate = stats.total_submissions > 0 
            ? ((stats.accepted_submissions / stats.total_submissions) * 100).toFixed(2)
            : 0;

        // Parse problems_solved JSON
        const problemsSolved = player.problems_solved ? 
            (typeof player.problems_solved === 'string' ? JSON.parse(player.problems_solved) : player.problems_solved)
            : { easy: 0, medium: 0, hard: 0 };

        res.json({
            success: true,
            snapshot: {
                userId: player.user_id,
                playerId: player.id,
                name: player.name,
                email: player.email,
                profile_picture: player.profile_picture,
                level: player.level,
                tier: player.tier,
                sub_rank: player.sub_rank,
                xp: player.xp,
                global_rank: player.global_rank,
                preferred_mode: player.preferred_mode,
                streak_days: player.streak_days,
                total_contests: player.total_contests,
                total_wins: player.total_wins,
                problems_solved: problemsSolved,
                stats: {
                    unique_problems_solved: stats.unique_problems_solved || 0,
                    total_submissions: stats.total_submissions || 0,
                    accepted_submissions: stats.accepted_submissions || 0,
                    wrong_answers: stats.wrong_answers || 0,
                    errors: stats.errors || 0,
                    acceptance_rate: parseFloat(acceptanceRate)
                },
                level_info: levelInfo[0] || null,
                status: player.status,
                last_contest_at: player.last_contest_at,
                created_at: player.created_at,
                updated_at: player.updated_at
            }
        });
    } catch (error) {
        console.error('Get player snapshot error:', error);
        res.status(500).json({ success: false, message: 'Failed to get player snapshot', error: error.message });
    }
};

exports.getPlayerGoals = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get player ID from user ID
        const [players] = await db.execute(
            'SELECT id FROM player WHERE user_id = ?',
            [userId]
        );

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        const playerId = players[0].id;

        // Get goals
        const [goals] = await db.execute(
            'SELECT * FROM player_goals WHERE player_id = ?',
            [playerId]
        );

        if (goals.length === 0) {
            // Return default empty goals if none exist
            return res.json({
                success: true,
                goals: {
                    weekly_target: 0,
                    daily_target: 0,
                    difficulty_focus: 'MIXED',
                    weak_areas: [],
                    strong_areas: [],
                    custom_goals: []
                },
                exists: false
            });
        }

        const goal = goals[0];
        
        // Parse JSON fields
        const weakAreas = goal.weak_areas ? 
            (typeof goal.weak_areas === 'string' ? JSON.parse(goal.weak_areas) : goal.weak_areas)
            : [];
        const strongAreas = goal.strong_areas ? 
            (typeof goal.strong_areas === 'string' ? JSON.parse(goal.strong_areas) : goal.strong_areas)
            : [];
        const customGoals = goal.custom_goals ? 
            (typeof goal.custom_goals === 'string' ? JSON.parse(goal.custom_goals) : goal.custom_goals)
            : [];

        res.json({
            success: true,
            goals: {
                weekly_target: goal.weekly_target,
                daily_target: goal.daily_target,
                difficulty_focus: goal.difficulty_focus,
                weak_areas: weakAreas,
                strong_areas: strongAreas,
                custom_goals: customGoals,
                updated_at: goal.updated_at
            },
            exists: true
        });
    } catch (error) {
        console.error('Get player goals error:', error);
        res.status(500).json({ success: false, message: 'Failed to get player goals', error: error.message });
    }
};

exports.updatePlayerGoals = async (req, res) => {
    try {
        const { userId } = req.params;
        const { weekly_target, daily_target, difficulty_focus, weak_areas, strong_areas, custom_goals } = req.body;

        // Get player ID from user ID
        const [players] = await db.execute(
            'SELECT id FROM player WHERE user_id = ?',
            [userId]
        );

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        const playerId = players[0].id;

        // Check if goals already exist
        const [existingGoals] = await db.execute(
            'SELECT id FROM player_goals WHERE player_id = ?',
            [playerId]
        );

        const weakAreasJson = JSON.stringify(weak_areas || []);
        const strongAreasJson = JSON.stringify(strong_areas || []);
        const customGoalsJson = JSON.stringify(custom_goals || []);

        if (existingGoals.length > 0) {
            // Update existing goals
            await db.execute(
                `UPDATE player_goals 
                 SET weekly_target = ?, daily_target = ?, difficulty_focus = ?, 
                     weak_areas = ?, strong_areas = ?, custom_goals = ?
                 WHERE player_id = ?`,
                [
                    weekly_target || 0,
                    daily_target || 0,
                    difficulty_focus || 'MIXED',
                    weakAreasJson,
                    strongAreasJson,
                    customGoalsJson,
                    playerId
                ]
            );
        } else {
            // Insert new goals
            await db.execute(
                `INSERT INTO player_goals 
                 (player_id, weekly_target, daily_target, difficulty_focus, weak_areas, strong_areas, custom_goals)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    playerId,
                    weekly_target || 0,
                    daily_target || 0,
                    difficulty_focus || 'MIXED',
                    weakAreasJson,
                    strongAreasJson,
                    customGoalsJson
                ]
            );
        }

        res.json({
            success: true,
            message: 'Goals updated successfully',
            goals: {
                weekly_target: weekly_target || 0,
                daily_target: daily_target || 0,
                difficulty_focus: difficulty_focus || 'MIXED',
                weak_areas: weak_areas || [],
                strong_areas: strong_areas || [],
                custom_goals: custom_goals || []
            }
        });
    } catch (error) {
        console.error('Update player goals error:', error);
        res.status(500).json({ success: false, message: 'Failed to update player goals', error: error.message });
    }
};

exports.getPlayerPerformance = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get player ID from user ID
        const [players] = await db.execute(
            'SELECT id FROM player WHERE user_id = ?',
            [userId]
        );

        if (players.length === 0) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        const playerId = players[0].id;

        // Get problem difficulty performance
        const [difficultyStats] = await db.execute(
            `SELECT 
                p.difficulty,
                COUNT(DISTINCT s.problem_id) as problems_attempted,
                SUM(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as problems_solved,
                COUNT(*) as total_submissions,
                SUM(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_submissions,
                AVG(CASE WHEN s.verdict = 'ACCEPTED' THEN s.runtime_ms ELSE NULL END) as avg_runtime_ms,
                SUM(s.wrong_attempts) as total_wrong_attempts
             FROM submission s
             JOIN problem p ON s.problem_id = p.id
             WHERE s.player_id = ?
             GROUP BY p.difficulty`,
            [playerId]
        );

        // Get tag-based performance (weak and strong areas)
        const [tagStats] = await db.execute(
            `SELECT 
                JSON_UNQUOTE(JSON_EXTRACT(p.tags, CONCAT('$[', numbers.n, ']'))) as tag,
                COUNT(DISTINCT s.problem_id) as problems_attempted,
                SUM(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as problems_solved,
                COUNT(*) as total_submissions,
                SUM(CASE WHEN s.verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_submissions
             FROM submission s
             JOIN problem p ON s.problem_id = p.id
             CROSS JOIN (
                 SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
             ) numbers
             WHERE s.player_id = ? 
             AND JSON_EXTRACT(p.tags, CONCAT('$[', numbers.n, ']')) IS NOT NULL
             GROUP BY tag
             HAVING tag IS NOT NULL AND tag != 'null'`,
            [playerId]
        );

        // Calculate acceptance rates and identify weak/strong areas
        const tagPerformance = tagStats.map(stat => {
            const acceptanceRate = stat.total_submissions > 0 
                ? ((stat.accepted_submissions / stat.total_submissions) * 100).toFixed(2)
                : 0;
            
            return {
                tag: stat.tag,
                problems_attempted: stat.problems_attempted,
                problems_solved: stat.problems_solved,
                acceptance_rate: parseFloat(acceptanceRate),
                total_submissions: stat.total_submissions
            };
        });

        // Sort by acceptance rate
        tagPerformance.sort((a, b) => b.acceptance_rate - a.acceptance_rate);

        // Identify weak (bottom 30%) and strong (top 30%) areas
        const weakThreshold = Math.floor(tagPerformance.length * 0.3);
        const strongThreshold = Math.floor(tagPerformance.length * 0.7);
        
        const weakAreas = tagPerformance
            .slice(-weakThreshold)
            .filter(t => t.problems_attempted >= 2) // Only include if tried at least 2 problems
            .map(t => ({ tag: t.tag, acceptance_rate: t.acceptance_rate }));
        
        const strongAreas = tagPerformance
            .slice(0, Math.max(3, weakThreshold))
            .filter(t => t.problems_attempted >= 3)
            .map(t => ({ tag: t.tag, acceptance_rate: t.acceptance_rate }));

        // Format difficulty stats
        const difficultyPerformance = {};
        difficultyStats.forEach(stat => {
            const acceptanceRate = stat.total_submissions > 0 
                ? ((stat.accepted_submissions / stat.total_submissions) * 100).toFixed(2)
                : 0;
            
            difficultyPerformance[stat.difficulty.toLowerCase()] = {
                problems_attempted: stat.problems_attempted,
                problems_solved: stat.problems_solved,
                acceptance_rate: parseFloat(acceptanceRate),
                avg_runtime_ms: stat.avg_runtime_ms ? Math.round(stat.avg_runtime_ms) : null,
                total_wrong_attempts: stat.total_wrong_attempts
            };
        });

        // Get recent performance (last 30 days)
        const [recentStats] = await db.execute(
            `SELECT 
                DATE(submitted_at) as date,
                COUNT(*) as submissions,
                SUM(CASE WHEN verdict = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted
             FROM submission
             WHERE player_id = ? AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(submitted_at)
             ORDER BY date DESC`,
            [playerId]
        );

        res.json({
            success: true,
            performance: {
                difficulty: difficultyPerformance,
                weak_areas: weakAreas,
                strong_areas: strongAreas,
                tag_performance: tagPerformance,
                recent_activity: recentStats
            }
        });
    } catch (error) {
        console.error('Get player performance error:', error);
        res.status(500).json({ success: false, message: 'Failed to get player performance', error: error.message });
    }
};