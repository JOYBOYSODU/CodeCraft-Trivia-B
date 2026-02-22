const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');
const { protect, playerOnly } = require('../middleware/auth.middleware');

// Existing routes
router.get('/profile', protect, playerOnly, playerController.getProfile);
router.get('/stats', protect, playerOnly, playerController.getStats);
router.get('/xp-history', protect, playerOnly, playerController.getXpHistory);
router.put('/mode', protect, playerOnly, playerController.updatePreferredMode);

// Player Goals System routes (accessible by userId)
router.get('/:userId/snapshot', playerController.getPlayerSnapshot);
router.get('/:userId/goals', playerController.getPlayerGoals);
router.post('/:userId/goals', playerController.updatePlayerGoals);
router.get('/:userId/performance', playerController.getPlayerPerformance);

module.exports = router;