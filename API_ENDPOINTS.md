# CodeCraft Trivia API Endpoints

## Base URL
```
http://localhost:5000/api
```

---

## 🔓 Public Endpoints (No Auth Required)

### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-22T04:57:03.683Z",
  "websocket": "active"
}
```

---

## 📝 Problem Endpoints

### 1. Get All Problems
```http
GET /problems
```
**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `difficulty` (optional) - Filter by: EASY, MEDIUM, HARD
- `includeInactive` (optional) - Include inactive problems (admin only)

**Response:**
```json
{
  "success": true,
  "problems": [
    {
      "id": 1,
      "title": "Two Sum",
      "difficulty": "EASY",
      "points": 100,
      "tags": ["Array", "HashMap"],
      "is_active": 1,
      "created_at": "2026-02-21T19:52:21.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12
  }
}
```

### 2. Get Single Problem
```http
GET /problems/:id
```
**Response:**
```json
{
  "success": true,
  "problem": {
    "id": 1,
    "title": "Two Sum",
    "description": {
      "text": "Find two numbers that add up to target",
      "constraints": ["1 <= nums.length <= 10^4"],
      "hints": ["Try using a hash map"]
    },
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "nums[0] + nums[1] = 9"
      }
    ],
    "test_cases": [
      {
        "input": "[2,7,11,15]\n9",
        "expected_output": "[0,1]",
        "is_sample": true
      }
    ],
    "difficulty": "EASY",
    "points": 100,
    "tags": ["Array", "HashMap"],
    "starter_code": {
      "python": "def twoSum(nums, target):\n    pass",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
      "javascript": "function twoSum(nums, target) {\n    \n}",
      "cpp": "vector<int> twoSum(vector<int>& nums, int target) {\n    \n}"
    },
    "time_limit_ms": 2000,
    "memory_limit_mb": 256
  }
}
```

### 3. Create Problem (Admin Only)
```http
POST /problems
Authorization: Bearer <token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "title": "Two Sum",
  "description": "Find two numbers that add up to target",
  "constraints": ["1 <= nums.length <= 10^4"],
  "hints": ["Try using a hash map"],
  "example1": "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
  "example2": "Input: nums = [3,2,4], target = 6\nOutput: [1,2]",
  "example3": "",
  "starter_code1": "def twoSum(nums, target):\n    pass",
  "starter_code2": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
  "starter_code3": "function twoSum(nums, target) {\n    \n}",
  "starter_code4": "vector<int> twoSum(vector<int>& nums, int target) {\n    \n}",
  "test_cases": [
    {
      "input": "[2,7,11,15]\n9",
      "expected_output": "[0,1]",
      "is_sample": true
    }
  ],
  "difficulty": "EASY",
  "points": 100,
  "tags": ["Array", "HashMap"],
  "time_limit_ms": 2000,
  "memory_limit_mb": 256
}
```
**Response:**
```json
{
  "success": true,
  "message": "Problem created",
  "problemId": 13
}
```

### 4. Update Problem (Admin Only)
```http
PUT /problems/:id
Authorization: Bearer <token>
Content-Type: application/json
```

### 5. Delete Problem (Admin Only)
```http
DELETE /problems/:id
Authorization: Bearer <token>
```

---

## 🏆 Contest Endpoints

### 1. Get All Contests
```http
GET /contests
```
**Query Parameters:**
- `status` (optional) - Filter by: DRAFT, UPCOMING, LIVE, ENDED, CANCELLED
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "contests": [
    {
      "id": 1,
      "title": "Weekly Challenge #1",
      "description": "Solve 5 problems in 90 minutes",
      "status": "LIVE",
      "start_time": "2026-02-22T10:00:00.000Z",
      "end_time": "2026-02-22T11:30:00.000Z",
      "duration_mins": 90,
      "is_public": true,
      "participant_count": 245,
      "problems": [1, 3, 5, 7, 9],
      "created_at": "2026-02-20T08:00:00.000Z"
    }
  ]
}
```

### 2. Get Single Contest
```http
GET /contests/:id
```

### 3. Get Contest Problems
```http
GET /contests/:id/problems
Authorization: Bearer <token> (required for private contests)
```
**Response:**
```json
{
  "success": true,
  "problems": [
    {
      "id": 1,
      "title": "Two Sum",
      "description": {...},
      "examples": [...],
      "difficulty": "EASY",
      "points": 100,
      "starter_code": {...},
      "test_cases": [...]
    }
  ]
}
```

### 4. Create Contest (Admin Only)
```http
POST /contests
Authorization: Bearer <token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "title": "Weekly Challenge #2",
  "description": "Test your skills with these problems",
  "problems": [1, 3, 5, 7, 9],
  "start_time": "2026-02-23T10:00:00Z",
  "end_time": "2026-02-23T11:30:00Z",
  "duration_mins": 90,
  "is_public": true
}
```
**Response:**
```json
{
  "success": true,
  "message": "Contest created",
  "contestId": 5,
  "inviteCode": null
}
```

### 5. Update Contest (Admin Only)
```http
PUT /contests/:id
Authorization: Bearer <token>
```

