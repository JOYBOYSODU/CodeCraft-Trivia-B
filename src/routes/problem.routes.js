const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problem.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/', problemController.getAllProblems);
router.get('/:id', problemController.getProblem);
router.post('/', protect, adminOnly, problemController.createProblem);
router.put('/:id', protect, adminOnly, problemController.updateProblem);
router.delete('/:id', protect, adminOnly, problemController.deleteProblem);

module.exports = router;