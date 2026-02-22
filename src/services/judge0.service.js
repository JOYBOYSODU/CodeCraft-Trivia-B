const https = require('https');

// ─── Language ID Mapping ──────────────────────────────────────────────────────
const LANGUAGE_IDS = {
    c: 50,
    cpp: 54,
    'c++': 54,
    java: 62,
    python: 71,
    python3: 71,
    javascript: 63,
    js: 63,
    typescript: 74,
    ts: 74,
    go: 60,
    golang: 60,
    rust: 73,
    ruby: 72,
    swift: 83,
    kotlin: 78,
    csharp: 51,
    'c#': 51,
    php: 68,
};

// ─── Verdict Mapping ──────────────────────────────────────────────────────────
// Judge0 status IDs → internal verdict strings
const VERDICT_MAP = {
    1: 'PENDING',       // In Queue
    2: 'PENDING',       // Processing
    3: 'ACCEPTED',      // Accepted
    4: 'WRONG_ANSWER',  // Wrong Answer
    5: 'TIME_LIMIT_EXCEEDED',
    6: 'COMPILATION_ERROR',
    7: 'RUNTIME_ERROR', // SIGSEGV
    8: 'RUNTIME_ERROR', // SIGXFSZ
    9: 'RUNTIME_ERROR', // SIGFPE
    10: 'RUNTIME_ERROR', // SIGABRT
    11: 'RUNTIME_ERROR', // NZEC
    12: 'RUNTIME_ERROR', // Other
    13: 'RUNTIME_ERROR', // Internal Error
    14: 'MEMORY_LIMIT_EXCEEDED',
};

/**
 * Returns the Judge0 language ID for a given language string.
 * Throws if the language is not supported.
 */
function getLanguageId(language) {
    const id = LANGUAGE_IDS[language?.toLowerCase()];
    if (!id) {
        throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_IDS).join(', ')}`);
    }
    return id;
}

/**
 * Maps a Judge0 status ID to our internal verdict string.
 */
function mapVerdict(statusId) {
    return VERDICT_MAP[statusId] || 'RUNTIME_ERROR';
}

/**
 * Makes a raw HTTPS request to the RapidAPI Judge0 endpoint.
 */
function apiRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com',
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
                'X-RapidAPI-Host': process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com',
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse Judge0 response: ${data}`));
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

/**
 * Submits code to Judge0 and waits for the result (polling).
 *
 * @param {number} languageId  - Judge0 language ID
 * @param {string} code        - Source code (base64 NOT required; Judge0 CE handles plain text)
 * @param {string} [stdin='']  - Standard input for the program
 * @param {string} [expectedOutput=''] - Expected stdout (Judge0 uses this for WA detection)
 * @param {number} [timeLimitMs=2000]  - Time limit in ms
 * @param {number} [memoryLimitMb=256] - Memory limit in MB
 * @returns {Promise<{ verdict, stdout, stderr, compile_output, runtime_ms, memory_mb }>}
 */
async function submitCode({
    languageId,
    code,
    stdin = '',
    expectedOutput = '',
    timeLimitMs = 2000,
    memoryLimitMb = 256,
}) {
    if (!process.env.JUDGE0_API_KEY) {
        throw new Error('JUDGE0_API_KEY is not set in environment variables');
    }

    // Create submission
    const submission = await apiRequest('POST', '/submissions?base64_encoded=false&wait=false', {
        language_id: languageId,
        source_code: code,
        stdin,
        expected_output: expectedOutput || undefined,
        cpu_time_limit: timeLimitMs / 1000,       // seconds
        memory_limit: memoryLimitMb * 1024,        // KB
    });

    if (!submission.token) {
        throw new Error(`Judge0 submission failed: ${JSON.stringify(submission)}`);
    }

    // Poll until done (status id > 2 means finished)
    const token = submission.token;
    let result;
    const maxPolls = 20;
    const pollIntervalMs = 1000;

    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, pollIntervalMs));
        result = await apiRequest('GET', `/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`);

        if (result.status && result.status.id > 2) {
            break; // Finished
        }
    }

    if (!result || !result.status) {
        throw new Error('Judge0 polling timed out or returned invalid response');
    }

    return {
        verdict: mapVerdict(result.status.id),
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compile_output: result.compile_output || '',
        runtime_ms: result.time ? Math.round(parseFloat(result.time) * 1000) : null,
        memory_mb: result.memory ? parseFloat((result.memory / 1024).toFixed(2)) : null,
    };
}

/**
 * Runs code against an array of test cases.
 * Returns per-test-case results + an overall verdict.
 *
 * @param {{ languageId, code, testCases: Array<{input, expected_output, is_sample}>, timeLimitMs, memoryLimitMb }}
 * @returns {{ verdict, results, runtime_ms, memory_mb }}
 */
async function runAgainstTestCases({ languageId, code, testCases, timeLimitMs = 2000, memoryLimitMb = 256 }) {
    const results = [];
    let overallVerdict = 'ACCEPTED';
    let totalRuntime = 0;
    let maxMemory = 0;

    for (const tc of testCases) {
        const res = await submitCode({
            languageId,
            code,
            stdin: tc.input || '',
            expectedOutput: tc.output ?? tc.expected_output ?? '',
            timeLimitMs,
            memoryLimitMb,
        });

        results.push({
            verdict: res.verdict,
            stdout: res.stdout,
            stderr: res.stderr,
            compile_output: res.compile_output,
            runtime_ms: res.runtime_ms,
            memory_mb: res.memory_mb,
            is_sample: tc.is_sample || false,
        });

        if (res.runtime_ms) totalRuntime += res.runtime_ms;
        if (res.memory_mb && res.memory_mb > maxMemory) maxMemory = res.memory_mb;

        // Short-circuit on first non-AC verdict (compilation error etc.)
        if (res.verdict !== 'ACCEPTED') {
            overallVerdict = res.verdict;
            // Still run remaining samples so the frontend has output to show
            if (res.verdict === 'COMPILATION_ERROR') break;
        }
    }

    const avgRuntime = testCases.length > 0 ? Math.round(totalRuntime / testCases.length) : null;

    return {
        verdict: overallVerdict,
        results,
        runtime_ms: avgRuntime,
        memory_mb: maxMemory || null,
    };
}

module.exports = { getLanguageId, mapVerdict, submitCode, runAgainstTestCases };
