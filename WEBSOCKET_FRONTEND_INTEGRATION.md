# WebSocket Frontend Integration - Complete Guide

## 📊 Current Status

### ✅ Already Implemented (Backend)
- ✅ Socket.IO server running on port 5000
- ✅ 8 real-time event types (level-up, rank-change, problem-solved, etc.)
- ✅ Room-based broadcasting (per-contest, per-player, per-problem)
- ✅ JWT authentication on connection
- ✅ Database integration for logging and notifications

### ✅ Already Implemented (Frontend)
- ✅ `Contests.jsx` - Lists all contests with status filtering
- ✅ `ContestRoom.jsx` - Contest arena with live leaderboard
- ✅ `socketService.js` - WebSocket client (currently STOMP, needs update)
- ✅ Contest participation flow
- ✅ Contest countdown timers
- ✅ Live/Upcoming/Ended status display

### ❌ Currently Missing
- ❌ Socket.IO client update (currently using STOMP)
- ❌ Live leaderboard real-time updates via Socket.IO
- ❌ Live notification system
- ❌ Connection status indicator
- ❌ useWebSocket React hook

---

## 🔧 What Needs to Be Done

### Step 1: Replace STOMP with Socket.IO (HIGH PRIORITY)

**File:** `src/services/socketService.js`

**Current:** Uses STOMP protocol with SockJS
**Change to:** Socket.IO client

**Why:** Our backend uses Socket.IO, not STOMP

---

### Step 2: Create useWebSocket Hook

**File:** `src/hooks/useWebSocket.js` (create new)

**Purpose:** React hook for easy WebSocket integration in components

---

### Step 3: Update ContestRoom.jsx

**File:** `src/pages/player/ContestRoom.jsx`

**Changes:**
- Replace STOMP subscribe with Socket.IO event listeners
- Add real-time leaderboard updates
- Add notification toasts for level-ups/rank changes
- Show connection status
- Add live notifications for other players' achievements

---

### Step 4: Update Contests.jsx

**File:** `src/pages/player/Contests.jsx`

**Changes:**
- Maybe add real-time participant count updates
- Show live contest activity

---

## 📋 Implementation Steps

### IMMEDIATE ACTIONS

#### 1. Install Socket.IO Client
```bash
npm install socket.io-client
# Remove STOMP deps if not needed elsewhere
npm uninstall @stomp/stompjs sockjs-client
```

#### 2. Create New socketService.js
Replace the current STOMP-based service with Socket.IO version

#### 3. Create useWebSocket Hook
Reusable hook for components to connect to WebSocket

#### 4. Test Connection
Verify WebSocket connects to backend and receives events

---

## 🎯 API Reference

### Backend WebSocket Events (Already Implemented)

**Client can emit:**
```
- 'contest:subscribe' ({ contestId })
- 'contest:unsubscribe' ({ contestId })
- 'problem:subscribe' ({ problemId })
- 'problem:unsubscribe' ({ problemId })
- 'notification:get-pending'
- 'notification:mark-read' ({ notificationId })
- 'heartbeat'
```

**Server broadcasts:**
```
- 'player:level-up' { playerId, oldLevel, newLevel, tierData }
- 'player:rank-changed' { playerId, contestId, oldRank, newRank }
- 'problem:solved' { playerId, problemId, points, contestId }
- 'contest:status-changed' { contestId, oldStatus, newStatus }
- 'leaderboard:updated' { contestId, leaderboard }
- 'achievement:earned' { playerId, achievementType, title }
- 'tier:upgraded' { playerId, oldTier, newTier }
```

---

## 🚀 Implementation Plan

