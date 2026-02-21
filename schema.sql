-- =============================================================================
-- COMPETITIVE CODING PLATFORM - MySQL Schema (Simplified)
-- Import this file directly in phpMyAdmin
-- =============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- =============================================================================
-- Drop existing tables if they exist (in reverse order of dependencies)
-- =============================================================================

DROP TABLE IF EXISTS `announcement`;
DROP TABLE IF EXISTS `xp_ledger`;
DROP TABLE IF EXISTS `contest_participant`;
DROP TABLE IF EXISTS `submission`;
DROP TABLE IF EXISTS `player`;
DROP TABLE IF EXISTS `contest`;
DROP TABLE IF EXISTS `problem`;
DROP TABLE IF EXISTS `level_config`;
DROP TABLE IF EXISTS `users`;

-- =============================================================================
-- SECTION 1 — users
-- =============================================================================

CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('PLAYER', 'ADMIN') NOT NULL DEFAULT 'PLAYER',
    `profile_picture` VARCHAR(500) DEFAULT NULL,
    `is_verified` BOOLEAN DEFAULT FALSE,
    `status` ENUM('ACTIVE', 'DORMANT', 'BANNED', 'SUSPENDED') DEFAULT 'ACTIVE',
    `last_login` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    KEY `idx_users_role` (`role`),
    KEY `idx_users_status` (`status`),
    KEY `idx_users_last_login` (`last_login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 2 — level_config
-- =============================================================================

CREATE TABLE `level_config` (
    `level` SMALLINT NOT NULL,
    `xp_required` INT NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL,
    `sub_rank` VARCHAR(20) NOT NULL,
    `xp_to_next` INT DEFAULT NULL,
    PRIMARY KEY (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed level_config
INSERT INTO `level_config` (`level`, `xp_required`, `tier`, `sub_rank`, `xp_to_next`) VALUES
(1, 0, 'BRONZE', 'Bronze III', 300),
(2, 300, 'BRONZE', 'Bronze III', 400),
(3, 700, 'BRONZE', 'Bronze III', 500),
(4, 1200, 'BRONZE', 'Bronze II', 600),
(5, 1800, 'BRONZE', 'Bronze II', 700),
(6, 2500, 'BRONZE', 'Bronze II', 800),
(7, 3300, 'BRONZE', 'Bronze I', 900),
(8, 4200, 'BRONZE', 'Bronze I', 1000),
(9, 5200, 'BRONZE', 'Bronze I', 1100),
(10, 6300, 'BRONZE', 'Bronze I', 1300),
(11, 7600, 'SILVER', 'Silver III', 1500),
(12, 9100, 'SILVER', 'Silver III', 1700),
(13, 10800, 'SILVER', 'Silver III', 1900),
(14, 12700, 'SILVER', 'Silver II', 2100),
(15, 14800, 'SILVER', 'Silver II', 2300),
(16, 17100, 'SILVER', 'Silver II', 2500),
(17, 19600, 'SILVER', 'Silver I', 2700),
(18, 22300, 'SILVER', 'Silver I', 2900),
(19, 25200, 'SILVER', 'Silver I', 3100),
(20, 28300, 'SILVER', 'Silver I', 3500),
(21, 31800, 'GOLD', 'Gold III', 3800),
(22, 35600, 'GOLD', 'Gold III', 4100),
(23, 39700, 'GOLD', 'Gold III', 4400),
(24, 44100, 'GOLD', 'Gold II', 4700),
(25, 48800, 'GOLD', 'Gold II', 5000),
(26, 53800, 'GOLD', 'Gold II', 5300),
(27, 59100, 'GOLD', 'Gold I', 5600),
(28, 64700, 'GOLD', 'Gold I', 5900),
(29, 70600, 'GOLD', 'Gold I', 6200),
(30, 76800, 'GOLD', 'Gold ELITE', NULL);

-- =============================================================================
-- SECTION 3 — player
-- =============================================================================

CREATE TABLE `player` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `xp` INT NOT NULL DEFAULT 0,
    `global_rank` INT DEFAULT NULL,
    `problems_solved` JSON DEFAULT NULL,
    `status` ENUM('ACTIVE', 'DORMANT', 'BANNED') DEFAULT 'ACTIVE',
    `best_submissions` JSON DEFAULT NULL,
    `streak_days` SMALLINT DEFAULT 0,
    `contests_joined` JSON DEFAULT NULL,
    `level` SMALLINT DEFAULT 1,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') DEFAULT 'BRONZE',
    `sub_rank` VARCHAR(20) DEFAULT 'Bronze III',
    `preferred_mode` ENUM('PRECISION', 'GRINDER', 'LEGEND') DEFAULT 'GRINDER',
    `total_contests` SMALLINT DEFAULT 0,
    `total_wins` SMALLINT DEFAULT 0,
    `last_contest_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_id` (`user_id`),
    KEY `idx_player_xp` (`xp` DESC),
    KEY `idx_player_rank` (`global_rank`),
    KEY `idx_player_tier` (`tier`, `level`),
    CONSTRAINT `fk_player_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 4 — problem
-- =============================================================================

CREATE TABLE `problem` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` JSON NOT NULL,
    `examples` JSON NOT NULL,
    `test_cases` JSON NOT NULL,
    `created_by` BIGINT DEFAULT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'EASY',
    `points` SMALLINT NOT NULL DEFAULT 100,
    `tags` JSON DEFAULT NULL,
    `starter_code` JSON DEFAULT NULL,
    `solution_code` TEXT DEFAULT NULL,
    `time_limit_ms` INT DEFAULT 2000,
    `memory_limit_mb` SMALLINT DEFAULT 256,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_problem_difficulty` (`difficulty`),
    KEY `idx_problem_active` (`is_active`),
    KEY `idx_problem_created_by` (`created_by`),
    CONSTRAINT `fk_problem_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 5 — contest
-- =============================================================================

CREATE TABLE `contest` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `created_by` BIGINT NOT NULL,
    `problems` JSON NOT NULL,
    `winner_ids` JSON DEFAULT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `status` ENUM('DRAFT', 'UPCOMING', 'LIVE', 'ENDED', 'CANCELLED') DEFAULT 'DRAFT',
    `start_time` TIMESTAMP NOT NULL,
    `end_time` TIMESTAMP NOT NULL,
    `duration_mins` SMALLINT NOT NULL DEFAULT 90,
    `is_public` BOOLEAN DEFAULT TRUE,
    `invite_code` VARCHAR(10) DEFAULT NULL,
    `participant_count` INT DEFAULT 0,
    `leaderboard_frozen` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_contest_status` (`status`),
    KEY `idx_contest_start` (`start_time`),
    KEY `idx_contest_end` (`end_time`),
    KEY `idx_contest_created_by` (`created_by`),
    CONSTRAINT `fk_contest_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 6 — submission
-- =============================================================================

CREATE TABLE `submission` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `problem_id` BIGINT NOT NULL,
    `contest_id` BIGINT DEFAULT NULL,
    `language` ENUM('PYTHON', 'JAVA', 'JAVASCRIPT', 'CPP') NOT NULL,
    `code` TEXT NOT NULL,
    `verdict` ENUM('PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR') NOT NULL DEFAULT 'PENDING',
    `runtime_ms` INT DEFAULT NULL,
    `memory_mb` DECIMAL(6,2) DEFAULT NULL,
    `points_earned` SMALLINT DEFAULT 0,
    `wrong_attempts` SMALLINT DEFAULT 0,
    `test_results` JSON DEFAULT NULL,
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sub_player` (`player_id`),
    KEY `idx_sub_problem` (`problem_id`),
    KEY `idx_sub_contest` (`contest_id`),
    KEY `idx_sub_verdict` (`verdict`),
    KEY `idx_sub_time` (`submitted_at` DESC),
    CONSTRAINT `fk_submission_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_submission_problem` FOREIGN KEY (`problem_id`) REFERENCES `problem` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_submission_contest` FOREIGN KEY (`contest_id`) REFERENCES `contest` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 7 — contest_participant
-- =============================================================================

CREATE TABLE `contest_participant` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `contest_id` BIGINT NOT NULL,
    `player_id` BIGINT NOT NULL,
    `mode` ENUM('PRECISION', 'GRINDER', 'LEGEND') NOT NULL DEFAULT 'GRINDER',
    `raw_score` INT NOT NULL DEFAULT 0,
    `accuracy_score` DECIMAL(10,2) DEFAULT 0,
    `xp_score` DECIMAL(10,2) DEFAULT 0,
    `final_rating` DECIMAL(10,2) DEFAULT 0,
    `problems_solved` SMALLINT DEFAULT 0,
    `penalty_mins` SMALLINT DEFAULT 0,
    `final_rank` INT DEFAULT NULL,
    `xp_earned` INT DEFAULT 0,
    `last_solved_at` TIMESTAMP NULL DEFAULT NULL,
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_contest_player` (`contest_id`, `player_id`),
    KEY `idx_cp_leaderboard` (`contest_id`, `final_rating` DESC, `last_solved_at`),
    KEY `idx_cp_player` (`player_id`),
    CONSTRAINT `fk_cp_contest` FOREIGN KEY (`contest_id`) REFERENCES `contest` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cp_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 8 — xp_ledger
-- =============================================================================

CREATE TABLE `xp_ledger` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `contest_id` BIGINT DEFAULT NULL,
    `source` ENUM('CONTEST_JOIN', 'SOLVE_EASY', 'SOLVE_MEDIUM', 'SOLVE_HARD', 'SPEED_BONUS', 'RANK_BONUS', 'MODE_MULTIPLIER') NOT NULL,
    `base_xp` SMALLINT NOT NULL DEFAULT 0,
    `multiplier` DECIMAL(3,1) DEFAULT 1.0,
    `final_xp` SMALLINT NOT NULL DEFAULT 0,
    `earned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_xp_player` (`player_id`),
    KEY `idx_xp_contest` (`contest_id`),
    KEY `idx_xp_earned` (`earned_at` DESC),
    CONSTRAINT `fk_xp_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_xp_contest` FOREIGN KEY (`contest_id`) REFERENCES `contest` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 9 — announcement
-- =============================================================================

CREATE TABLE `announcement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `created_by` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('INFO', 'WARNING', 'SUCCESS') DEFAULT 'INFO',
    `target_role` ENUM('PLAYER', 'ADMIN') DEFAULT NULL,
    `target_contest` BIGINT DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `expires_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_ann_active` (`is_active`),
    KEY `idx_ann_created_by` (`created_by`),
    CONSTRAINT `fk_ann_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ann_contest` FOREIGN KEY (`target_contest`) REFERENCES `contest` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED: Default Admin Account
-- Email: admin@platform.com
-- Password: Admin@1234
-- =============================================================================

INSERT INTO `users` (`name`, `email`, `password`, `role`, `is_verified`, `status`) VALUES
('Platform Admin', 'admin@platform.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oZ4Ry2mey', 'ADMIN', TRUE, 'ACTIVE');

-- =============================================================================
-- SEED: Sample Problems for Testing
-- =============================================================================

INSERT INTO `problem` (`title`, `description`, `examples`, `test_cases`, `difficulty`, `points`, `tags`, `starter_code`, `time_limit_ms`) VALUES
(
    'Two Sum',
    '{"text": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.", "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists."], "hints": ["Try using a hash map for O(n) solution"]}',
    '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}]',
    '[{"input": "4\\n2 7 11 15\\n9", "output": "0 1", "is_sample": true}, {"input": "3\\n3 2 4\\n6", "output": "1 2", "is_sample": false}, {"input": "2\\n3 3\\n6", "output": "0 1", "is_sample": false}]',
    'EASY',
    100,
    '["Array", "HashMap"]',
    '{"python": "def twoSum(nums, target):\\n    pass", "javascript": "function twoSum(nums, target) {\\n    \\n}", "java": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        return new int[]{};\\n    }\\n}", "cpp": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        return {};\\n    }\\n};"}',
    2000
),
(
    'Valid Parentheses',
    '{"text": "Given a string s containing just the characters (,), {, }, [ and ], determine if the input string is valid.", "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only ()[]{}"], "hints": ["Use a stack"]}',
    '[{"input": "s = \\"()\\"", "output": "true", "explanation": "Simple valid parentheses"}, {"input": "s = \\"([)]\\"", "output": "false", "explanation": "Not properly nested"}]',
    '[{"input": "()", "output": "true", "is_sample": true}, {"input": "()[]{}", "output": "true", "is_sample": false}, {"input": "(]", "output": "false", "is_sample": false}]',
    'EASY',
    100,
    '["Stack", "String"]',
    '{"python": "def isValid(s):\\n    pass", "javascript": "function isValid(s) {\\n    \\n}"}',
    1000
),
(
    'Longest Substring Without Repeating Characters',
    '{"text": "Given a string s, find the length of the longest substring without repeating characters.", "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"], "hints": ["Sliding window technique", "Use a set to track characters"]}',
    '[{"input": "s = \\"abcabcbb\\"", "output": "3", "explanation": "The answer is abc with length 3"}]',
    '[{"input": "abcabcbb", "output": "3", "is_sample": true}, {"input": "bbbbb", "output": "1", "is_sample": false}, {"input": "pwwkew", "output": "3", "is_sample": false}]',
    'MEDIUM',
    200,
    '["String", "Sliding Window", "HashMap"]',
    '{"python": "def lengthOfLongestSubstring(s):\\n    pass", "javascript": "function lengthOfLongestSubstring(s) {\\n    \\n}"}',
    2000
),
(
    'Reverse Linked List',
    '{"text": "Given the head of a singly linked list, reverse the list, and return the reversed list.", "constraints": ["The number of nodes in the list is the range [0, 5000]", "-5000 <= Node.val <= 5000"], "hints": ["Iterative approach using three pointers", "Can also be solved recursively"]}',
    '[{"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]", "explanation": "Reverse the entire list"}]',
    '[{"input": "1 2 3 4 5", "output": "5 4 3 2 1", "is_sample": true}, {"input": "1 2", "output": "2 1", "is_sample": false}]',
    'EASY',
    100,
    '["Linked List", "Recursion"]',
    '{"python": "def reverseList(head):\\n    pass", "javascript": "function reverseList(head) {\\n    \\n}"}',
    1500
),
(
    'Binary Search',
    '{"text": "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.", "constraints": ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All the integers in nums are unique", "nums is sorted in ascending order"], "hints": ["Classic binary search", "Time complexity should be O(log n)"]}',
    '[{"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists in nums and its index is 4"}]',
    '[{"input": "6\\n-1 0 3 5 9 12\\n9", "output": "4", "is_sample": true}, {"input": "6\\n-1 0 3 5 9 12\\n2", "output": "-1", "is_sample": false}]',
    'EASY',
    100,
    '["Array", "Binary Search"]',
    '{"python": "def search(nums, target):\\n    pass", "javascript": "function search(nums, target) {\\n    \\n}"}',
    1000
),
(
    'Maximum Subarray',
    '{"text": "Given an integer array nums, find the contiguous subarray which has the largest sum and return its sum.", "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"], "hints": ["Kadanes algorithm", "Dynamic programming approach"]}',
    '[{"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6"}]',
    '[{"input": "9\\n-2 1 -3 4 -1 2 1 -5 4", "output": "6", "is_sample": true}, {"input": "1\\n5", "output": "5", "is_sample": false}]',
    'MEDIUM',
    200,
    '["Array", "Dynamic Programming", "Divide and Conquer"]',
    '{"python": "def maxSubArray(nums):\\n    pass", "javascript": "function maxSubArray(nums) {\\n    \\n}"}',
    2000
),
(
    'Climbing Stairs',
    '{"text": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?", "constraints": ["1 <= n <= 45"], "hints": ["This is a fibonacci sequence", "Can be solved with DP"]}',
    '[{"input": "n = 3", "output": "3", "explanation": "There are three ways: 1+1+1, 1+2, 2+1"}]',
    '[{"input": "3", "output": "3", "is_sample": true}, {"input": "5", "output": "8", "is_sample": false}]',
    'EASY',
    100,
    '["Dynamic Programming", "Math"]',
    '{"python": "def climbStairs(n):\\n    pass", "javascript": "function climbStairs(n) {\\n    \\n}"}',
    1000
),
(
    'Merge Two Sorted Lists',
    '{"text": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.", "constraints": ["The number of nodes in both lists is in the range [0, 50]", "-100 <= Node.val <= 100"], "hints": ["Use a dummy node", "Compare values and link nodes"]}',
    '[{"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]", "explanation": "Merge both sorted lists"}]',
    '[{"input": "1 2 4\\n1 3 4", "output": "1 1 2 3 4 4", "is_sample": true}]',
    'EASY',
    100,
    '["Linked List", "Recursion"]',
    '{"python": "def mergeTwoLists(list1, list2):\\n    pass", "javascript": "function mergeTwoLists(list1, list2) {\\n    \\n}"}',
    1500
),
(
    'Container With Most Water',
    '{"text": "You are given an integer array height of length n. There are n vertical lines. Find two lines that together with the x-axis form a container that holds the most water.", "constraints": ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"], "hints": ["Two pointer approach", "Start from both ends"]}',
    '[{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "Max area between index 1 and 8"}]',
    '[{"input": "9\\n1 8 6 2 5 4 8 3 7", "output": "49", "is_sample": true}]',
    'MEDIUM',
    200,
    '["Array", "Two Pointers", "Greedy"]',
    '{"python": "def maxArea(height):\\n    pass", "javascript": "function maxArea(height) {\\n    \\n}"}',
    2000
),
(
    'Trapping Rain Water',
    '{"text": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.", "constraints": ["n == height.length", "1 <= n <= 2 * 10^4", "0 <= height[i] <= 10^5"], "hints": ["Calculate left and right max for each position", "Two pointer optimization possible"]}',
    '[{"input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]", "output": "6", "explanation": "Total 6 units of rain water trapped"}]',
    '[{"input": "12\\n0 1 0 2 1 0 1 3 2 1 2 1", "output": "6", "is_sample": true}]',
    'HARD',
    400,
    '["Array", "Two Pointers", "Dynamic Programming", "Stack"]',
    '{"python": "def trap(height):\\n    pass", "javascript": "function trap(height) {\\n    \\n}"}',
    3000
);

-- =============================================================================
-- SEED: Sample Contest for Testing
-- =============================================================================

INSERT INTO `contest` (`title`, `description`, `problems`, `start_time`, `end_time`, `duration_mins`, `status`, `created_by`, `is_public`) VALUES
(
    'Weekly Coding Challenge #1',
    'Test your skills with basic to medium level problems. Good for beginners!',
    '[1, 2, 5, 7]',
    DATE_ADD(NOW(), INTERVAL 1 DAY),
    DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 90 MINUTE),
    90,
    'UPCOMING',
    1,
    TRUE
),
(
    'Algorithm Masters Contest',
    'Advanced algorithms and data structures challenge. For experienced coders.',
    '[3, 6, 9, 10]',
    DATE_ADD(NOW(), INTERVAL 3 DAY),
    DATE_ADD(NOW(), INTERVAL 3 DAY + INTERVAL 120 MINUTE),
    120,
    'UPCOMING',
    1,
    TRUE
);

COMMIT;

-- =============================================================================
-- END OF SQL FILE
-- =============================================================================