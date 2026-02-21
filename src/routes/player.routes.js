const express = require('express');
const router = express.Router();
const playerController = require('../controllers/player.controller');
const { protect, playerOnly } = require('../middleware/auth.middleware');

router.get('/profile', protect, playerOnly, playerController.getProfile);
router.get('/stats', protect, playerOnly, playerController.getStats);
router.get('/xp-history', protect, playerOnly, playerController.getXpHistory);
router.put('/mode', protect, playerOnly, playerController.updatePreferredMode);

module.exports = router;