**Priority One (Day 1):**
1. Update socketService.js to use Socket.IO ✅ (I'll do this)
2. Create useWebSocket hook ✅ (I'll do this)
3. Update ContestRoom.jsx ✅ (I'll do this)
4. Test live leaderboard updates ✅ (I'll do this)

**Priority Two (Day 2):**
1. Add connection status indicator
2. Add toast notifications for achievements
3. Update Contests.jsx for real-time data

**Priority Three (Day 3):**
1. Add live participant counter
2. Add activity feed
3. Optimize connection handling

---

## 🎯 Frontend Features That Will Work Once Connected

### Contests Page (`src/pages/player/Contests.jsx`)
✅ **Already Has:**
- List all contests
- Filter by status (LIVE, UPCOMING, ENDED)
- Show participant count
- Countdown timers for UPCOMING
- Register for UPCOMING contests
- Join LIVE contests
- Private/invite code support
- Hiring badge for company contests

✅ **Will Add (Real-Time):**
- Live participant count updates
- Live status changes (UPCOMING → LIVE → ENDED)

### Contest Room (`src/pages/player/ContestRoom.jsx`)
✅ **Already Has:**
- Display contest details
- Show problems
- Track submissions
- Display leaderboard
- Anti-cheat (tab visibility detection)

✅ **Will Add (Real-Time):**
- Live leaderboard updates as players solve problems
- Live rank changes
- Live level-up notifications
- Live achievements
- Connection status

---

## 🔐 Authentication Flow

1. **Backend:** Player logs in → gets JWT token
2. **Frontend:** Player visits ContestRoom
3. **Frontend:** WebSocket client connects with JWT in auth headers
4. **Backend:** Verifies JWT and authenticates player
5. **Frontend:** Subscribes to contest room
6. **Backend:** Sends live updates to player's contest room

---

## 📡 Real-Time Contest Flow

```
Player 1                   Player 2              Server          Database
   │                          │                    │                 │
   ├─ Login, Get JWT ────────────────────────────>│                 │
   │                                               │ Verify JWT      │
   │<─ JWT returned ────────────────────────────── │                 │
   │                                               │                 │
   ├─ Join Contest (Register) ─────────────────────────────────────>│
   │                                               │<─ Create record ─│
   │<─ Join success ────────────────────────────── │                 │
   │                                               │                 │
   ├─ Connect WebSocket with JWT ──────────────────>               │
   │                                               │ Register session│
   │                          ├─ Connect WS ─────>│                 │
   │                          │                   │ Register session│
   │                                               │                 │
   ├─ Subscribe contest:{id} ──────────────────────>              │
   │                          ├─ Subscribe ──────>│                 │
   │                                               │                 │
   │ (Problem Solve)         │                    │                 │
   ├─ Submit solution ─────────────────────────────────────────────>│
   │                                               │<─ Check & update│
   │                                               │ Log activity    │
   │                                               │ Create notif    │
   │                          │                    │                 │
   │                          │<─ leaderboard:updated ────────┐      │
   │<─ leaderboard:updated ──────────────────────────────────┘      │
   │ (Update leaderboard)    │ (Update leaderboard)                  │
   │                          │                    │                 │
   │ (Eventually level up)    │                    │                 │
   ├─ Level up (if threshold)│                    │                 │
   │                          │<─ player:level-up event ────────────>│
   │<─ Show toast notify ─────────────────────────────────────────┘ │
   │ (Celebrate!)            │ (See achievement)  │                 │
   │                                               │                 │
```

---

## ✅ What You Can Do Now

### 1. **View Available Contests** - NO WEBSOCKET NEEDED
   - Players see LIVE, UPCOMING, ENDED contests
   - Filter by status
   - See participant count (static)
   - Register for upcoming

### 2. **Join Live Contest** - PARTIALLY WORKS
   - Player can join contest arena
   - Can see leaderboard (initial load)
   - Can submit solutions
   - Leaderboard updates after refresh (not live)

### 3. **What Needs WebSocket**
   - Live leaderboard updates without refresh
   - Real-time notifications (achievements, level-ups)
   - Live participant counter
   - Live status changes

---

## 📝 Files to Create/Update

```
📁 Frontend (d:\New folder (2)\CodeCraft-Frontend-\codecraft-frontend\src)
├── services/
│   └── socketService.js ..................... UPDATE (STOMP → Socket.IO)
├── hooks/ 
│   └── useWebSocket.js ....................... CREATE (new hook)
├── pages/player/
│   ├── ContestRoom.jsx ....................... UPDATE (use new service)
│   └── Contests.jsx .......................... MAYBE (add real-time stats)
└── utils/
    └── websocketManager.js .................. CREATE (connection pooling)
```

---

## 🎬 Next Steps

**Ready to proceed?**

Option A: **I'll create all the files and update the frontend** (Recommended)
  - New socketService.js (Socket.IO based)
  - New useWebSocket hook
  - Updated ContestRoom.jsx
  - All set to test

Option B: **I'll provide you the code and you implement** (DIY)
  - Give you code snippets
  - You update files
  - You test

Option C: **I'll analyze current implementation first**
  - Check other components
  - See if anything else uses socketService
  - Plan accordingly

**Which would you prefer?** 🚀
