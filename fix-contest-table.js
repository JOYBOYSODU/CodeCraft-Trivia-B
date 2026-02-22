const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixContestTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'codecraft'
        });

        console.log('✅ Connected to MySQL\n');

        // Try direct ADD COLUMN without referencing timestamp columns
        const fixes = [
            "SET FOREIGN_KEY_CHECKS=0",
            
            // Add columns one by one with proper syntax
            "ALTER TABLE contest ADD COLUMN company_id BIGINT",
            "ALTER TABLE contest ADD COLUMN job_role VARCHAR(255)",
            "ALTER TABLE contest ADD COLUMN shortlist_count INT",
            "ALTER TABLE contest ADD COLUMN min_score INT DEFAULT 0",
            "ALTER TABLE contest ADD COLUMN is_ai_generated TINYINT(1) DEFAULT 0",
            
            // Add indexes
            "ALTER TABLE contest ADD INDEX idx_contests_company_id (company_id)",
            
            // Drop old constraint if exists, then add new one
            "ALTER TABLE contest DROP CONSTRAINT IF EXISTS fk_contests_company",
            "ALTER TABLE contest ADD CONSTRAINT fk_contests_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL",
            
            "SET FOREIGN_KEY_CHECKS=1"
        ];

        for (const statement of fixes) {
            try {
                await connection.execute(statement);
                console.log(`✅ Executed: ${statement}`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists') || error.message.includes('Duplicate')) {
                    console.log(`⚠️  Skipped: ${statement}`);
                } else {
                    console.error(`❌ Error: ${statement}`);
                    console.error(`   ${error.message}\n`);
                }
            }
        }

        console.log('\n✅ Contest table updates completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

fixContestTable();
