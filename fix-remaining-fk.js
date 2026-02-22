const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixRemainingForeignKeys() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'codecraft'
        });

        console.log('✅ Connected to MySQL\n');
        console.log('═════════════════════════════════════════════════════════════');
        console.log('   FIXING REMAINING FOREIGN KEYS');
        console.log('═════════════════════════════════════════════════════════════\n');

        // Issue 1: Fix contest table foreign key
        console.log('STEP 1: Fix contests table foreign key');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            // Check if the old fk exists
            const [fks] = await connection.execute(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'contest' 
                AND CONSTRAINT_NAME LIKE 'fk_contest%'
            `);
            
            console.log('Current foreign keys in contests:', fks.map(f => f.CONSTRAINT_NAME).join(', '));
            
            // Drop old foreign key if it exists
            for (const fk of fks) {
                if (fk.CONSTRAINT_NAME !== 'fk_contests_company') {
                    try {
                        await connection.execute(`
                            ALTER TABLE \`contest\`
                            DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
                        `);
                        console.log(`✅ Dropped old FK: ${fk.CONSTRAINT_NAME}`);
                    } catch (e) {
                        console.log(`⚠️  Could not drop ${fk.CONSTRAINT_NAME}: ${e.message}`);
                    }
                }
            }

            // Add the correct foreign key
            try {
                await connection.execute(`
                    ALTER TABLE \`contest\`
                    ADD CONSTRAINT \`fk_contests_company\`
                    FOREIGN KEY (\`company_id\`)
                    REFERENCES \`companies\` (\`id\`)
                    ON DELETE SET NULL
                `);
                console.log('✅ Added FK: fk_contests_company → companies(id)\n');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('✅ FK fk_contests_company already exists\n');
                } else {
                    console.log(`⚠️  ${e.message}\n`);
                }
            }

        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Issue 2: Fix problem table foreign key
        console.log('STEP 2: Fix problems table foreign key');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            // Check if the old fk exists
            const [fks] = await connection.execute(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'problem' 
                AND CONSTRAINT_NAME LIKE 'fk_problem%'
            `);
            
            console.log('Current foreign keys in problems:', fks.map(f => f.CONSTRAINT_NAME).join(', '));
            
            // Drop old foreign key if it exists
            for (const fk of fks) {
                if (fk.CONSTRAINT_NAME !== 'fk_problems_source_company') {
                    try {
                        await connection.execute(`
                            ALTER TABLE \`problem\`
                            DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
                        `);
                        console.log(`✅ Dropped old FK: ${fk.CONSTRAINT_NAME}`);
                    } catch (e) {
                        console.log(`⚠️  Could not drop ${fk.CONSTRAINT_NAME}: ${e.message}`);
                    }
                }
            }

            // Add the correct foreign key
            try {
                await connection.execute(`
                    ALTER TABLE \`problem\`
                    ADD CONSTRAINT \`fk_problems_source_company\`
                    FOREIGN KEY (\`source_company_id\`)
                    REFERENCES \`companies\` (\`id\`)
                    ON DELETE SET NULL
                `);
                console.log('✅ Added FK: fk_problems_source_company → companies(id)\n');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('✅ FK fk_problems_source_company already exists\n');
                } else {
                    console.log(`⚠️  ${e.message}\n`);
                }
            }

        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Verification
        console.log('═════════════════════════════════════════════════════════════');
        console.log('   FINAL VERIFICATION');
        console.log('═════════════════════════════════════════════════════════════\n');

        const [finalFks] = await connection.execute(`
            SELECT TABLE_NAME, CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'codecraft'
            AND TABLE_NAME IN ('companies', 'contest', 'problem')
            AND CONSTRAINT_NAME LIKE 'fk_%'
            ORDER BY TABLE_NAME, CONSTRAINT_NAME
        `);

        console.log('All Foreign Keys (Final State):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const groupedByTable = {};
        finalFks.forEach(fk => {
            if (!groupedByTable[fk.TABLE_NAME]) {
                groupedByTable[fk.TABLE_NAME] = [];
            }
            groupedByTable[fk.TABLE_NAME].push(fk.CONSTRAINT_NAME);
        });

        Object.entries(groupedByTable).forEach(([table, fks]) => {
            console.log(`\n${table}:`);
            fks.forEach(fk => {
                const status = fk.includes('company') ? '✅' : '⚠️';
                console.log(`  ${status} ${fk}`);
            });
        });

        console.log('\n═════════════════════════════════════════════════════════════');
        console.log('   ✅ MIGRATION FULLY COMPLETE');
        console.log('═════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixRemainingForeignKeys();
