const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/register-company', authController.registerCompany);
router.post('/register-host', authController.registerCompany);
router.post('/register-admin', authController.registerAdmin);
router.post('/login', authController.login);
router.post('/login-company', authController.login);
router.post('/login-host', authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router;