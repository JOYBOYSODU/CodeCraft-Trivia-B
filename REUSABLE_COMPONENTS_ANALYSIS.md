# Reusable Components & Real-Time Features Analysis

## ✅ COMPONENTS WE CAN BUILD WITH EXISTING SCHEMA

### 1️⃣ Badge Components (UI Only - No Backend Needed)

```
✅ Tier Badge Component
   Data Source: player.tier, level_config.tier
   Variants: BRONZE / SILVER / GOLD
   Sizes: S / M / L
   Status: READY TO BUILD

✅ Verdict Badge Component  
   Data Source: submission.verdict (enum)
   Variants: ACCEPTED (✓), WRONG_ANSWER (✗), TIME_LIMIT_EXCEEDED, RUNTIME_ERROR, COMPILATION_ERROR, PENDING
   Colors: Green/Red/Yellow/Orange/Gray
   Status: READY TO BUILD

✅ Difficulty Badge Component
   Data Source: problem.difficulty (enum)
   Variants: EASY / MEDIUM / HARD
   Styles: Pills with colors
   Status: READY TO BUILD

✅ Contest Status Badge Component
   Data Source: contest.status (enum)
   Variants: DRAFT / UPCOMING / LIVE / ENDED / CANCELLED
   With Dots: Different colors per status
   Status: READY TO BUILD

✅ Mode Badge Component
   Data Source: contest_participant.mode (enum)
   Variants: PRECISION / GRINDER / LEGEND
   Status: READY TO BUILD
```

### 2️⃣ Display Components (Use Existing Data)

```
✅ XP Progress Bar
   Data Source: player.xp, level_config.xp_required
   Segmented: Bronze/Silver/Gold sections
   Status: READY TO BUILD

✅ Countdown Timer
   Data Source: contest.end_time (from database)
   Format: HH:MM:SS
   Color States: Green → Yellow → Red
   Status: READY TO BUILD

✅ Leaderboard Display
   Data Source: contest_participant (JOIN with player, users)
   Shows: Rank, Player, XP Score, Mode, Problems Solved
   Status: READY TO BUILD
```

### 3️⃣ UI Infrastructure (Universal Components)

```
✅ Toast Notification System
   Features: Stack, Queue, Auto-dismiss
   Status: FRONTEND ONLY - READY TO BUILD
   
✅ Confirmation Modal
   Reusable for all confirmations
   Status: FRONTEND ONLY - READY TO BUILD
   
✅ Slide-in Drawer
   Right side panel
   Status: FRONTEND ONLY - READY TO BUILD
   
✅ Skeleton Loading
   Reusable shimmer effect
   Status: FRONTEND ONLY - READY TO BUILD
   
✅ Empty State Component
   Illustration + message + CTA
   Status: FRONTEND ONLY - READY TO BUILD

✅ API Response Error Handler
   Global Axios interceptor
   Status: FRONTEND ONLY - READY TO BUILD (We provided this)
   
✅ 401 Auto Redirect to Login
   Axios response interceptor
   Status: FRONTEND ONLY - READY TO BUILD
```

---

## ❌ REAL-TIME FEATURES (NEED BACKEND SUPPORT)

### WebSocket Features - NOT IN CURRENT SCHEMA

These require **new backend infrastructure**:

```
❌ WebSocket Connection Setup
   Required: STOMP/SockJS server (Node.js library: sockjs, stomp, ws)
   Backend Work: Needed
   Database Changes: NEW tables needed

❌ Leaderboard Real-Time Updates
   Challenge: Push updates when scores change
   Needed: Event/Activity tracking
   Database Tables Needed: ↓

❌ Level Up Notifications
   Challenge: Push event when player levels up
   Needed: Activity log + notification system
   Database Tables Needed: ↓

❌ Contest Status Changes
   Challenge: Push when contest status changes
   Needed: Event broadcasting
   Database Tables Needed: ↓ (Can partially use announcement)

❌ Auto-Reconnect Logic
   Challenge: Retry with backoff on connection loss
   Frontend/Backend: Both
```

---

## 📦 MISSING DATABASE TABLES FOR REAL-TIME FEATURES

If you want WebSocket real-time functionality, add these tables:

### **Table 1: activity_log** (Track events in real-time)

```sql
CREATE TABLE `activity_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `action_type` ENUM(
        'LEVEL_UP',
        'PROBLEM_SOLVED',
        'CONTEST_JOINED',
        'CONTEST_FINISHED',
        'RANK_CHANGED',
        'TIER_UPGRADED',
        'ACHIEVEMENT_EARNED'
    ) NOT NULL,
    `contest_id` BIGINT DEFAULT NULL,
    `problem_id` BIGINT DEFAULT NULL,
    `old_value` JSON DEFAULT NULL,
    `new_value` JSON DEFAULT NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_player_time` (`player_id`, `timestamp` DESC),
    KEY `idx_action_type` (`action_type`),
    CONSTRAINT `fk_activity_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_activity_contest` FOREIGN KEY (`contest_id`) REFERENCES `contest` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_activity_problem` FOREIGN KEY (`problem_id`) REFERENCES `problem` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Example Data:**
