import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import { eq, and, count } from 'drizzle-orm';

const DATABASE_URL = 'postgres://postgres:123123@localhost:5432/qhealth-emr';

const facilities = pgTable('facilities', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
});

const staffProfiles = pgTable('staff_profiles', {
    id: uuid('id').primaryKey(),
    facilityId: uuid('facility_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
});

const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey(),
});

const facilityProfiles = pgTable('facility_profiles', {
    facilityId: uuid('facility_id').primaryKey(),
    updatedAt: timestamp('updated_at'),
});

async function main() {
    const client = new Client({ connectionString: DATABASE_URL });
    try {
        await client.connect();
    } catch (e) {
        console.error('Connection failed:', e.message);
        return;
    }
    const db = drizzle(client);

    try {
        const result = await client.query('SELECT id FROM facilities LIMIT 1');
        const facilityId = result.rows[0]?.id;

        if (!facilityId) {
            console.log('No facility found');
            return;
        }

        const staffRes = await client.query('SELECT count(*)::int as value FROM staff_profiles WHERE facility_id =  AND is_active = true', [facilityId]);
        const staffCount = staffRes.rows[0].value;
        console.log('staff_profiles_active: ' + staffCount + ' (' + typeof staffCount + ')');

        const auditRes = await client.query('SELECT count(*)::int as value FROM audit_logs');
        const auditCount = auditRes.rows[0].value;
        console.log('audit_logs_count: ' + auditCount + ' (' + typeof auditCount + ')');

        const profileRes = await client.query('SELECT updated_at FROM facility_profiles WHERE facility_id = ', [facilityId]);
        const updatedAt = profileRes.rows[0]?.updated_at;
        
        if (updatedAt !== undefined) {
            console.log('facility_profiles_updatedAt: ' + updatedAt + ' (' + typeof updatedAt + ')');
        } else {
            console.log('facility_profiles_updatedAt: not found');
        }

    } catch (err) {
        console.error(err.message);
    } finally {
        await client.end();
    }
}

main();
