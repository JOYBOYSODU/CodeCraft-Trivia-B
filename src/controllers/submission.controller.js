const db = require('../config/db');
const { POINTS, XP, MODE_MULTIPLIERS, PENALTY_PER_WRONG } = require('../config/constants');
const { calculateFinalRating, calculateLevel } = require('../utils/helpers');

exports.createSubmission = async (req, res) => {
    try {
        const { problem_id, contest_id, language, code } = req.body;
        const playerId = req.player.id;

        // Get problem
        const [problems] = await db.execute('SELECT * FROM problem WHERE id = ?', [problem_id]);
        if (problems.length === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }
        const problem = problems[0];

        // Count previous wrong attempts for this problem in this contest
        let wrongAttempts = 0;
        if (contest_id) {
            const [attempts] = await db.execute(
                `SELECT COUNT(*) as count FROM submission 
         WHERE player_id = ? AND problem_id = ? AND contest_id = ? AND verdict != 'ACCEPTED'`,
                [playerId, problem_id, contest_id]
            );
            wrongAttempts = attempts[0].count;
        }

        // Create submission (PENDING)
        const [result] = await db.execute(
            `INSERT INTO submission (player_id, problem_id, contest_id, language, code, wrong_attempts)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [playerId, problem_id, contest_id, language, code, wrongAttempts]
        );

        const submissionId = result.insertId;

        // TODO: In real app, send to judge queue here
        // For hackathon, we'll simulate judging
        const verdict = simulateJudge(code, problem);
        const runtime = Math.floor(Math.random() * 500) + 50;
        const memory = (Math.random() * 20 + 5).toFixed(2);

        // Update submission with verdict
        await db.execute(
            `UPDATE submission SET verdict = ?, runtime_ms = ?, memory_mb = ?, 
       points_earned = ? WHERE id = ?`,
            [
                verdict,
                runtime,
                memory,
                verdict === 'ACCEPTED' ? problem.points : 0,
                submissionId
            ]
        );

        // If ACCEPTED and in contest, update scores
        if (verdict === 'ACCEPTED' && contest_id) {
            await handleAcceptedSubmission(playerId, problem, contest_id, wrongAttempts);
        }

        res.status(201).json({
            success: true,
            submission: {
                id: submissionId,
                verdict,
                runtime_ms: runtime,
                memory_mb: parseFloat(memory),
                points_earned: verdict === 'ACCEPTED' ? problem.points : 0
            }
        });
    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit' });
    }
};

// Simulated judge for hackathon demo
function simulateJudge(code, problem) {
    // 70% acceptance rate for demo
    const rand = Math.random();
    if (rand < 0.7) return 'ACCEPTED';
    if (rand < 0.85) return 'WRONG_ANSWER';
    if (rand < 0.95) return 'TIME_LIMIT_EXCEEDED';
    return 'RUNTIME_ERROR';
}

async function handleAcceptedSubmission(playerId, problem, contestId, wrongAttempts) {
    // Check if already solved this problem in this contest
    const [alreadySolved] = await db.execute(
        `SELECT id FROM submission 
     WHERE player_id = ? AND problem_id = ? AND contest_id = ? AND verdict = 'ACCEPTED' AND id != (SELECT MAX(id) FROM submission WHERE player_id = ? AND problem_id = ? AND contest_id = ?)`,
        [playerId, problem.id, contestId, playerId, problem.id, contestId]
    );

    if (alreadySolved.length > 0) {
        return; // Already solved, don't award again
    }

    // Get participant
    const [participants] = await db.execute(
        'SELECT * FROM contest_participant WHERE contest_id = ? AND player_id = ?',
        [contestId, playerId]
    );

    if (participants.length === 0) return;
    const participant = participants[0];

    const mode = participant.mode;
    const multiplier = MODE_MULTIPLIERS[mode];

    // Calculate XP based on difficulty
    let baseXp = XP.SOLVE_EASY;
    let source = 'SOLVE_EASY';
    if (problem.difficulty === 'MEDIUM') {
        baseXp = XP.SOLVE_MEDIUM;
        source = 'SOLVE_MEDIUM';
    } else if (problem.difficulty === 'HARD') {
        baseXp = XP.SOLVE_HARD;
        source = 'SOLVE_HARD';
    }

    const finalXp = Math.round(baseXp * multiplier);

    // Add XP ledger entry
    await db.execute(
        'INSERT INTO xp_ledger (player_id, contest_id, source, base_xp, multiplier, final_xp) VALUES (?, ?, ?, ?, ?, ?)',
        [playerId, contestId, source, baseXp, multiplier, finalXp]
    );

    // Update player XP
    await db.execute('UPDATE player SET xp = xp + ? WHERE id = ?', [finalXp, playerId]);

    // Get updated XP and calculate level
    const [playerRows] = await db.execute('SELECT xp FROM player WHERE id = ?', [playerId]);
    const levelInfo = await calculateLevel(playerRows[0].xp);

    await db.execute(
        'UPDATE player SET level = ?, tier = ?, sub_rank = ? WHERE id = ?',
        [levelInfo.level, levelInfo.tier, levelInfo.sub_rank, playerId]
    );

    // Update contest_participant scores
    const penaltyMins = wrongAttempts * PENALTY_PER_WRONG;
    const rawScore = participant.raw_score + problem.points;
    const accuracyScore = rawScore - (penaltyMins * 2);
    const xpScore = (participant.xp_earned + finalXp) / 2;
    const finalRating = calculateFinalRating(mode, rawScore, accuracyScore, xpScore);

    await db.execute(
        `UPDATE contest_participant SET 
     raw_score = ?,
     accuracy_score = ?,
     xp_score = ?,
     final_rating = ?,
     problems_solved = problems_solved + 1,
     penalty_mins = penalty_mins + ?,
     xp_earned = xp_earned + ?,
     last_solved_at = NOW()
     WHERE id = ?`,
        [rawScore, accuracyScore, xpScore, finalRating, penaltyMins, finalXp, participant.id]
    );
}

exports.getMySubmissions = async (req, res) => {
    try {
        const { contest_id, problem_id, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const playerId = req.player.id;

        let query = 'SELECT * FROM submission WHERE player_id = ?';
        const params = [playerId];

        if (contest_id) {
            query += ' AND contest_id = ?';
            params.push(contest_id);
        }

        if (problem_id) {
            query += ' AND problem_id = ?';
            params.push(problem_id);
        }

        query += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [submissions] = await db.execute(query, params);

        res.json({ success: true, submissions });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to get submissions' });
    }
};

exports.getSubmission = async (req, res) => {
    try {
        const [submissions] = await db.execute(
            'SELECT * FROM submission WHERE id = ?',
            [req.params.id]
        );

        if (submissions.length === 0) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        res.json({ success: true, submission: submissions[0] });
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ success: false, message: 'Failed to get submission' });
    }
};