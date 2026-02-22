const db = require('../config/db');

const normalizeDifficulty = (difficulty) => {
    if (!difficulty) return 'EASY';
    const upper = String(difficulty).toUpperCase();
    return ['EASY', 'MEDIUM', 'HARD'].includes(upper) ? upper : 'EASY';
};

const buildExamples = ({ examples, example1, example2, example3 }) => {
    if (Array.isArray(examples) && examples.length > 0) {
        return examples;
    }

    const raw = [example1, example2, example3]
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

    return raw.map((text) => ({ text }));
};

const buildStarterCode = ({ starter_code, starter_code1, starter_code2, starter_code3, starter_code4 }) => {
    if (starter_code && typeof starter_code === 'object') {
        return starter_code;
    }

    return {
        python: starter_code1 || '',
        java: starter_code2 || '',
        javascript: starter_code3 || '',
        cpp: starter_code4 || ''
    };
};

exports.getAllProblems = async (req, res) => {
    try {
        const { difficulty, search, tag, page = 1, limit = 20, includeInactive } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const offset = (pageNum - 1) * limitNum;

        let query = 'SELECT id, title, difficulty, points, tags, is_active, created_at FROM problem WHERE 1=1';
        const params = [];

        if (String(includeInactive).toLowerCase() !== 'true') {
            query += ' AND (is_active = 1 OR is_active IS NULL)';
        }

        if (difficulty && difficulty.toUpperCase() !== 'ALL') {
            query += ' AND difficulty = ?';
            params.push(normalizeDifficulty(difficulty));
        }

        if (search && search.trim()) {
            query += ' AND (title LIKE ? OR JSON_EXTRACT(tags, "$") LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

        console.log('Query:', query);
        console.log('Params:', params);

        const [allProblems] = await db.execute(query, params);

        // Apply pagination in memory
        const total = allProblems.length;
        const problems = allProblems.slice(offset, offset + limitNum);

        res.json({
            success: true,
            problems,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total
            }
        });
    } catch (error) {
        console.error('Get problems error:', error);
        res.status(500).json({ success: false, message: 'Failed to get problems', error: error.message });
    }
};

exports.getProblem = async (req, res) => {
    try {
        const [problems] = await db.execute(
            `SELECT id, title, description, examples, test_cases, difficulty, points, tags, 
              starter_code, time_limit_ms, memory_limit_mb, created_at
       FROM problem WHERE id = ? AND (is_active = 1 OR is_active IS NULL)`,
            [req.params.id]
        );

        if (problems.length === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        const problem = problems[0];

        // Parse JSON fields if they're strings
        if (typeof problem.description === 'string') {
            try { problem.description = JSON.parse(problem.description); } catch (_) { }
        }
        if (typeof problem.examples === 'string') {
            try { problem.examples = JSON.parse(problem.examples); } catch (_) { }
        }
        if (typeof problem.starter_code === 'string') {
            try { problem.starter_code = JSON.parse(problem.starter_code); } catch (_) { }
        }
        if (typeof problem.tags === 'string') {
            try { problem.tags = JSON.parse(problem.tags); } catch (_) { }
        }

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
            title,
            description,
            examples,
            example1,
            example2,
            example3,
            test_cases,
            difficulty,
            points,
            tags,
            constraints,
            hints,
            starter_code,
            starter_code1,
            starter_code2,
            starter_code3,
            starter_code4,
            solution_code,
            time_limit_ms,
            memory_limit_mb
        } = req.body;

        const descriptionPayload = typeof description === 'string'
            ? { text: description, constraints: constraints || [], hints: hints || [] }
            : { ...(description || {}), constraints: constraints || [], hints: hints || [] };

        const examplesPayload = buildExamples({ examples, example1, example2, example3 });
        const testCasesPayload = Array.isArray(test_cases) ? test_cases : [];
        const tagsPayload = Array.isArray(tags) ? tags : [];
        const starterCodePayload = buildStarterCode({ starter_code, starter_code1, starter_code2, starter_code3, starter_code4 });

        const [result] = await db.execute(
            `INSERT INTO problem (title, description, examples, test_cases, difficulty, points, 
                            tags, starter_code, solution_code, time_limit_ms, memory_limit_mb, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                JSON.stringify(descriptionPayload),
                JSON.stringify(examplesPayload),
                JSON.stringify(testCasesPayload),
                normalizeDifficulty(difficulty),
                points || 100,
                JSON.stringify(tagsPayload),
                JSON.stringify(starterCodePayload),
                solution_code || null,
                time_limit_ms || 2000,
                memory_limit_mb || 256,
                req.user.id,
                true
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
                let value = updates[key];
                if (key === 'difficulty' && typeof value === 'string') {
                    value = normalizeDifficulty(value);
                }
                values.push(typeof value === 'object' ? JSON.stringify(value) : value);
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