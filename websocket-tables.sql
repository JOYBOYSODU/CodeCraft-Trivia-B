-- =============================================================================
-- NEW TABLES FOR REAL-TIME WEBSOCKET FEATURES
-- =============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS `websocket_session`;
DROP TABLE IF EXISTS `notification`;
DROP TABLE IF EXISTS `activity_log`;

-- =============================================================================
-- TABLE 1: activity_log
-- Purpose: Track all important player events for real-time broadcasting
-- =============================================================================

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
    `is_broadcasted` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (`id`),
    KEY `idx_player_time` (`player_id`, `timestamp` DESC),
    KEY `idx_action_type` (`action_type`),
    KEY `idx_contest_id` (`contest_id`),
    KEY `idx_broadcast_status` (`is_broadcasted`),
    CONSTRAINT `fk_activity_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_activity_contest` FOREIGN KEY (`contest_id`) REFERENCES `contest` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_activity_problem` FOREIGN KEY (`problem_id`) REFERENCES `problem` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data
INSERT INTO `activity_log` (`player_id`, `action_type`, `old_value`, `new_value`, `timestamp`)
VALUES 
(1, 'LEVEL_UP', '{"level": 10, "tier": "BRONZE"}', '{"level": 11, "tier": "SILVER"}', NOW()),
(1, 'PROBLEM_SOLVED', NULL, '{"problem_id": 1, "difficulty": "HARD", "points": 100}', NOW());

-- =============================================================================
-- TABLE 2: notification
-- Purpose: Queue for pushing notifications to connected players
-- =============================================================================

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
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON DEFAULT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `read_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_player_read` (`player_id`, `is_read`, `created_at` DESC),
    KEY `idx_created_at` (`created_at` DESC),
    CONSTRAINT `fk_notif_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data
INSERT INTO `notification` (`player_id`, `type`, `title`, `message`, `data`)
VALUES 
(1, 'LEVEL_UP', 'Level Up! 🎉', 'Congratulations! You reached Silver III', 
    '{"level": 11, "tier": "SILVER", "xp": 7600}'),
(1, 'LEADERBOARD_UPDATE', 'Rank Update', 'You climbed to #5 in Weekly Contest', 
    '{"contest_id": 1, "new_rank": 5, "old_rank": 7}');

-- =============================================================================
-- TABLE 3: websocket_session
-- Purpose: Track active WebSocket connections for targeted broadcasting
-- =============================================================================

CREATE TABLE `websocket_session` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `session_id` VARCHAR(255) UNIQUE NOT NULL,
    `connected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `disconnected_at` TIMESTAMP NULL DEFAULT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_heartbeat` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_player_active` (`player_id`, `is_active`),
    KEY `idx_session_id` (`session_id`),
    CONSTRAINT `fk_ws_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ALTER EXISTING TABLES TO ADD WEBSOCKET METADATA
-- =============================================================================

