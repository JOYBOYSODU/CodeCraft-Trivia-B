# Frontend Implementation Guide
## Company Approval + Create Contest + Create Problem

---

## 1️⃣ COMPANY APPROVAL (Admin Feature)

### Frontend Component: `CompanyApprovals.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api.service';

export default function CompanyApprovals() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load pending companies
  useEffect(() => {
    fetchPendingCompanies();
  }, []);

  const fetchPendingCompanies = async () => {
    try {
      setLoading(true);
      const res = await adminService.getPendingCompanies();
      setCompanies(res.companies || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId) => {
    try {
      const aiLimit = prompt('AI Requests Limit (default 10):', '10');
      if (aiLimit === null) return;
      
      await adminService.approveCompany(companyId, { 
        aiRequestsLimit: parseInt(aiLimit) 
      });
      alert('Company approved successfully!');
      fetchPendingCompanies();
      setSelectedCompany(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleReject = async (companyId) => {
    try {
      const reason = prompt('Rejection reason:');
      if (reason === null) return;
      
      await adminService.rejectCompany(companyId, { 
        rejectionReason: reason 
      });
      alert('Company rejected');
      fetchPendingCompanies();
      setSelectedCompany(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="company-approvals">
      <h1>Company Approvals</h1>
      
      {error && <div className="error">{error}</div>}
      {loading && <p>Loading...</p>}

      <div className="companies-list">
        {companies.map(company => (
          <div key={company.id} className="company-card">
            <h3>{company.company_name}</h3>
            <p>Email: {company.company_email}</p>
            <p>Contact: {company.contact_person} ({company.contact_phone})</p>
            <p>Type: {company.type}</p>
            <p>Size: {company.company_size}</p>
            <p>Website: {company.company_website}</p>
            <p>Applied: {new Date(company.created_at).toLocaleDateString()}</p>

            <button 
              onClick={() => setSelectedCompany(company)}
              className="btn-view"
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {selectedCompany && (
        <div className="modal">
          <div className="modal-content">
            <h2>Review: {selectedCompany.company_name}</h2>
            <details>
              <p>Email: {selectedCompany.company_email}</p>
              <p>Website: {selectedCompany.company_website}</p>
              <p>Type: {selectedCompany.type}</p>
              <p>Size: {selectedCompany.company_size}</p>
              <p>Contact: {selectedCompany.contact_person}</p>
              <p>Phone: {selectedCompany.contact_phone}</p>
              <p>Address: {selectedCompany.address}</p>
            </details>

            <div className="actions">
              <button 
                onClick={() => handleApprove(selectedCompany.id)}
                className="btn-success"
              >
                ✓ Approve
              </button>
              <button 
                onClick={() => handleReject(selectedCompany.id)}
                className="btn-danger"
              >
                ✗ Reject
              </button>
              <button 
                onClick={() => setSelectedCompany(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Required UI States:
- ✅ List of pending companies
- ✅ Company details modal
- ✅ Approve button (prompt for AI limit)
- ✅ Reject button (prompt for reason)
- ✅ Loading state
- ✅ Error messages
- ✅ Auto-refresh after action

---

## 2️⃣ CREATE PROBLEM (Admin Feature)

### Frontend Component: `CreateProblem.jsx`

```jsx
import React, { useState } from 'react';
import { problemService } from '../services/api.service';

export default function CreateProblem() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'MEDIUM',
    points: 100,
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    tags: [],
    constraints: [],
    hints: [],
    example1: '',
    example2: '',
    example3: '',
    starter_code1: '', // Python
    starter_code2: '', // Java
    starter_code3: '', // JavaScript
    starter_code4: '', // C++
    test_cases: [],
    solution_code: '',
    is_ai_generated: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayChange = (e, index, field) => {
    const { value } = e.target;
    const arr = [...formData[field]];
    arr[index] = value;
    setFormData(prev => ({
      ...prev,
      [field]: arr
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', output: '', is_sample: false }]
    }));
  };

  const handleTestCaseChange = (index, key, value) => {
    const tc = [...formData.test_cases];
    tc[index][key] = value;
    setFormData(prev => ({ ...prev, test_cases: tc }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await problemService.createProblem(formData);
      setSuccess(`Problem created successfully! ID: ${result.problemId}`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        difficulty: 'MEDIUM',
        points: 100,
        time_limit_ms: 2000,
        memory_limit_mb: 256,
        tags: [],
        constraints: [],
        hints: [],
        example1: '',
        example2: '',
        example3: '',
        starter_code1: '',
        starter_code2: '',
        starter_code3: '',
        starter_code4: '',
        test_cases: [],
        solution_code: '',
        is_ai_generated: false
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-problem">
      <h1>Create New Problem</h1>
      
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="problem-form">
        
        {/* Basic Info */}
        <fieldset>
          <legend>📝 Basic Information</legend>
          
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Two Sum, Palindrome Check"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="6"
              placeholder="Detailed problem statement..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Difficulty *</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div className="form-group">
              <label>Points</label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min="10"
                max="1000"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Time Limit (ms)</label>
              <input
                type="number"
                name="time_limit_ms"
                value={formData.time_limit_ms}
                onChange={handleChange}
                min="100"
              />
            </div>

            <div className="form-group">
              <label>Memory Limit (MB)</label>
              <input
                type="number"
                name="memory_limit_mb"
                value={formData.memory_limit_mb}
                onChange={handleChange}
                min="32"
              />
            </div>
          </div>
        </fieldset>

        {/* Tags & Metadata */}
        <fieldset>
          <legend>🏷️ Tags & Constraints</legend>
          
          <div className="form-group">
            <label>Tags (one per row)</label>
            {formData.tags.map((tag, i) => (
              <input
                key={i}
                type="text"
                value={tag}
                onChange={(e) => handleArrayChange(e, i, 'tags')}
                placeholder="e.g., array, hashmap, sorting"
              />
            ))}
            <button type="button" onClick={() => addArrayItem('tags')}>
              + Add Tag
            </button>
          </div>

          <div className="form-group">
            <label>Constraints (one per row)</label>
            {formData.constraints.map((c, i) => (
              <input
                key={i}
                type="text"
                value={c}
                onChange={(e) => handleArrayChange(e, i, 'constraints')}
                placeholder="e.g., 1 <= n <= 10^5"
              />
            ))}
            <button type="button" onClick={() => addArrayItem('constraints')}>
              + Add Constraint
            </button>
          </div>

          <div className="form-group">
            <label>Hints (optional, one per row)</label>
            {formData.hints.map((hint, i) => (
              <textarea
                key={i}
                value={hint}
                onChange={(e) => handleArrayChange(e, i, 'hints')}
                rows="2"
                placeholder="Hint for solving..."
              />
            ))}
            <button type="button" onClick={() => addArrayItem('hints')}>
              + Add Hint
            </button>
          </div>
        </fieldset>

        {/* Examples */}
        <fieldset>
          <legend>📌 Examples</legend>
          
          {[1, 2, 3].map(num => (
            <div key={num} className="form-group">
              <label>Example {num}</label>
              <textarea
                name={`example${num}`}
                value={formData[`example${num}`]}
                onChange={handleChange}
                rows="3"
                placeholder={`Input: ...\nOutput: ...\nExplanation: ...`}
              />
            </div>
          ))}
        </fieldset>

        {/* Starter Code */}
        <fieldset>
          <legend>💻 Starter Code (by Language)</legend>
          
          <div className="form-group">
            <label>Python Starter</label>
            <textarea
              name="starter_code1"
              value={formData.starter_code1}
              onChange={handleChange}
              rows="5"
              placeholder="def solve(n):&#10;    pass"
            />
          </div>

          <div className="form-group">
            <label>Java Starter</label>
            <textarea
              name="starter_code2"
              value={formData.starter_code2}
              onChange={handleChange}
              rows="5"
              placeholder="public class Solution {&#10;    // Your code&#10;}"
            />
          </div>

          <div className="form-group">
            <label>JavaScript Starter</label>
            <textarea
              name="starter_code3"
              value={formData.starter_code3}
              onChange={handleChange}
              rows="5"
              placeholder="function solve(n) {&#10;    // Your code&#10;}"
            />
          </div>

          <div className="form-group">
            <label>C++ Starter</label>
            <textarea
              name="starter_code4"
              value={formData.starter_code4}
              onChange={handleChange}
              rows="5"
              placeholder="#include <bits/stdc++.h>&#10;using namespace std;"
            />
          </div>
        </fieldset>

        {/* Test Cases */}
        <fieldset>
          <legend>✓ Test Cases *</legend>
          
          {formData.test_cases.map((tc, i) => (
            <div key={i} className="test-case-group">
              <h4>Test Case {i + 1}</h4>
              
              <div className="form-group">
                <label>Input</label>
                <textarea
                  value={tc.input}
                  onChange={(e) => handleTestCaseChange(i, 'input', e.target.value)}
                  rows="3"
                  placeholder="Input data..."
                />
              </div>

              <div className="form-group">
                <label>Expected Output</label>
                <textarea
                  value={tc.output}
                  onChange={(e) => handleTestCaseChange(i, 'output', e.target.value)}
                  rows="3"
                  placeholder="Expected output..."
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={tc.is_sample}
                    onChange={(e) => handleTestCaseChange(i, 'is_sample', e.target.checked)}
                  />
                  Show as Sample to Players
                </label>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addTestCase}>
            + Add Test Case
          </button>
        </fieldset>

        {/* Solution & Metadata */}
        <fieldset>
          <legend>🔐 Solution & Metadata</legend>
          
          <div className="form-group">
            <label>Reference Solution (for testing)</label>
            <textarea
              name="solution_code"
              value={formData.solution_code}
              onChange={handleChange}
              rows="6"
              placeholder="Reference implementation..."
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_ai_generated"
                checked={formData.is_ai_generated}
                onChange={handleChange}
              />
              AI Generated Problem
            </label>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : '✓ Create Problem'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Required Form Fields:
- ✅ Title, Description (required)
- ✅ Difficulty, Points
- ✅ Time & Memory Limits
- ✅ Tags, Constraints, Hints
- ✅ 3 Examples
- ✅ 4 Starter Codes (Python, Java, JS, C++)
- ✅ Test Cases with sample flag
- ✅ Reference Solution
- ✅ AI Generated checkbox

---

## 3️⃣ CREATE CONTEST (Admin/Company Feature)

### Frontend Component: `CreateContest.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { contestService, problemService } from '../services/api.service';

export default function CreateContest() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    problems: [],
    status: 'DRAFT',
    start_time: '',
    end_time: '',
    duration_mins: 120,
    is_public: true,
    invite_code: '',
    job_role: '',
    shortlist_count: 5,
    min_score: 0,
    is_ai_generated: false
  });

  const [problems, setProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load available problems
  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const res = await problemService.getAllProblems();
      setProblems(res.problems || []);
    } catch (err) {
      setError('Failed to load problems');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProblemToggle = (problemId) => {
    setSelectedProblems(prev => 
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  const generateInviteCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData(prev => ({ ...prev, invite_code: code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedProblems.length === 0) {
      setError('Please select at least one problem');
      return;
    }

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      setError('Start time must be before end time');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        problems: selectedProblems
      };

      const result = await contestService.createContest(payload);
      setSuccess(`Contest created successfully! ID: ${result.contestId}`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        problems: [],
        status: 'DRAFT',
        start_time: '',
        end_time: '',
        duration_mins: 120,
        is_public: true,
        invite_code: '',
        job_role: '',
        shortlist_count: 5,
        min_score: 0,
        is_ai_generated: false
      });
      setSelectedProblems([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-contest">
      <h1>Create New Contest</h1>
      
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="contest-form">
        
        {/* Basic Info */}
        <fieldset>
          <legend>📝 Contest Details</legend>
          
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Weekly Coding Challenge #5"
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Contest description and rules..."
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="DRAFT">DRAFT (Not published)</option>
              <option value="UPCOMING">UPCOMING (Scheduled)</option>
              <option value="LIVE">LIVE (Running now)</option>
              <option value="ENDED">ENDED (Past contest)</option>
            </select>
          </div>
        </fieldset>

        {/* Timing */}
        <fieldset>
          <legend>⏰ Timing</legend>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              name="duration_mins"
              value={formData.duration_mins}
              onChange={handleChange}
              min="15"
              max="480"
            />
          </div>
        </fieldset>

        {/* Problems Selection */}
        <fieldset>
          <legend>🔢 Problems ({selectedProblems.length} selected)</legend>
          
          <div className="problems-grid">
            {problems.map(problem => (
              <div key={problem.id} className="problem-card">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedProblems.includes(problem.id)}
                    onChange={() => handleProblemToggle(problem.id)}
                  />
                  <div>
                    <strong>{problem.title}</strong>
                    <p>Difficulty: {problem.difficulty}</p>
                    <p>Points: {problem.points}</p>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <button type="button" onClick={fetchProblems} className="btn-secondary">
            🔄 Refresh Problems
          </button>
        </fieldset>

        {/* Company Settings */}
        <fieldset>
          <legend>🏢 Company Settings (if applicable)</legend>
          
          <div className="form-group">
            <label>Job Role (for recruitment contests)</label>
            <input
              type="text"
              name="job_role"
              value={formData.job_role}
              onChange={handleChange}
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Shortlist Count</label>
              <input
                type="number"
                name="shortlist_count"
                value={formData.shortlist_count}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Minimum Score to Shortlist</label>
              <input
                type="number"
                name="min_score"
                value={formData.min_score}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
        </fieldset>

        {/* Visibility & Access */}
        <fieldset>
          <legend>🔒 Visibility & Access</legend>
          
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_public"
                checked={formData.is_public}
                onChange={handleChange}
              />
              Public Contest (anyone can join)
            </label>
          </div>

          <div className="form-group">
            <label>Invite Code (required if not public)</label>
            <div className="input-group">
              <input
                type="text"
                name="invite_code"
                value={formData.invite_code}
                readOnly
                placeholder="Auto-generated"
              />
              <button type="button" onClick={generateInviteCode} className="btn-small">
                Generate
              </button>
            </div>
          </div>
        </fieldset>

        {/* Metadata */}
        <fieldset>
          <legend>📋 Metadata</legend>
          
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_ai_generated"
                checked={formData.is_ai_generated}
                onChange={handleChange}
              />
              AI Generated Contest
            </label>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : '✓ Create Contest'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Required Form Fields:
- ✅ Title, Description (required)
- ✅ Status (DRAFT, UPCOMING, LIVE, ENDED)
- ✅ Start & End Time (required)
- ✅ Duration in minutes
- ✅ Problem selection (multi-select)
- ✅ Job Role, Shortlist Count, Min Score
- ✅ Public/Private toggle
- ✅ Invite Code (auto-generate)
- ✅ AI Generated checkbox

---

## 📡 API ENDPOINTS

### 1️⃣ Company Approval Endpoints

```
GET /api/admin/companies/pending
  Purpose: Get all pending company approvals
  Auth: Admin only
  Response:
  {
    "success": true,
    "companies": [
      {
        "id": 1,
        "user_id": 5,
        "company_name": "TechCorp Inc",
        "company_email": "hr@techcorp.com",
        "company_website": "https://techcorp.com",
        "type": "Technology",
        "address": "123 Main St",
        "company_size": "500-1000",
        "contact_person": "John Doe",
        "contact_phone": "+1-555-0123",
        "status": "PENDING",
        "created_at": "2026-02-22T10:30:00.000Z"
      }
    ]
  }

PUT /api/admin/companies/:companyId/approve
  Purpose: Approve a company application
  Auth: Admin only
  Body: { aiRequestsLimit: 10 }
  Response:
  {
    "success": true,
    "message": "Company approved successfully"
  }

PUT /api/admin/companies/:companyId/reject
  Purpose: Reject a company application
  Auth: Admin only
  Body: { rejectionReason: "Requirements not met" }
  Response:
  {
    "success": true,
    "message": "Company rejected successfully"
  }

PUT /api/admin/companies/:companyId/suspend
  Purpose: Suspend an approved company
  Auth: Admin only
  Body: { reason: "Policy violation" }
  Response:
  {
    "success": true,
    "message": "Company suspended successfully"
  }
```

### 2️⃣ Create Problem Endpoint

```
POST /api/problems
  Purpose: Create a new problem
  Auth: Admin only
  Body: {
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "MEDIUM",
    "points": 100,
    "tags": ["array", "hashmap"],
    "constraints": ["1 <= nums.length <= 10^4"],
    "hints": ["Use a hashmap to store values"],
    "example1": "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    "example2": "Input: nums = [3,2,4], target = 6\nOutput: [1,2]",
    "example3": null,
    "starter_code1": "def twoSum(nums, target):\n    pass",
    "starter_code2": "public class Solution { ... }",
    "starter_code3": "function twoSum(nums, target) { ... }",
    "starter_code4": "#include <bits/stdc++.h>",
    "test_cases": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "is_sample": true
      },
      {
        "input": "nums = [3,2,4], target = 6",
        "output": "[1,2]",
        "is_sample": true
      }
    ],
    "solution_code": "def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target-num], i]\n        seen[num] = i",
    "time_limit_ms": 2000,
    "memory_limit_mb": 256,
    "is_ai_generated": false
  }
  Response:
  {
    "success": true,
    "message": "Problem created successfully",
    "problemId": 42,
    "problem": {
      "id": 42,
      "title": "Two Sum",
      "difficulty": "MEDIUM",
      "points": 100,
      "created_by": 1
    }
  }
```

### 3️⃣ Create Contest Endpoint

```
POST /api/contests
  Purpose: Create a new contest
  Auth: Admin or Company user
  Body: {
    "title": "Weekly Contest #5",
    "description": "5 problems to solve in 2 hours",
    "problems": [1, 5, 12, 28, 31],
    "status": "DRAFT",
    "start_time": "2026-03-01T10:00:00Z",
    "end_time": "2026-03-01T12:00:00Z",
    "duration_mins": 120,
    "is_public": true,
    "invite_code": "ABC123",
    "job_role": "Senior Developer",
    "shortlist_count": 10,
    "min_score": 250,
    "is_ai_generated": false
  }
  Response:
  {
    "success": true,
    "message": "Contest created successfully",
    "contestId": 18,
    "contest": {
      "id": 18,
      "title": "Weekly Contest #5",
      "status": "DRAFT",
      "created_by": 2
    }
  }
```

### Additional Required Endpoints

```
GET /api/problems
  Purpose: List all problems (for selection in contest creation)
  Auth: Admin only
  Query Params: difficulty, page, limit, search, isAiGenerated
  Response: { success, problems, pagination }

GET /api/company/profile
  Purpose: Get company profile (for company users)
  Auth: Company only
  Response:
  {
    "success": true,
    "company": {
      "id": 1,
      "user_id": 5,
      "company_name": "TechCorp",
      "status": "APPROVED",
      "ai_requests_used": 2,
      "ai_requests_limit": 10,
      "total_contests": 3
    }
  }
```

---

## ✅ Implementation Checklist

### Backend API (Express):
- [ ] `GET /api/admin/companies/pending`
- [ ] `PUT /api/admin/companies/:id/approve`
- [ ] `PUT /api/admin/companies/:id/reject`
- [ ] `PUT /api/admin/companies/:id/suspend`
- [ ] `POST /api/problems` (with all test cases)
- [ ] `POST /api/contests` (with problem array)
- [ ] `GET /api/company/profile`
- [ ] Add role guards to all endpoints

### Frontend Pages:
- [ ] `pages/admin/CompanyApprovals.jsx`
- [ ] `pages/admin/CreateProblem.jsx`
- [ ] `pages/admin/CreateContest.jsx` or `pages/company/CreateContest.jsx`

### Frontend API Service:
- [ ] `adminService.getPendingCompanies()`
- [ ] `adminService.approveCompany(id, data)`
- [ ] `adminService.rejectCompany(id, data)`
- [ ] `adminService.suspendCompany(id, data)`
- [ ] `problemService.createProblem(data)`
- [ ] `contestService.createContest(data)`
- [ ] `companyService.getCompanyProfile()`

### Database Relations:
- [ ] ✅ `companies` table exists
- [ ] ✅ `company_id` in `contests`
- [ ] ✅ `source_company_id` in `problems`
- [ ] ✅ Foreign keys properly set up

---

This gives you everything needed to implement all three features! 🚀
