const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contest.controller');
const { protect, adminOnly, playerOnly } = require('../middleware/auth.middleware');

router.get('/', contestController.getAllContests);
router.get('/:id', contestController.getContest);
router.get('/:id/leaderboard', contestController.getLeaderboard);
router.get('/:id/problems', protect, contestController.getContestProblems);

router.post('/', protect, adminOnly, contestController.createContest);
router.put('/:id', protect, adminOnly, contestController.updateContest);
router.put('/:id/status', protect, adminOnly, contestController.updateStatus);

router.post('/:id/join', protect, playerOnly, contestController.joinContest);

module.exports = router;