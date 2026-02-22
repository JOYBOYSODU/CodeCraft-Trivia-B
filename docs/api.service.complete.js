// Frontend API Service Example - Complete Implementation
// Place this in your frontend project: src/services/api.service.js

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Get token from localStorage or cookies
const getToken = () => localStorage.getItem('token');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || error.message;
    throw new Error(message);
  }
);

// ============================================================================
// AUTH SERVICE
// ============================================================================
export const authService = {
  register: (email, password, role) =>
    api.post('/auth/register', { email, password, role }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// ============================================================================
// USER SERVICE
// ============================================================================
export const userService = {
  getProfile: () =>
    api.get('/user/profile'),

  updateProfile: (data) =>
    api.put('/user/profile', data),

  getLeaderboard: (page = 1, limit = 10) =>
    api.get('/leaderboard', { params: { page, limit } })
};

// ============================================================================
// COMPANY SERVICE
// ============================================================================
export const companyService = {
  // Register as a company
  register: (companyData) =>
    api.post('/company/register', companyData),

  // Get company profile (for COMPANY role users)
  getCompanyProfile: () =>
    api.get('/company/profile'),

  // Get company's created contests
  getCompanyContests: (companyId) =>
    api.get(`/company/${companyId}/contests`),

  // Get company's created problems
  getCompanyProblems: (companyId) =>
    api.get(`/company/${companyId}/problems`)
};

// ============================================================================
// ADMIN SERVICE - Company Approvals
// ============================================================================
export const adminService = {
  // Get pending company applications
  getPendingCompanies: () =>
    api.get('/admin/companies/pending'),

  // Get all companies (approved/suspended)
  getAllCompanies: (status = null, page = 1, limit = 10) =>
    api.get('/admin/companies', { 
      params: { status, page, limit } 
    }),

  // Approve a company
  approveCompany: (companyId, data) =>
    api.put(`/admin/companies/${companyId}/approve`, data),

  // Reject a company application
  rejectCompany: (companyId, data) =>
    api.put(`/admin/companies/${companyId}/reject`, data),

  // Suspend an approved company
  suspendCompany: (companyId, data) =>
    api.put(`/admin/companies/${companyId}/suspend`, data)
};

// ============================================================================
// PROBLEM SERVICE - Problem Management
// ============================================================================
export const problemService = {
  // Create a new problem
  createProblem: (problemData) =>
    api.post('/problems', problemData),

  // Get all problems (for admin to select in contests)
  getAllProblems: (params = {}) =>
    api.get('/problems', { params }),

  // Get problem by ID
  getProblemById: (problemId) =>
    api.get(`/problems/${problemId}`),

  // Update a problem
  updateProblem: (problemId, data) =>
    api.put(`/problems/${problemId}`, data),

  // Delete a problem
  deleteProblem: (problemId) =>
    api.delete(`/problems/${problemId}`),

  // Get all test cases for a problem
  getTestCases: (problemId) =>
    api.get(`/problems/${problemId}/test-cases`)
};

// ============================================================================
// CONTEST SERVICE - Contest Management
// ============================================================================
export const contestService = {
  // Create a new contest
  createContest: (contestData) =>
    api.post('/contests', contestData),

  // Get all contests
  getAllContests: (params = {}) =>
    api.get('/contests', { params }),

  // Get contest by ID
  getContestById: (contestId) =>
    api.get(`/contests/${contestId}`),

  // Get contest with problems
  getContestWithProblems: (contestId) =>
    api.get(`/contests/${contestId}/problems`),

  // Update a contest
  updateContest: (contestId, data) =>
    api.put(`/contests/${contestId}`, data),

  // Start a contest (change status to LIVE)
  startContest: (contestId) =>
    api.put(`/contests/${contestId}/start`, {}),

  // End a contest (change status to ENDED)
  endContest: (contestId) =>
    api.put(`/contests/${contestId}/end`, {}),

  // Delete a contest
  deleteContest: (contestId) =>
    api.delete(`/contests/${contestId}`),

  // Get leaderboard for a contest
  getContestLeaderboard: (contestId, page = 1, limit = 10) =>
    api.get(`/contests/${contestId}/leaderboard`, { 
      params: { page, limit } 
    }),

  // Join a contest (player)
  joinContest: (contestId, inviteCode = null) =>
    api.post(`/contests/${contestId}/join`, { inviteCode }),

  // Leave a contest (player)
  leaveContest: (contestId) =>
    api.post(`/contests/${contestId}/leave`, {})
};

// ============================================================================
// SUBMISSION SERVICE - Code Submissions
// ============================================================================
export const submissionService = {
  // Submit a solution
  submitSolution: (contestId, problemId, code, language) =>
    api.post('/submissions', {
      contest_id: contestId,
      problem_id: problemId,
      code,
      language
    }),

  // Get all submissions for a user
  getMySubmissions: (page = 1, limit = 10) =>
    api.get('/submissions', { params: { page, limit } }),

  // Get submissions for a problem
  getProblemSubmissions: (problemId, page = 1, limit = 10) =>
    api.get(`/problems/${problemId}/submissions`, { 
      params: { page, limit } 
    }),

  // Get a specific submission
  getSubmissionById: (submissionId) =>
    api.get(`/submissions/${submissionId}`)
};

// ============================================================================
// Example Usage in Components
// ============================================================================

/*
// CompanyApprovals Component
import { adminService } from '../services/api.service';

const fetchPendingCompanies = async () => {
  try {
    const response = await adminService.getPendingCompanies();
    setCompanies(response.companies);
  } catch (error) {
    setError(error.message);
  }
};

const handleApprove = async (companyId) => {
  try {
    await adminService.approveCompany(companyId, { 
      aiRequestsLimit: 10 
    });
    alert('Approved!');
    fetchPendingCompanies();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

// CreateProblem Component
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const result = await problemService.createProblem(formData);
    alert(`Problem created! ID: ${result.problemId}`);
  } catch (error) {
    setError(error.message);
  }
};

// CreateContest Component
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const result = await contestService.createContest({
      ...formData,
      problems: selectedProblems
    });
    alert(`Contest created! ID: ${result.contestId}`);
  } catch (error) {
    setError(error.message);
  }
};
*/

export default api;
