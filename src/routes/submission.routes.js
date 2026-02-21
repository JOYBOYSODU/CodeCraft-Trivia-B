const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { protect, playerOnly } = require('../middleware/auth.middleware');

router.post('/', protect, playerOnly, submissionController.createSubmission);
router.get('/my', protect, playerOnly, submissionController.getMySubmissions);
router.get('/:id', protect, submissionController.getSubmission);

module.exports = router;