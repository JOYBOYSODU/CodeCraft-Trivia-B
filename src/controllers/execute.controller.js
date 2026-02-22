const db = require('../config/db');
const { getLanguageId, runAgainstTestCases } = require('../services/judge0.service');

/**
 * POST /api/execute
 * Runs code against sample test cases for a given problem.
 * Does NOT create a submission record — purely for "Run" button usage.
 *
 * Body: { problem_id, language, code, custom_input? }
 */
exports.runCode = async (req, res) => {
    try {
        const { problem_id, language, code, custom_input } = req.body;

        if (!problem_id || !language || !code) {
            return res.status(400).json({
                success: false,
                message: 'problem_id, language, and code are required'
            });
        }

        // Get problem's test cases and limits
        const [problems] = await db.execute(
            'SELECT test_cases, time_limit_ms, memory_limit_mb FROM problem WHERE id = ? AND is_active = true',
            [problem_id]
        );

        if (problems.length === 0) {
            return res.status(404).json({ success: false, message: 'Problem not found' });
        }

        const problem = problems[0];

        // Resolve language ID
        let languageId;
        try {
            languageId = getLanguageId(language);
        } catch (e) {
            return res.status(400).json({ success: false, message: e.message });
        }

        // Parse test cases — only run sample ones (or custom input if provided)
        let testCasesToRun = [];

        if (custom_input !== undefined && custom_input !== null) {
            // User provided their own input — run against it
            testCasesToRun = [{ input: custom_input, expected_output: '', is_sample: true }];
        } else {
            const allTestCases = typeof problem.test_cases === 'string'
                ? JSON.parse(problem.test_cases)
                : (problem.test_cases || []);
            testCasesToRun = allTestCases.filter(tc => tc.is_sample);

            if (testCasesToRun.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No sample test cases available for this problem'
                });
            }
        }

        const { verdict, results, runtime_ms, memory_mb } = await runAgainstTestCases({
            languageId,
            code,
            testCases: testCasesToRun,
            timeLimitMs: problem.time_limit_ms || 2000,
            memoryLimitMb: problem.memory_limit_mb || 256,
        });

        res.json({
            success: true,
            verdict,
            results,
            runtime_ms,
            memory_mb,
        });
    } catch (error) {
        console.error('Execute error:', error);
        res.status(500).json({ success: false, message: 'Code execution failed: ' + error.message });
    }
};