```sql
-- Player levels up
INSERT INTO activity_log (player_id, action_type, old_value, new_value, timestamp)
VALUES (5, 'LEVEL_UP', '{"level": 10, "tier": "BRONZE"}', '{"level": 11, "tier": "SILVER"}', NOW());

-- Player solves problem
INSERT INTO activity_log (player_id, action_type, problem_id, new_value, timestamp)
VALUES (5, 'PROBLEM_SOLVED', 1, '{"difficulty": "HARD", "points": 100}', NOW());
```

---

### **Table 2: notifications** (Queue for pushing to clients)

```sql
CREATE TABLE `notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `type` ENUM(
        'LEVEL_UP',
        'RANK_CHANGE',
        'CONTEST_START',
        'LEADERBOARD_UPDATE',
        'ACHIEVEMENT',
        'ANNOUNCEMENT'
    ) NOT NULL,
    `title` VARCHAR(255),
    `message` TEXT NOT NULL,
    `data` JSON DEFAULT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `read_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_player_read` (`player_id`, `is_read`, `created_at` DESC),
    CONSTRAINT `fk_notif_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Example Data:**
```sql
-- Level up notification
INSERT INTO notification (player_id, type, title, message, data)
VALUES (5, 'LEVEL_UP', 'Level Up!', 'Congratulations! You reached Silver III',
    '{"level": 11, "tier": "SILVER", "xp": 7600}');

-- Leaderboard notification
INSERT INTO notification (player_id, type, title, message, data)
VALUES (5, 'LEADERBOARD_UPDATE', 'Rank Change', 'You climbed to #5 in Weekly Contest',
    '{"contest_id": 1, "new_rank": 5, "old_rank": 7}');
```

---

### **Table 3: websocket_session** (Optional - Track active connections)

```sql
CREATE TABLE `websocket_session` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `session_id` VARCHAR(255) UNIQUE NOT NULL,
    `connected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `disconnected_at` TIMESTAMP NULL DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (`id`),
    KEY `idx_player_active` (`player_id`, `is_active`),
    CONSTRAINT `fk_ws_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🗺️ IMPLEMENTATION ROADMAP

### **Phase 1: Frontend Components Only** ✅ CAN DO NOW
```
Timeline: 1-2 days
Components:
  ✅ All Badge components (Tier, Verdict, Difficulty, Status, Mode)
  ✅ XP Progress bar
  ✅ Countdown timer
  ✅ Toast notification
  ✅ Confirmation modal
  ✅ Drawer, Skeleton, Empty state
  ✅ Error handlers
  ✅ Navigation (sidebar, navbar, mobile)

Backend: Use existing API
Database: No changes needed
```

### **Phase 2: Real-Time Features** ❌ NEED BACKEND WORK
```
Timeline: 3-5 days (backend developer needed)
Steps:
  1. Add 3 tables (activity_log, notification, websocket_session)
  2. Setup WebSocket server (sockjs-node + stomp)
  3. Create event emitters when:
     - Player levels up
     - Leaderboard updates
     - Contest status changes
     - Achievements earned
  4. Frontend WebSocket listeners
  5. Testing & debugging

Backend Skills: Node.js, WebSocket, Event-driven architecture
```

---

## 📋 QUICK DECISION MATRIX

| Feature | Backend Needed? | Database Changes? | Effort | Priority |
|---------|-----------------|-------------------|--------|----------|
| **Tier Badge** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Verdict Badge** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Difficulty Badge** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Contest Status Badge** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Mode Badge** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **XP Progress Bar** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Countdown Timer** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Toast System** | ❌ No | ❌ No | ⚡ Easy | P1 |
| **Modal/Drawer** | ❌ No | ❌ No | ⚡ Easy | P2 |
| **Skeleton Loader** | ❌ No | ❌ No | ⚡ Easy | P2 |
| **Navigation & Layout** | ❌ No | ❌ No | 🟡 Medium | P1 |
| **Leaderboard Display** | ✅ Yes (existing) | ❌ No | 🟡 Medium | P1 |
| **WebSocket Setup** | ✅ Yes | ✅ Yes | 🔴 Hard | P1 |
| **Real-Time Updates** | ✅ Yes | ✅ Yes | 🔴 Hard | P1 |
| **Connection Indicator** | ✅ Yes | ✅ Yes | 🔴 Hard | P3 |

---

## 🎯 RECOMMENDATION

### **Build Phase 1 NOW** (1-2 days)
- All UI components you listed CAN be built today
- Use existing database - no changes needed
- Great foundation for the platform

### **Plan Phase 2 Later** (if needed)
- Real-time features enhance UX but not critical
- Requires backend developer
- Can implement incrementally:
  1. First: WebSocket leaderboard updates
  2. Second: Level-up notifications
  3. Third: Contest live updates

---

## 📝 NEXT STEPS

Would you like me to create:

1. **Component Library Package** with all badge/UI components?
2. **WebSocket Backend Setup** guide + code?
3. **Database migrations** for real-time tables?
4. **Frontend WebSocket client** hooks?

Just let me know which phase you want to focus on! 🚀
