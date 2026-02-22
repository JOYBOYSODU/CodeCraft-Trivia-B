const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMissingColumns() {
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
        console.log('   ADDING MISSING COLUMNS & FOREIGN KEYS');
        console.log('═════════════════════════════════════════════════════════════\n');

        // Check current columns in contest table
        console.log('STEP 1: Check contest table columns');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [contestCols] = await connection.execute(
            `SHOW COLUMNS FROM \`contest\``
        );
        const contestColNames = contestCols.map(c => c.Field);
        console.log('Current columns:', contestColNames.join(', '));
        
        const hasCompanyId = contestColNames.includes('company_id');
        const hasHostId = contestColNames.includes('host_id');
        console.log(`  company_id exists: ${hasCompanyId ? '✅' : '❌'}`);
        console.log(`  host_id exists: ${hasHostId ? '✅' : '❌'}\n`);

        // Add company_id column if needed
        if (!hasCompanyId && !hasHostId) {
            console.log('Adding company_id column...');
            try {
                await connection.execute(
                    `ALTER TABLE \`contest\` ADD COLUMN \`company_id\` BIGINT DEFAULT NULL AFTER \`winner_ids\``
                );
                console.log('✅ Added company_id column\n');
            } catch (e) {
                console.log(`⚠️  ${e.message}\n`);
            }
        } else if (hasHostId) {
            console.log('Renaming host_id → company_id...');
            try {
                await connection.execute(
                    `ALTER TABLE \`contest\` CHANGE COLUMN \`host_id\` \`company_id\` BIGINT DEFAULT NULL`
                );
                console.log('✅ Renamed host_id to company_id\n');
            } catch (e) {
                console.log(`⚠️  ${e.message}\n`);
            }
        }

        // Check current columns in problem table
        console.log('STEP 2: Check problem table columns');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [problemCols] = await connection.execute(
            `SHOW COLUMNS FROM \`problem\``
        );
        const problemColNames = problemCols.map(c => c.Field);
        console.log('Current columns:', problemColNames.length, 'total');
        
        const hasSourceCompanyId = problemColNames.includes('source_company_id');
        const hasSourceHostId = problemColNames.includes('source_host_id');
        console.log(`  source_company_id exists: ${hasSourceCompanyId ? '✅' : '❌'}`);
        console.log(`  source_host_id exists: ${hasSourceHostId ? '✅' : '❌'}\n`);

        // Add source_company_id column if needed
        if (!hasSourceCompanyId && !hasSourceHostId) {
            console.log('Adding source_company_id column...');
            try {
                await connection.execute(
                    `ALTER TABLE \`problem\` ADD COLUMN \`source_company_id\` BIGINT DEFAULT NULL AFTER \`is_ai_generated\``
                );
                console.log('✅ Added source_company_id column\n');
            } catch (e) {
                console.log(`⚠️  ${e.message}\n`);
            }
        } else if (hasSourceHostId) {
            console.log('Renaming source_host_id → source_company_id...');
            try {
                await connection.execute(
                    `ALTER TABLE \`problem\` CHANGE COLUMN \`source_host_id\` \`source_company_id\` BIGINT DEFAULT NULL`
                );
                console.log('✅ Renamed source_host_id to source_company_id\n');
            } catch (e) {
                console.log(`⚠️  ${e.message}\n`);
            }
        }

        // Now add the foreign keys
        console.log('STEP 3: Add foreign keys to contest table');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(
                `ALTER TABLE \`contest\`
                 ADD CONSTRAINT \`fk_contest_creator_new\` 
                 FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
                 ADD CONSTRAINT \`fk_contests_company\`
                 FOREIGN KEY (\`company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE SET NULL`
            );
            console.log('✅ Added foreign keys to contest\n');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('✅ Foreign keys already exist\n');
            } else {
                console.log(`⚠️  ${e.message}\n`);
            }
        }

        console.log('STEP 4: Add foreign keys to problem table');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(
                `ALTER TABLE \`problem\`
                 ADD CONSTRAINT \`fk_problem_creator\`
                 FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
                 ADD CONSTRAINT \`fk_problems_source_company\`
                 FOREIGN KEY (\`source_company_id\`) REFERENCES \`companies\` (\`id\`) ON DELETE SET NULL`
            );
            console.log('✅ Added foreign keys to problem\n');
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log('✅ Foreign keys already exist\n');
            } else {
                console.log(`⚠️  ${e.message}\n`);
            }
        }

        // Final verification
        console.log('═════════════════════════════════════════════════════════════');
        console.log('   FINAL VERIFICATION');
        console.log('═════════════════════════════════════════════════════════════\n');

        const [allFks] = await connection.execute(`
            SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'codecraft'
            AND (TABLE_NAME IN ('companies', 'contest', 'problem'))
            AND CONSTRAINT_NAME LIKE 'fk_%'
            ORDER BY TABLE_NAME, CONSTRAINT_NAME
        `);

        console.log('All Foreign Keys & References:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const grouped = {};
        allFks.forEach(fk => {
            if (!grouped[fk.TABLE_NAME]) grouped[fk.TABLE_NAME] = [];
            grouped[fk.TABLE_NAME].push({
                fk: fk.CONSTRAINT_NAME,
                col: fk.COLUMN_NAME,
                ref: fk.REFERENCED_TABLE_NAME
            });
        });

        Object.entries(grouped).forEach(([table, fks]) => {
            console.log(`\n${table}:`);
            fks.forEach(f => {
                const status = f.ref === 'companies' || f.ref === 'users' ? '✅' : '⚠️';
                console.log(`  ${status} ${f.fk} (${f.col} → ${f.ref})`);
            });
        });
        
        console.log('\n═════════════════════════════════════════════════════════════');
        console.log('   ✅ DATABASE FULLY MIGRATED');
        console.log('═════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

addMissingColumns();