### 6. Update Contest Status (Admin Only)
```http
PUT /contests/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "status": "LIVE"
}
```
**Valid Status Values:** `DRAFT`, `UPCOMING`, `LIVE`, `ENDED`, `CANCELLED`

### 7. Join Contest (Player Only)
```http
POST /contests/:id/join
Authorization: Bearer <token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "mode": "GRINDER",
  "invite_code": "ABC123XYZ" // only required for private contests
}
```

### 8. Get Contest Leaderboard
```http
GET /contests/:id/leaderboard
```
**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

---

## 🔐 Authentication Endpoints

### 1. Register Player
```http
POST /auth/register
Content-Type: application/json
```
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure123"
}
```

### 2. Register Company/Host
```http
POST /auth/register-company
Content-Type: application/json
```
**Request Body (supports both camelCase and snake_case):**
```json
{
  "name": "Jane Smith",
  "email": "jane@techcorp.com",
  "password": "secure123",
  "companyName": "TechCorp Inc",
  "companyEmail": "hiring@techcorp.com",
  "companyWebsite": "https://techcorp.com",
  "type": "Tech",
  "companySize": "100-500"
}
```
**Alternative (snake_case):**
```json
{
  "name": "Jane Smith",
  "email": "jane@techcorp.com",
  "password": "secure123",
  "company_name": "TechCorp Inc",
  "company_email": "hiring@techcorp.com",
  "company_website": "https://techcorp.com",
  "type": "Tech",
  "company_size": "100-500"
}
```

### 3. Login
```http
POST /auth/login
Content-Type: application/json
```
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secure123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "PLAYER"
  }
}
```

---

## 👤 User Endpoints

### Get Current User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

---

## 👨‍💼 Admin Endpoints

### 1. Get All Users
```http
GET /admin/users
Authorization: Bearer <token>
```

### 2. Get Dashboard Stats
```http
GET /admin/stats
Authorization: Bearer <token>
```

### 3. Get All Companies/Hosts
```http
GET /admin/companies
Authorization: Bearer <token>
```
**Also available at:** `GET /admin/hosts` (legacy)

### 4. Get Pending Company Approvals
```http
GET /admin/companies/pending
Authorization: Bearer <token>
```

### 5. Approve Company
```http
PUT /admin/companies/:companyId/approve
Authorization: Bearer <token>
```
**Also available at:** `PATCH /admin/hosts/:companyId/approve` (legacy)

### 6. Admin Problem Management
```http
GET /admin/problems
POST /admin/problems
PUT /admin/problems/:id
DELETE /admin/problems/:id
Authorization: Bearer <token>
```
**Note:** These are aliases to `/api/problems` endpoints with admin auth

---

## 📊 Leaderboard Endpoints

### Get Global Leaderboard
```http
GET /leaderboard
```
**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

---

## 🎯 Submission Endpoints

### Submit Solution
```http
POST /submissions
Authorization: Bearer <token>
Content-Type: application/json
```
**Request Body:**
```json
{
  "problem_id": 1,
  "contest_id": 5,
  "language": "python",
  "code": "def twoSum(nums, target):\n    # solution code"
}
```

---

## 🌐 WebSocket Events

**Connect to:** `http://localhost:5000`

**Auth:** Send JWT token after connection
```javascript
socket.emit('authenticate', { token: 'your-jwt-token' });
```

**Available Events:**
- `leaderboard-update` - Real-time leaderboard changes
- `new-submission` - When someone submits in contest
- `contest-started` - Contest status changed to LIVE
- `contest-ended` - Contest status changed to ENDED
- `player-level-up` - Player gained a level
- `player-rank-change` - Player rank changed
- `achievement-unlocked` - New achievement earned
- `problem-solved` - Player solved a problem

---

## 📌 Notes

1. **Authorization**: Include JWT token in headers for protected routes:
   ```
   Authorization: Bearer <your-token-here>
   ```

2. **Problem Creation**: Backend accepts both formats:
   - Frontend format: `example1, example2, example3` and `starter_code1..4`
   - Normalized format: `examples` (array) and `starter_code` (object)

3. **Contest Problems**: To fetch problems for contest creation, use:
   ```http
   GET /problems?limit=100
   ```
   Then use the problem IDs in the `problems` array when creating a contest.

4. **CORS**: Frontend must be running on allowed origins (default: http://localhost:3000)

5. **Database**: Ensure MySQL is running and database exists before starting backend.

---

## Example: Creating a Contest with Problems

### Step 1: Fetch all problems
```http
GET /problems?limit=100
```

### Step 2: Select problem IDs
From the response, collect IDs: `[1, 3, 5, 7, 9]`

### Step 3: Create contest with those problems
```http
POST /contests
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "My Contest",
  "description": "Test contest",
  "problems": [1, 3, 5, 7, 9],
  "start_time": "2026-02-23T10:00:00Z",
  "end_time": "2026-02-23T11:30:00Z",
  "duration_mins": 90,
  "is_public": true
}
```

### Step 4: Verify contest problems
```http
GET /contests/:contestId/problems
```

This will return the full problem details for all problems in the contest.
