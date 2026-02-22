// Backend Implementation Guide
// Complete controllers and routes for Company Approval + Create Problem + Create Contest

// ============================================================================
// FILE: src/controllers/admin.controller.js (ADDITIONS)
// ============================================================================

/*
Add these functions to your admin.controller.js
*/

// Get pending companies waiting for approval
const getPendingCompanies = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, user_id, company_name, company_email, company_website,
        type, company_size, address, contact_person, contact_phone,
        status, created_at, updated_at
      FROM companies
      WHERE status = 'PENDING'
      ORDER BY created_at DESC
    `;

    const [companies] = await db.promise().query(query);

    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all companies with optional filters
const getAllCompanies = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM companies';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [companies] = await db.promise().query(query, params);
    const [countResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM companies' + (status ? ' WHERE status = ?' : ''),
      status ? [status] : []
    );

    res.json({
      success: true,
      companies,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve a company application
const approveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { aiRequestsLimit = 10 } = req.body;

    const query = `
      UPDATE companies
      SET status = 'APPROVED', 
          ai_requests_limit = ?,
          approved_by = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await db.promise().query(query, [aiRequestsLimit, req.user.id, companyId]);

    res.json({
      success: true,
      message: 'Company approved successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject a company application
const rejectCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { rejectionReason } = req.body;

    const query = `
      UPDATE companies
      SET status = 'REJECTED', 
          rejection_reason = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await db.promise().query(query, [rejectionReason, companyId]);

    res.json({
      success: true,
      message: 'Company rejected successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Suspend an approved company
const suspendCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE companies
      SET status = 'SUSPENDED', 
          suspension_reason = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await db.promise().query(query, [reason, companyId]);

    res.json({
      success: true,
      message: 'Company suspended successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// FILE: src/controllers/problem.controller.js (ADDITIONS)
// ============================================================================

/*
Add this function to create problems
*/

const createProblem = async (req, res) => {
  try {
    const {
      title, description, difficulty, points, tags, constraints, hints,
      example1, example2, example3,
      starter_code1, starter_code2, starter_code3, starter_code4,
      test_cases, solution_code, time_limit_ms, memory_limit_mb, is_ai_generated
    } = req.body;

    // Validate required fields
    if (!title || !description || !difficulty || !test_cases?.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, difficulty, test_cases'
      });
    }

    // Create problem record
    const problemQuery = `
      INSERT INTO problems (
        title, description, difficulty, points, 
        tags, constraints, hints,
        example1, example2, example3,
        starter_code1, starter_code2, starter_code3, starter_code4,
        solution_code, time_limit_ms, memory_limit_mb,
        is_ai_generated, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [problemResult] = await db.promise().query(problemQuery, [
      title, description, difficulty, points,
      JSON.stringify(tags || []), JSON.stringify(constraints || []), JSON.stringify(hints || []),
      example1 || null, example2 || null, example3 || null,
      starter_code1 || null, starter_code2 || null, starter_code3 || null, starter_code4 || null,
      solution_code || null, time_limit_ms || 2000, memory_limit_mb || 256,
      is_ai_generated ? 1 : 0, req.user.id
    ]);

    const problemId = problemResult.insertId;

    // Insert test cases
    if (test_cases && test_cases.length > 0) {
      const testCaseQuery = `
        INSERT INTO test_cases (problem_id, input, expected_output, is_sample, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;

      for (const tc of test_cases) {
        await db.promise().query(testCaseQuery, [
          problemId,
          tc.input,
          tc.output,
          tc.is_sample ? 1 : 0
        ]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      problemId,
      problem: {
        id: problemId,
        title,
        difficulty,
        points,
        created_by: req.user.id
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all problems (for admin/contest creation)
const getAllProblems = async (req, res) => {
  try {
    const { difficulty, page = 1, limit = 20, search, isAiGenerated } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, title, description, difficulty, points, 
        tags, constraints, is_ai_generated, created_by, created_at
      FROM problems
      WHERE 1=1
    `;
    const params = [];

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (isAiGenerated !== undefined) {
      query += ' AND is_ai_generated = ?';
      params.push(isAiGenerated === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [problems] = await db.promise().query(query, params);

    // Parse JSON fields
    const parsedProblems = problems.map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      constraints: JSON.parse(p.constraints || '[]')
    }));

    const [countResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM problems'
    );

    res.json({
      success: true,
      problems: parsedProblems,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// FILE: src/controllers/contest.controller.js (ADDITIONS)
// ============================================================================

/*
Add this function to create contests
*/

const createContest = async (req, res) => {
  try {
    const {
      title, description, problems, status, start_time, end_time,
      duration_mins, is_public, invite_code, job_role, shortlist_count,
      min_score, is_ai_generated
    } = req.body;

    // Validate required fields
    if (!title || !description || !problems?.length || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get user's company if they're a company user
    let companyId = null;
    if (req.user.role === 'COMPANY') {
      const [companyResult] = await db.promise().query(
        'SELECT id FROM companies WHERE user_id = ?',
        [req.user.id]
      );
      if (companyResult.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You must have an approved company to create contests'
        });
      }
      companyId = companyResult[0].id;
    }

    // Create contest record
    const contestQuery = `
      INSERT INTO contest (
        title, description, status, start_time, end_time, duration_mins,
        is_public, invite_code, job_role, shortlist_count, min_score,
        is_ai_generated, company_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [contestResult] = await db.promise().query(contestQuery, [
      title, description, status || 'DRAFT', start_time, end_time, duration_mins || 120,
      is_public ? 1 : 0, invite_code || null, job_role || null, shortlist_count || 0,
      min_score || 0, is_ai_generated ? 1 : 0, companyId, req.user.id
    ]);

    const contestId = contestResult.insertId;

    // Add problems to contest
    if (problems && problems.length > 0) {
      const problemQuery = `
        INSERT INTO contest_problems (contest_id, problem_id, created_at)
        VALUES (?, ?, NOW())
      `;

      for (let i = 0; i < problems.length; i++) {
        await db.promise().query(problemQuery, [contestId, problems[i]]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Contest created successfully',
      contestId,
      contest: {
        id: contestId,
        title,
        status: status || 'DRAFT',
        created_by: req.user.id,
        company_id: companyId
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all contests
const getAllContests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, isPublic } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, title, description, status, start_time, end_time,
        is_public, job_role, company_id, created_by, created_at
      FROM contest
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (isPublic !== undefined) {
      query += ' AND is_public = ?';
      params.push(isPublic === 'true' ? 1 : 0);
    }

    query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [contests] = await db.promise().query(query, params);
    const [countResult] = await db.promise().query('SELECT COUNT(*) as total FROM contest');

    res.json({
      success: true,
      contests,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get contest with problems
const getContestWithProblems = async (req, res) => {
  try {
    const { contestId } = req.params;

    const [contests] = await db.promise().query(
      'SELECT * FROM contest WHERE id = ?',
      [contestId]
    );

    if (contests.length === 0) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const [problems] = await db.promise().query(`
      SELECT p.* FROM problems p
      JOIN contest_problems cp ON p.id = cp.problem_id
      WHERE cp.contest_id = ?
    `, [contestId]);

    res.json({
      success: true,
      contest: contests[0],
      problems
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// FILE: src/routes/admin.routes.js (ADDITIONS)
// ============================================================================

/*
Add these routes to your admin.routes.js
*/

router.get('/companies/pending', adminOnly, adminController.getPendingCompanies);
router.get('/companies', adminOnly, adminController.getAllCompanies);
router.put('/companies/:companyId/approve', adminOnly, adminController.approveCompany);
router.put('/companies/:companyId/reject', adminOnly, adminController.rejectCompany);
router.put('/companies/:companyId/suspend', adminOnly, adminController.suspendCompany);

// ============================================================================
// FILE: src/routes/problem.routes.js (UPDATES)
// ============================================================================

/*
Update/add these routes
*/

router.post('/', adminOnly, problemController.createProblem);
router.get('/', problemController.getAllProblems);
router.get('/:problemId', problemController.getProblemById);
router.put('/:problemId', adminOnly, problemController.updateProblem);
router.delete('/:problemId', adminOnly, problemController.deleteProblem);

// ============================================================================
// FILE: src/routes/contest.routes.js (UPDATES)
// ============================================================================

/*
Update/add these routes
*/

router.post('/', (req, res, next) => {
  // Allow both admin and company users
  if (req.user.role === 'ADMIN' || req.user.role === 'COMPANY') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden' });
  }
}, contestController.createContest);

router.get('/', contestController.getAllContests);
router.get('/:contestId', contestController.getContestById);
router.get('/:contestId/problems', contestController.getContestWithProblems);
router.put('/:contestId', adminOnly, contestController.updateContest);
router.delete('/:contestId', adminOnly, contestController.deleteContest);

// ============================================================================
// DATABASE SCHEMA REQUIREMENTS
// ============================================================================

/*
Ensure these tables exist:

1. companies table:
   - id (PK)
   - user_id (FK → users)
   - company_name
   - company_email
   - company_website
   - type
   - company_size
   - address
   - contact_person
   - contact_phone
   - status (PENDING, APPROVED, REJECTED, SUSPENDED)
   - ai_requests_limit (default 10)
   - ai_requests_used (default 0)
   - rejection_reason
   - suspension_reason
   - approved_by (FK → users, nullable)
   - created_at
   - updated_at

2. problems table:
   - id (PK)
   - title
   - description
   - difficulty (EASY/MEDIUM/HARD)
   - points
   - tags (JSON)
   - constraints (JSON)
   - hints (JSON)
   - example1, example2, example3
   - starter_code1-4 (Python, Java, JS, C++)
   - solution_code
   - time_limit_ms
   - memory_limit_mb
   - is_ai_generated
   - source_company_id (FK → companies, nullable)
   - created_by (FK → users)
   - created_at
   - updated_at

3. test_cases table:
   - id (PK)
   - problem_id (FK → problems)
   - input
   - expected_output
   - is_sample
   - created_at
   - updated_at

4. contest table:
   - id (PK)
   - title
   - description
   - status (DRAFT/UPCOMING/LIVE/ENDED)
   - start_time
   - end_time
   - duration_mins
   - is_public
   - invite_code
   - job_role
   - shortlist_count
   - min_score
   - is_ai_generated
   - company_id (FK → companies, nullable)
   - created_by (FK → users)
   - created_at
   - updated_at

5. contest_problems (junction table):
   - id (PK)
   - contest_id (FK → contest)
   - problem_id (FK → problems)
   - created_at

*/

// ============================================================================
// MIDDLEWARE UPDATES
// ============================================================================

/*
Ensure you have these middleware in auth.middleware.js:

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
};

const companyOnly = (req, res, next) => {
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ success: false, message: 'Company users only' });
  }
  next();
};

const playerOnly = (req, res, next) => {
  if (req.user.role !== 'PLAYER') {
    return res.status(403).json({ success: false, message: 'Players only' });
  }
  next();
};
*/

export {
  // Admin
  getPendingCompanies,
  getAllCompanies,
  approveCompany,
  rejectCompany,
  suspendCompany,
  // Problems
  createProblem,
  getAllProblems,
  // Contests
  createContest,
  getAllContests,
  getContestWithProblems
};
