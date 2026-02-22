-- =============================================================================
-- CODECRAFT SCHEMA UPDATES
-- Add missing tables and modify existing ones
-- =============================================================================

-- Step 1: Update role ENUM in users table
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('PLAYER', 'ADMIN', 'COMPANY') NOT NULL DEFAULT 'PLAYER';

-- Step 2: Create companies table (if not exists)
CREATE TABLE IF NOT EXISTS `companies` (
  `id`               BIGINT        NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT        NOT NULL,
  `company_name`     VARCHAR(255)  NOT NULL,
  `company_email`    VARCHAR(255)  NOT NULL,
  `company_website`  VARCHAR(500)  DEFAULT NULL,
  `type`             VARCHAR(100)  DEFAULT NULL,
  `address`          TEXT          DEFAULT NULL,
  `company_size`     VARCHAR(20)   DEFAULT NULL,
  `contact_person`   VARCHAR(255)  DEFAULT NULL,
  `contact_phone`    VARCHAR(20)   DEFAULT NULL,
  `status`           ENUM('PENDING','APPROVED','REJECTED','SUSPENDED')
                                   NOT NULL DEFAULT 'PENDING',
  `approved_by`      BIGINT        DEFAULT NULL,
  `approved_at`      DATETIME(6)   DEFAULT NULL,
  `rejection_reason` TEXT          DEFAULT NULL,
  `ai_requests_used` INT           NOT NULL DEFAULT 0,
  `ai_requests_limit` INT          NOT NULL DEFAULT 10,
  `total_contests`   INT           NOT NULL DEFAULT 0,
  `created_at`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_companies_user_id` (`user_id`),
  UNIQUE KEY `uk_companies_email` (`company_email`),
  INDEX `idx_companies_status` (`status`),
  CONSTRAINT `fk_companies_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_companies_approved_by`
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add missing columns to problem table
ALTER TABLE `problem`
ADD COLUMN IF NOT EXISTS `constraints` JSON DEFAULT NULL AFTER `description`,
ADD COLUMN IF NOT EXISTS `hints` JSON DEFAULT NULL AFTER `constraints`,
ADD COLUMN IF NOT EXISTS `example1_input` TEXT DEFAULT NULL AFTER `hints`,
ADD COLUMN IF NOT EXISTS `example1_output` TEXT DEFAULT NULL AFTER `example1_input`,
ADD COLUMN IF NOT EXISTS `example1_exp` TEXT DEFAULT NULL AFTER `example1_output`,
ADD COLUMN IF NOT EXISTS `example2_input` TEXT DEFAULT NULL AFTER `example1_exp`,
ADD COLUMN IF NOT EXISTS `example2_output` TEXT DEFAULT NULL AFTER `example2_input`,
ADD COLUMN IF NOT EXISTS `example2_exp` TEXT DEFAULT NULL AFTER `example2_output`,
ADD COLUMN IF NOT EXISTS `starter_python` LONGTEXT DEFAULT NULL AFTER `example2_exp`,
ADD COLUMN IF NOT EXISTS `starter_java` LONGTEXT DEFAULT NULL AFTER `starter_python`,
ADD COLUMN IF NOT EXISTS `starter_js` LONGTEXT DEFAULT NULL AFTER `starter_java`,
ADD COLUMN IF NOT EXISTS `starter_cpp` LONGTEXT DEFAULT NULL AFTER `starter_js`,
ADD COLUMN IF NOT EXISTS `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`,
ADD COLUMN IF NOT EXISTS `source_company_id` BIGINT DEFAULT NULL AFTER `is_ai_generated`,
MODIFY COLUMN `description` LONGTEXT NOT NULL,
ADD INDEX IF NOT EXISTS `idx_problems_source_company` (`source_company_id`);

-- Add foreign key for source_company_id
ALTER TABLE `problem`
ADD CONSTRAINT `fk_problems_source_company` 
FOREIGN KEY (`source_company_id`) 
REFERENCES `companies` (`id`) 
ON DELETE SET NULL;

-- Step 4: Add missing columns to contest table
ALTER TABLE `contest`
ADD COLUMN IF NOT EXISTS `company_id` BIGINT DEFAULT NULL AFTER `winner_ids`,
ADD COLUMN IF NOT EXISTS `job_role` VARCHAR(255) DEFAULT NULL AFTER `company_id`,
ADD COLUMN IF NOT EXISTS `shortlist_count` INT DEFAULT NULL AFTER `job_role`,
ADD COLUMN IF NOT EXISTS `min_score` INT NOT NULL DEFAULT 0 AFTER `shortlist_count`,
ADD COLUMN IF NOT EXISTS `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `leaderboard_frozen`,
MODIFY COLUMN `start_time` DATETIME(6) NOT NULL,
MODIFY COLUMN `end_time` DATETIME(6) NOT NULL,
ADD INDEX IF NOT EXISTS `idx_contests_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_contest_times` (`start_time`, `end_time`);

-- Add foreign key for company_id
ALTER TABLE `contest`
ADD CONSTRAINT `fk_contests_company` 
FOREIGN KEY (`company_id`) 
REFERENCES `companies` (`id`) 
ON DELETE SET NULL;

-- =============================================================================
-- END OF SCHEMA UPDATES
-- =============================================================================