-- Add these columns to contest table if not exists
ALTER TABLE `contest` ADD COLUMN `status_updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add these columns to player table if not exists
ALTER TABLE `player` ADD COLUMN `last_level_up_at` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE `player` ADD COLUMN `last_rank_change_at` TIMESTAMP NULL DEFAULT NULL;

-- =============================================================================
-- VIEWS FOR REAL-TIME DATA
-- =============================================================================

-- View: Current Contest Leaderboard (for WebSocket updates)
CREATE OR REPLACE VIEW `v_contest_leaderboard` AS
SELECT 
    cp.contest_id,
    cp.player_id,
    cp.final_rank,
    cp.final_rating,
    cp.problems_solved,
    cp.xp_earned,
    u.name as player_name,
    u.profile_picture,
    p.tier,
    p.level,
    p.global_rank,
    cp.joined_at,
    cp.last_solved_at
FROM `contest_participant` cp
JOIN `player` p ON cp.player_id = p.id
JOIN `users` u ON p.user_id = u.id
ORDER BY cp.contest_id, cp.final_rank;

-- View: Active Sessions by Player
CREATE OR REPLACE VIEW `v_active_sessions` AS
SELECT 
    ws.player_id,
    u.name as player_name,
    COUNT(ws.id) as active_connections,
    MAX(ws.last_heartbeat) as last_active
FROM `websocket_session` ws
JOIN `player` p ON ws.player_id = p.id
JOIN `users` u ON p.user_id = u.id
WHERE ws.is_active = TRUE
GROUP BY ws.player_id;

-- =============================================================================
-- STORED PROCEDURES FOR REAL-TIME OPERATIONS
-- =============================================================================

-- Log activity and return ID for broadcasting
DELIMITER //

CREATE PROCEDURE `sp_log_activity`(
    IN p_player_id BIGINT,
    IN p_action_type VARCHAR(50),
    IN p_contest_id BIGINT,
    IN p_problem_id BIGINT,
    IN p_old_value JSON,
    IN p_new_value JSON,
    OUT out_activity_id BIGINT
)
BEGIN
    INSERT INTO `activity_log` (
        `player_id`, `action_type`, `contest_id`, `problem_id`, 
        `old_value`, `new_value`, `timestamp`
    ) VALUES (
        p_player_id, p_action_type, p_contest_id, p_problem_id, 
        p_old_value, p_new_value, NOW()
    );
    
    SET out_activity_id = LAST_INSERT_ID();
END //

-- Create notification from activity
CREATE PROCEDURE `sp_create_notification`(
    IN p_player_id BIGINT,
    IN p_notification_type VARCHAR(50),
    IN p_title VARCHAR(255),
    IN p_message TEXT,
    IN p_data JSON
)
BEGIN
    INSERT INTO `notification` (
        `player_id`, `type`, `title`, `message`, `data`
    ) VALUES (
        p_player_id, p_notification_type, p_title, p_message, p_data
    );
END //

-- Register WebSocket session
CREATE PROCEDURE `sp_register_websocket_session`(
    IN p_player_id BIGINT,
    IN p_session_id VARCHAR(255),
    OUT out_session_id BIGINT
)
BEGIN
    INSERT INTO `websocket_session` (
        `player_id`, `session_id`, `is_active`
    ) VALUES (
        p_player_id, p_session_id, TRUE
    );
    
    SET out_session_id = LAST_INSERT_ID();
END //

-- Disconnect WebSocket session
CREATE PROCEDURE `sp_disconnect_websocket_session`(
    IN p_session_id VARCHAR(255)
)
BEGIN
    UPDATE `websocket_session`
    SET `is_active` = FALSE, `disconnected_at` = NOW()
    WHERE `session_id` = p_session_id;
END //

-- Get unbroadcasted activities
CREATE PROCEDURE `sp_get_unbroadcasted_activities`(
    IN p_limit INT
)
BEGIN
    SELECT 
        `id`, `player_id`, `action_type`, `contest_id`, 
        `problem_id`, `old_value`, `new_value`, `timestamp`
    FROM `activity_log`
    WHERE `is_broadcasted` = FALSE
    ORDER BY `timestamp` DESC
    LIMIT p_limit;
END //

-- Mark activities as broadcasted
CREATE PROCEDURE `sp_mark_activities_broadcasted`(
    IN p_activity_ids JSON
)
BEGIN
    UPDATE `activity_log`
    SET `is_broadcasted` = TRUE
    WHERE `id` IN (
        SELECT JSON_UNQUOTE(JSON_EXTRACT(p_activity_ids, CONCAT('$[', seq, ']')))
        FROM (
            SELECT 0 as seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
            UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
        ) numbers
        WHERE JSON_EXTRACT(p_activity_ids, CONCAT('$[', seq, ']')) IS NOT NULL
    );
END //

DELIMITER ;

-- =============================================================================
-- COMMIT CHANGES
-- =============================================================================

COMMIT;
