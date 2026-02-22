const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const companyController = require('../controllers/company.controller');
const problemController = require('../controllers/problem.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// Announcements
router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements', adminController.getAnnouncements);

// Company management
router.get('/companies', companyController.getAllCompanies);
router.get('/companies/pending', companyController.getPendingApprovals);
router.put('/companies/:companyId/approve', companyController.approveCompany);
router.put('/companies/:companyId/reject', companyController.rejectCompany);
router.put('/companies/:companyId/suspend', companyController.suspendCompany);

// Legacy host endpoints (backward compatibility)
router.get('/hosts', companyController.getAllCompanies);
router.patch('/hosts/:companyId/approve', companyController.approveCompany);
router.patch('/hosts/:companyId/reject', companyController.rejectCompany);

// Admin problem management (alias to /api/problems)
router.get('/problems', problemController.getAllProblems);
router.post('/problems', problemController.createProblem);
router.put('/problems/:id', problemController.updateProblem);
router.delete('/problems/:id', problemController.deleteProblem);

module.exports = router;