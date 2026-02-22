const express = require('express');
const router = express.Router();
const executeController = require('../controllers/execute.controller');
const { protect, playerOnly } = require('../middleware/auth.middleware');

// POST /api/execute — Run code against sample test cases (no submission record)
router.post('/', protect, playerOnly, executeController.runCode);

module.exports = router;
