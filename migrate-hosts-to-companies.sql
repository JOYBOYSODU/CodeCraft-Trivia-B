-- =============================================================================
-- MIGRATION: Rename Hosts to Companies
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Update users table role ENUM
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('PLAYER', 'ADMIN', 'COMPANY') NOT NULL DEFAULT 'PLAYER';

-- Step 2: Rename hosts table to companies
RENAME TABLE `hosts` TO `companies`;

-- Step 3: Update foreign key names in companies table itself
ALTER TABLE `companies`
  DROP INDEX `idx_hosts_status`,
  DROP INDEX `uk_hosts_user_id`,
  DROP INDEX `uk_hosts_company_email`,
  DROP FOREIGN KEY `fk_hosts_user`,
  DROP FOREIGN KEY `fk_hosts_approved_by`,
  ADD INDEX `idx_companies_status` (`status`),
  ADD UNIQUE KEY `uk_companies_user_id` (`user_id`),
  ADD UNIQUE KEY `uk_companies_email` (`company_email`),
  ADD CONSTRAINT `fk_companies_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  ADD CONSTRAINT `fk_companies_approved_by`
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL;

-- Step 4: Update problems table - rename column and foreign key
ALTER TABLE `problems`
  CHANGE COLUMN `source_host_id` `source_company_id` BIGINT DEFAULT NULL,
  DROP FOREIGN KEY `fk_problems_source_host`,
  DROP INDEX `idx_problem_source_host`,
  ADD INDEX `idx_problems_source_company` (`source_company_id`),
  ADD CONSTRAINT `fk_problems_source_company`
    FOREIGN KEY (`source_company_id`)
    REFERENCES `companies` (`id`)
    ON DELETE SET NULL;

-- Step 5: Update contests table - rename column and foreign key
ALTER TABLE `contests`
  CHANGE COLUMN `host_id` `company_id` BIGINT DEFAULT NULL,
  DROP FOREIGN KEY `fk_contests_host`,
  DROP INDEX `idx_contest_host_id`,
  ADD INDEX `idx_contests_company_id` (`company_id`),
  ADD CONSTRAINT `fk_contests_company`
    FOREIGN KEY (`company_id`)
    REFERENCES `companies` (`id`)
    ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify the migration was successful:
-- SELECT * FROM companies LIMIT 1;
-- SELECT * FROM problems WHERE source_company_id IS NOT NULL LIMIT 1;
-- SELECT * FROM contests WHERE company_id IS NOT NULL LIMIT 1;
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'companies';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
