// Migration script to create player_goals table
require('dotenv').config();
const db = require('./src/config/db');

async function runMigration() {
    try {
        console.log('🔄 Running player_goals migration...');

        // Create player_goals table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS player_goals (
                id BIGINT NOT NULL AUTO_INCREMENT,
                player_id BIGINT NOT NULL,
                weekly_target SMALLINT DEFAULT 0,
                daily_target SMALLINT DEFAULT 0,
                difficulty_focus ENUM('EASY', 'MEDIUM', 'HARD', 'MIXED') DEFAULT 'MIXED',
                weak_areas JSON DEFAULT NULL,
                strong_areas JSON DEFAULT NULL,
                custom_goals JSON DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY unique_player_goals (player_id),
                CONSTRAINT fk_goals_player FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ player_goals table created successfully');

        // Create index (try-catch for if it already exists)
        try {
            await db.execute(`
                CREATE INDEX idx_goals_player ON player_goals (player_id)
            `);
            console.log('✅ Index created successfully');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️  Index already exists, skipping...');
            } else {
                throw err;
            }
        }

        console.log('✅ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
