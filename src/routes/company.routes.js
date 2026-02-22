const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { protect, companyOnly } = require('../middleware/auth.middleware');

// Public routes (any authenticated user can register as company)
router.post('/register', protect, companyController.registerAsCompany);

// Company-only routes
router.get('/profile', protect, companyOnly, companyController.getCompanyProfile);

module.exports = router;
