const db = require('../config/db');

exports.getAllProblems = async (req, res) => {
    try {
        const { difficulty, tag, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, title, difficulty, points, tags, is_active FROM problem WHERE is_active = true';
        const params = [];

        if (difficulty) {
            query += ' AND difficulty = ?';
            params.push(difficulty);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [problems] = await db.execute(query, params);

        // Get total count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM problem WHERE is_active = true'
        );

        res.json({
            success: true,
            problems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({ success: false, message: 'Failed to get problems' });
    }
};

exports.getProblem = async (req, res) => {
    try {
        const [problems] = await db.execute(
            `SELECT id, title, description, examples, test_cases, difficulty, points, tags, 
              starter_code, time_limit_ms, memory_limit_mb 
       FROM problem WHERE id = ? AND is_active = true`,
            [req.params.id]
        );

        if (problems.length === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        const problem = problems[0];

        // Filter test cases - only return samples
        if (problem.test_cases) {
            const testCases = typeof problem.test_cases === 'string'
                ? JSON.parse(problem.test_cases)
                : problem.test_cases;
            problem.test_cases = testCases.filter(tc => tc.is_sample);
        }

        res.json({ success: true, problem });
    } catch (error) {
        console.error('Get problem error:', error);
        res.status(500).json({ success: false, message: 'Failed to get problem' });
    }
};

exports.createProblem = async (req, res) => {
    try {
        const {
            title, description, examples, test_cases, difficulty, points,
            tags, starter_code, solution_code, time_limit_ms, memory_limit_mb
        } = req.body;

        const [result] = await db.execute(
            `INSERT INTO problem (title, description, examples, test_cases, difficulty, points, 
                            tags, starter_code, solution_code, time_limit_ms, memory_limit_mb, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                JSON.stringify(description),
                JSON.stringify(examples),
                JSON.stringify(test_cases),
                difficulty,
                points,
                JSON.stringify(tags),
                JSON.stringify(starter_code),
                solution_code,
                time_limit_ms || 2000,
                memory_limit_mb || 256,
                req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Problem created',
            problemId: result.insertId
        });
    } catch (error) {
        console.error('Create problem error:', error);
        res.status(500).json({ success: false, message: 'Failed to create problem' });
    }
};

exports.updateProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (['title', 'description', 'examples', 'test_cases', 'difficulty', 'points',
                'tags', 'starter_code', 'solution_code', 'time_limit_ms', 'memory_limit_mb', 'is_active'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(id);
        await db.execute(`UPDATE problem SET ${fields.join(', ')} WHERE id = ?`, values);

        res.json({ success: true, message: 'Problem updated' });
    } catch (error) {
        console.error('Update problem error:', error);
        res.status(500).json({ success: false, message: 'Failed to update problem' });
    }
};

exports.deleteProblem = async (req, res) => {
    try {
        await db.execute('UPDATE problem SET is_active = false WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Problem deleted' });
    } catch (error) {
        console.error('Delete problem error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete problem' });
    }
};