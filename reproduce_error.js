import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, count, eq, gte, or } from 'drizzle-orm'
import {
  auditLogs, breakGlassEvents, facilityProfiles, featureFlags,
  integrations, staffProfiles, systemSettings, userRoles, facilities
} from './packages/db/dist/schema/index.js'

async function run() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const db = drizzle(client)

  const [facility] = await db.select({ id: facilities.id }).from(facilities).limit(1)
  console.log('facility id:', facility?.id)
  const facilityId = facility?.id ?? ''

  try {
    const [activeRow] = await db.select({ activeCount: count() }).from(staffProfiles).where(and(eq(staffProfiles.facilityId, facilityId), eq(staffProfiles.isActive, true)))
    console.log('activeRow ok:', activeRow)
  } catch (e) { console.error('activeRow ERROR:', e.message) }

  try {
    const allStaffIds = await db.select({ id: staffProfiles.id }).from(staffProfiles).where(eq(staffProfiles.facilityId, facilityId))
    console.log('allStaffIds count:', allStaffIds.length)
  } catch (e) { console.error('allStaffIds ERROR:', e.message) }

  try {
    const assignedStaffIds = await db.select({ staffProfileId: userRoles.staffProfileId }).from(userRoles)
    console.log('assignedStaffIds count:', assignedStaffIds.length)
  } catch (e) { console.error('assignedStaffIds ERROR:', e.message) }

  const thirty = new Date(Date.now() - 30*24*60*60*1000)
  try {
    const recentAudit = await db.select().from(auditLogs).where(and(eq(auditLogs.facilityId, facilityId), gte(auditLogs.createdAt, thirty), or(eq(auditLogs.entityType, 'role_permission'), eq(auditLogs.entityType, 'user_role'), eq(auditLogs.entityType, 'role')))).orderBy(auditLogs.createdAt).limit(5)
    console.log('recentAudit count:', recentAudit.length)
  } catch (e) { console.error('recentAudit ERROR:', e.message) }

  try {
    const flags = await db.select({ id: featureFlags.id, name: featureFlags.name, updatedAt: featureFlags.updatedAt }).from(featureFlags).where(and(eq(featureFlags.riskLevel, 'high'), eq(featureFlags.defaultEnabled, true)))
    console.log('flags ok:', flags.length)
  } catch (e) { console.error('flags ERROR:', e.message) }

  try {
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.facilityId, facilityId))
    console.log('settings ok:', !!settings)
  } catch (e) { console.error('settings ERROR:', e.message) }

  try {
    const [profile] = await db.select().from(facilityProfiles).where(eq(facilityProfiles.facilityId, facilityId))
    console.log('profile ok:', !!profile, 'updatedAt:', profile?.updatedAt)
  } catch (e) { console.error('profile ERROR:', e.message) }

  try {
    const ints = await db.select().from(integrations).where(eq(integrations.facilityId, facilityId))
    console.log('integrations count:', ints.length)
  } catch (e) { console.error('integrations ERROR:', e.message) }

  const seven = new Date(Date.now() - 7*24*60*60*1000)
  try {
    const [bgRow] = await db.select({ breakGlassCount: count() }).from(breakGlassEvents).where(and(eq(breakGlassEvents.facilityId, facilityId), gte(breakGlassEvents.accessGrantedAt, seven)))
    console.log('breakGlass ok:', bgRow)
  } catch (e) { console.error('breakGlass ERROR:', e.message) }

  await client.end()
}

run().catch(console.error)
