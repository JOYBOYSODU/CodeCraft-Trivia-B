const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/stats', adminController.getDashboardStats);
router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements', adminController.getAnnouncements);

module.exports = router;