const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseState() {
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
        console.log('   DATABASE STATE CHECK');
        console.log('═════════════════════════════════════════════════════════════\n');

        // Check what tables exist
        console.log('CHECK 1: Existing Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [tables] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'codecraft' AND TABLE_NAME IN ('hosts', 'companies')`
        );
        
        console.log('Found tables:');
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
        console.log();

        const hostsExists = tables.some(t => t.TABLE_NAME === 'hosts');
        const companiesExists = tables.some(t => t.TABLE_NAME === 'companies');

        console.log(`hosts table exists: ${hostsExists ? '✅ YES' : '❌ NO'}`);
        console.log(`companies table exists: ${companiesExists ? '✅ YES' : '❌ NO'}\n`);

        // Check users role enum
        console.log('CHECK 2: Users Role ENUM');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
        const [roleCol] = await connection.execute(
            `SHOW COLUMNS FROM users WHERE Field = 'role'`
        );
        console.log('Role enum values:', roleCol[0].Type);
        console.log();

        // Check foreign keys
        console.log('CHECK 3: Foreign Keys in Database');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [fks] = await connection.execute(`
            SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'codecraft'
            AND (TABLE_NAME IN ('companies', 'hosts', 'contests', 'problems')
                 OR REFERENCED_TABLE_NAME IN ('companies', 'hosts'))
            AND CONSTRAINT_NAME NOT LIKE 'PRIMARY'
        `);
        
        fks.forEach(fk => {
            console.log(`  ${fk.TABLE_NAME} → ${fk.CONSTRAINT_NAME}`);
        });
        console.log();

        // Row counts
        console.log('CHECK 4: Data in Tables');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━');
        if (hostsExists) {
            const [hostCount] = await connection.execute(`SELECT COUNT(*) as count FROM hosts`);
            console.log(`  hosts: ${hostCount[0].count} rows`);
        }
        if (companiesExists) {
            const [companyCount] = await connection.execute(`SELECT COUNT(*) as count FROM companies`);
            console.log(`  companies: ${companyCount[0].count} rows`);
        }
        console.log();

        console.log('═════════════════════════════════════════════════════════════\n');

        // Recommendations
        console.log('RECOMMENDATIONS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (hostsExists && companiesExists) {
            console.log('❌ ISSUE: Both hosts AND companies tables exist!');
            console.log('   This means the migration is incomplete.\n');
            console.log('SOLUTION:');
            console.log('  Option 1: Keep companies (newer), drop hosts');
            console.log('    → Run: node fix-duplicate-tables.js\n');
            console.log('  Option 2: Keep hosts, drop companies');
            console.log('    → Run: node keep-hosts-drop-companies.js\n');
        } else if (hostsExists && !companiesExists) {
            console.log('🔄 MIGRATION NOT YET RUN');
            console.log('   Only hosts table exists, companies does not.\n');
            console.log('SOLUTION:');
            console.log('  → Run: node run-migration.js\n');
        } else if (!hostsExists && companiesExists) {
            console.log('✅ MIGRATION COMPLETE');
            console.log('   companies table exists, hosts has been renamed.\n');
            console.log('VERIFICATION NEEDED:');
            console.log('   → Check foreign keys are all renamed');
            console.log('   → Check role enum includes COMPANY\n');
        } else {
            console.log('❌ ERROR: Neither hosts nor companies table exists!');
            console.log('   Database might be uninitialized.\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkDatabaseState();
