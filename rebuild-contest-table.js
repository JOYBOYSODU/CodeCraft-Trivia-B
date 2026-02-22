const mysql = require('mysql2/promise');
require('dotenv').config();

async function rebuildContestTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'codecraft'
        });

        console.log('✅ Connected to MySQL\n');

        // Fix the contest table by recreating it
        const statements = [
            // Drop dependent foreign keys first
            "ALTER TABLE announcement DROP CONSTRAINT IF EXISTS fk_ann_contest",
            "SET FOREIGN_KEY_CHECKS=0",
            
            // Rename old table
            "ALTER TABLE contest RENAME TO contest_old",
            
            // Create new contest table with all required columns
            `CREATE TABLE contest (
              id BIGINT NOT NULL AUTO_INCREMENT,
              created_by BIGINT NOT NULL,
              problems JSON NOT NULL,
              winner_ids JSON DEFAULT NULL,
              title VARCHAR(255) NOT NULL,
              description TEXT DEFAULT NULL,
              status ENUM('DRAFT', 'UPCOMING', 'LIVE', 'ENDED', 'CANCELLED') DEFAULT 'DRAFT',
              start_time DATETIME NOT NULL,
              end_time DATETIME NOT NULL,
              duration_mins SMALLINT NOT NULL DEFAULT 90,
              is_public BOOLEAN DEFAULT TRUE,
              invite_code VARCHAR(10) DEFAULT NULL,
              participant_count INT DEFAULT 0,
              leaderboard_frozen BOOLEAN DEFAULT FALSE,
              company_id BIGINT DEFAULT NULL,
              job_role VARCHAR(255) DEFAULT NULL,
              shortlist_count INT DEFAULT NULL,
              min_score INT NOT NULL DEFAULT 0,
              is_ai_generated TINYINT(1) NOT NULL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_contest_status (status),
              KEY idx_contest_start (start_time),
              KEY idx_contest_end (end_time),
              KEY idx_contest_created_by (created_by),
              KEY idx_contests_company_id (company_id),
              KEY idx_contest_times (start_time, end_time),
              CONSTRAINT fk_contest_creator_new FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
              CONSTRAINT fk_contests_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Migrate data back
            `INSERT INTO contest (id, created_by, problems, winner_ids, title, description, status, start_time, end_time, duration_mins, is_public, invite_code, participant_count, leaderboard_frozen, created_at, updated_at)
             SELECT id, created_by, problems, winner_ids, title, description, status, start_time, end_time, duration_mins, is_public, invite_code, participant_count, leaderboard_frozen, created_at, updated_at
             FROM contest_old`,
            
            // Drop old table
            "DROP TABLE contest_old",
            
            // Re-add the annotation foreign key
            "ALTER TABLE announcement ADD CONSTRAINT fk_ann_contest FOREIGN KEY (target_contest) REFERENCES contest (id) ON DELETE CASCADE",
            
            "SET FOREIGN_KEY_CHECKS=1"
        ];

        for (const statement of statements) {
            try {
                await connection.execute(statement);
                console.log(`✅ Executed: ${statement.substring(0, 80)}...`);
            } catch (error) {
                console.error(`❌ Error: ${statement.substring(0, 80)}...`);
                console.error(`   ${error.message}\n`);
            }
        }

        console.log('\n✅ Contest table rebuilt successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

rebuildContestTable();

