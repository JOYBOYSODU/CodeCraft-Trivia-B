const mysql = require('mysql2/promise');
require('dotenv').config();

async function applySchemaUpdates() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'codecraft'
        });

        console.log('✅ Connected to MySQL');

        const statements = [
            // Add COMPANY role to users
            "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('PLAYER', 'ADMIN', 'COMPANY') NOT NULL DEFAULT 'PLAYER'",
            
            // Create companies table
            `CREATE TABLE IF NOT EXISTS \`companies\` (
              \`id\`               BIGINT        NOT NULL AUTO_INCREMENT,
              \`user_id\`          BIGINT        NOT NULL,
              \`company_name\`     VARCHAR(255)  NOT NULL,
              \`company_email\`    VARCHAR(255)  NOT NULL,
              \`company_website\`  VARCHAR(500)  DEFAULT NULL,
              \`type\`             VARCHAR(100)  DEFAULT NULL,
              \`address\`          TEXT          DEFAULT NULL,
              \`company_size\`     VARCHAR(20)   DEFAULT NULL,
              \`contact_person\`   VARCHAR(255)  DEFAULT NULL,
              \`contact_phone\`    VARCHAR(20)   DEFAULT NULL,
              \`status\`           ENUM('PENDING','APPROVED','REJECTED','SUSPENDED')
                                               NOT NULL DEFAULT 'PENDING',
              \`approved_by\`      BIGINT        DEFAULT NULL,
              \`approved_at\`      DATETIME(6)   DEFAULT NULL,
              \`rejection_reason\` TEXT          DEFAULT NULL,
              \`ai_requests_used\` INT           NOT NULL DEFAULT 0,
              \`ai_requests_limit\` INT          NOT NULL DEFAULT 10,
              \`total_contests\`   INT           NOT NULL DEFAULT 0,
              \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
              \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`uk_companies_user_id\` (\`user_id\`),
              UNIQUE KEY \`uk_companies_email\` (\`company_email\`),
              INDEX \`idx_companies_status\` (\`status\`),
              CONSTRAINT \`fk_companies_user\`
                FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
                ON DELETE CASCADE,
              CONSTRAINT \`fk_companies_approved_by\`
                FOREIGN KEY (\`approved_by\`) REFERENCES \`users\` (\`id\`)
                ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Add missing columns to problem (without IF NOT EXISTS)
            "ALTER TABLE `problem` ADD `constraints` JSON DEFAULT NULL AFTER `description`",
            "ALTER TABLE `problem` ADD `hints` JSON DEFAULT NULL AFTER `constraints`",
            "ALTER TABLE `problem` ADD `example1_input` TEXT DEFAULT NULL AFTER `hints`",
            "ALTER TABLE `problem` ADD `example1_output` TEXT DEFAULT NULL AFTER `example1_input`",
            "ALTER TABLE `problem` ADD `example1_exp` TEXT DEFAULT NULL AFTER `example1_output`",
            "ALTER TABLE `problem` ADD `example2_input` TEXT DEFAULT NULL AFTER `example1_exp`",
            "ALTER TABLE `problem` ADD `example2_output` TEXT DEFAULT NULL AFTER `example2_input`",
            "ALTER TABLE `problem` ADD `example2_exp` TEXT DEFAULT NULL AFTER `example2_output`",
            "ALTER TABLE `problem` ADD `starter_python` LONGTEXT DEFAULT NULL AFTER `example2_exp`",
            "ALTER TABLE `problem` ADD `starter_java` LONGTEXT DEFAULT NULL AFTER `starter_python`",
            "ALTER TABLE `problem` ADD `starter_js` LONGTEXT DEFAULT NULL AFTER `starter_java`",
            "ALTER TABLE `problem` ADD `starter_cpp` LONGTEXT DEFAULT NULL AFTER `starter_js`",
            "ALTER TABLE `problem` ADD `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`",
            "ALTER TABLE `problem` ADD `source_company_id` BIGINT DEFAULT NULL AFTER `is_ai_generated`",
            "ALTER TABLE `problem` ADD INDEX `idx_problems_source_company` (`source_company_id`)",
            
            // Add foreign key for source_company_id
            `ALTER TABLE \`problem\` ADD CONSTRAINT \`fk_problems_source_company\` FOREIGN KEY (\`source_company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE SET NULL`,
            
            // Add missing columns to contest
            "ALTER TABLE `contest` ADD `company_id` BIGINT DEFAULT NULL",
            "ALTER TABLE `contest` ADD `job_role` VARCHAR(255) DEFAULT NULL",
            "ALTER TABLE `contest` ADD `shortlist_count` INT DEFAULT NULL",
            "ALTER TABLE `contest` ADD `min_score` INT NOT NULL DEFAULT 0",
            "ALTER TABLE `contest` ADD `is_ai_generated` TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE `contest` ADD INDEX `idx_contests_company_id` (`company_id`)",
            "ALTER TABLE `contest` ADD INDEX `idx_contest_times` (`start_time`, `end_time`)",
            
            // Add foreign key for company_id
            `ALTER TABLE \`contest\` ADD CONSTRAINT \`fk_contests_company\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE SET NULL`
        ];

        for (const statement of statements) {
            try {
                await connection.execute(statement);
                console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
            } catch (error) {
                // Ignore errors about duplicate constraints/indexes/columns
                if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
                    console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 60)}...`);
                } else {
                    console.error(`❌ Error: ${statement.substring(0, 60)}...`);
                    console.error(error.message);
                }
            }
        }

        console.log('\n✅ Schema updates completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

applySchemaUpdates();

