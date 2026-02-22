-- Migration: Add player_goals table for goal tracking system
-- Created: 2026-02-22

CREATE TABLE IF NOT EXISTS `player_goals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `player_id` BIGINT NOT NULL,
    `weekly_target` SMALLINT DEFAULT 0,
    `daily_target` SMALLINT DEFAULT 0,
    `difficulty_focus` ENUM('EASY', 'MEDIUM', 'HARD', 'MIXED') DEFAULT 'MIXED',
    `weak_areas` JSON DEFAULT NULL,
    `strong_areas` JSON DEFAULT NULL,
    `custom_goals` JSON DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_player_goals` (`player_id`),
    CONSTRAINT `fk_goals_player` FOREIGN KEY (`player_id`) REFERENCES `player` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster lookups
CREATE INDEX `idx_goals_player` ON `player_goals` (`player_id`);
