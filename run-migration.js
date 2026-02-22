const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'codecraft'
        });

        console.log('✅ Connected to MySQL database: codecraft\n');
        console.log('═════════════════════════════════════════════════════════════');
        console.log('   HOSTS → COMPANIES MIGRATION');
        console.log('═════════════════════════════════════════════════════════════\n');

        // Step 1: Update users role ENUM
        console.log('STEP 1: Update users table role ENUM');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(
                `ALTER TABLE \`users\` MODIFY COLUMN \`role\` ENUM('PLAYER', 'ADMIN', 'COMPANY') NOT NULL DEFAULT 'PLAYER'`
            );
            console.log('✅ Updated users.role ENUM: PLAYER, ADMIN, COMPANY\n');
        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Step 2: Rename hosts table to companies
        console.log('STEP 2: Rename table hosts → companies');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(`RENAME TABLE \`hosts\` TO \`companies\``);
            console.log('✅ Renamed table: hosts → companies\n');
        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Step 3: Update companies table indexes and keys
        console.log('STEP 3: Update companies table - indexes and foreign keys');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(`
                ALTER TABLE \`companies\`
                  DROP INDEX \`idx_hosts_status\`,
                  DROP INDEX \`uk_hosts_user_id\`,
                  DROP INDEX \`uk_hosts_company_email\`,
                  DROP FOREIGN KEY \`fk_hosts_user\`,
                  DROP FOREIGN KEY \`fk_hosts_approved_by\`,
                  ADD INDEX \`idx_companies_status\` (\`status\`),
                  ADD UNIQUE KEY \`uk_companies_user_id\` (\`user_id\`),
                  ADD UNIQUE KEY \`uk_companies_email\` (\`company_email\`),
                  ADD CONSTRAINT \`fk_companies_user\`
                    FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
                    ON DELETE CASCADE,
                  ADD CONSTRAINT \`fk_companies_approved_by\`
                    FOREIGN KEY (\`approved_by\`) REFERENCES \`users\` (\`id\`)
                    ON DELETE SET NULL
            `);
            console.log('✅ Updated companies table:');
            console.log('   - Index: idx_hosts_status → idx_companies_status');
            console.log('   - Unique Key: uk_hosts_user_id → uk_companies_user_id');
            console.log('   - Unique Key: uk_hosts_company_email → uk_companies_email');
            console.log('   - Foreign Key: fk_hosts_user → fk_companies_user');
            console.log('   - Foreign Key: fk_hosts_approved_by → fk_companies_approved_by\n');
        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Step 4: Update problems table - rename column and foreign key
        console.log('STEP 4: Update problems table - column and foreign key');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(`
                ALTER TABLE \`problems\`
                  CHANGE COLUMN \`source_host_id\` \`source_company_id\` BIGINT DEFAULT NULL,
                  DROP FOREIGN KEY \`fk_problems_source_host\`,
                  DROP INDEX \`idx_problem_source_host\`,
                  ADD INDEX \`idx_problems_source_company\` (\`source_company_id\`),
                  ADD CONSTRAINT \`fk_problems_source_company\`
                    FOREIGN KEY (\`source_company_id\`)
                    REFERENCES \`companies\` (\`id\`)
                    ON DELETE SET NULL
            `);
            console.log('✅ Updated problems table:');
            console.log('   - Column: source_host_id → source_company_id');
            console.log('   - Index: idx_problem_source_host → idx_problems_source_company');
            console.log('   - Foreign Key: fk_problems_source_host → fk_problems_source_company\n');
        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Step 5: Update contests table - rename column and foreign key
        console.log('STEP 5: Update contests table - column and foreign key');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            await connection.execute(`
                ALTER TABLE \`contests\`
                  CHANGE COLUMN \`host_id\` \`company_id\` BIGINT DEFAULT NULL,
                  DROP FOREIGN KEY \`fk_contests_host\`,
                  DROP INDEX \`idx_contest_host_id\`,
                  ADD INDEX \`idx_contests_company_id\` (\`company_id\`),
                  ADD CONSTRAINT \`fk_contests_company\`
                    FOREIGN KEY (\`company_id\`)
                    REFERENCES \`companies\` (\`id\`)
                    ON DELETE SET NULL
            `);
            console.log('✅ Updated contests table:');
            console.log('   - Column: host_id → company_id');
            console.log('   - Index: idx_contest_host_id → idx_contests_company_id');
            console.log('   - Foreign Key: fk_contests_host → fk_contests_company\n');
        } catch (error) {
            console.log(`⚠️  ${error.message}\n`);
        }

        // Verification
        console.log('\n═════════════════════════════════════════════════════════════');
        console.log('   VERIFICATION');
        console.log('═════════════════════════════════════════════════════════════\n');

        // Check companies table exists
        console.log('VERIFICATION 1: Check companies table');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [companiesTable] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'companies' AND TABLE_SCHEMA = 'codecraft'`
        );
        if (companiesTable.length > 0) {
            console.log('✅ companies table exists\n');
        } else {
            console.log('❌ companies table NOT found\n');
        }

        // Check columns
        console.log('VERIFICATION 2: Check renamed columns');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [companyIdCol] = await connection.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contests' AND COLUMN_NAME = 'company_id'`
        );
        const [sourceCompanyIdCol] = await connection.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'problems' AND COLUMN_NAME = 'source_company_id'`
        );

        if (companyIdCol.length > 0) console.log('✅ contests.company_id exists');
        if (sourceCompanyIdCol.length > 0) console.log('✅ problems.source_company_id exists');
        console.log();

        // Check foreign keys
        console.log('VERIFICATION 3: Check foreign keys');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [fks] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME IN ('companies', 'contests', 'problems') 
            AND TABLE_SCHEMA = 'codecraft'
            AND REFERENCED_TABLE_NAME IN ('companies', 'users')
        `);
        fks.forEach(fk => console.log('✅ ' + fk.CONSTRAINT_NAME));
        console.log();

        // Check role ENUM
        console.log('VERIFICATION 4: Check users role ENUM values');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const [roleCheck] = await connection.execute(
            `SHOW COLUMNS FROM users WHERE Field = 'role'`
        );
        console.log('Role column type:', roleCheck[0].Type);
        console.log();

        console.log('═════════════════════════════════════════════════════════════');
        console.log('   ✅ MIGRATION COMPLETED SUCCESSFULLY');
        console.log('═════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration().then(() => process.exit(0));
