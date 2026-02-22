# CodeCraft Trivia Backend API

Base URL (local): http://localhost:5000
All routes are prefixed with /api.

## Authentication
- Auth is accepted via Authorization: Bearer <token> or the httpOnly cookie named token.
- Roles: PLAYER, ADMIN, COMPANY.
- Role guards:
  - protect: valid token required
  - adminOnly: ADMIN only
  - playerOnly: PLAYER only
  - companyOnly: COMPANY only

## Auth
- POST /api/auth/register
  - Creates a PLAYER user.
  - Body: { name, email, password }
- POST /api/auth/login
  - Body: { email, password }
- POST /api/auth/logout
- GET /api/auth/me (protect)

## Users
- GET /api/users/profile/:id
- PUT /api/users/profile (protect)

## Company Management
- POST /api/company/register (protect)
  - Register as a company (user submits application)
  - Body: { companyName, companyEmail, companyWebsite, type, address, companySize, contactPerson, contactPhone }
- GET /api/company/profile (protect, companyOnly)
  - Get company profile for authenticated company

## Problems
- GET /api/problems
- GET /api/problems/:id
- POST /api/problems (protect, adminOnly)
- PUT /api/problems/:id (protect, adminOnly)
- DELETE /api/problems/:id (protect, adminOnly)

## Contests
- GET /api/contests
- GET /api/contests/:id
- GET /api/contests/:id/leaderboard
- GET /api/contests/:id/problems (protect)
- POST /api/contests (protect, adminOnly)
- PUT /api/contests/:id (protect, adminOnly)
- PUT /api/contests/:id/status (protect, adminOnly)
- POST /api/contests/:id/join (protect, playerOnly)

## Submissions
- POST /api/submissions (protect, playerOnly)
- GET /api/submissions/my (protect, playerOnly)
- GET /api/submissions/:id (protect)

## Player
- GET /api/players/profile (protect, playerOnly)
- GET /api/players/stats (protect, playerOnly)
- GET /api/players/xp-history (protect, playerOnly)
- PUT /api/players/mode (protect, playerOnly)

## Admin
All admin routes are protected by protect + adminOnly.
- GET /api/admin/users
- PUT /api/admin/users/:id/status
- GET /api/admin/stats
- POST /api/admin/announcements
- GET /api/admin/announcements
- GET /api/admin/companies
- GET /api/admin/companies/pending
- PUT /api/admin/companies/:companyId/approve
- PUT /api/admin/companies/:companyId/reject
- PUT /api/admin/companies/:companyId/suspend

## Leaderboard
- GET /api/leaderboard/global
- GET /api/leaderboard/contest/:id

## Health
- GET /api/health
