# [SCH-BE-01] Scheduler Telemedicine Permissions — Database Migration

**Role:** Scheduler
**Layer:** Backend (Database)
**Category:** RBAC & Permissions
**Priority:** P0 (Blocking)
**Story Refs:** User Flow M2, N1
**Flow Refs:** Section M — Scheduling & Appointments, Section N — Telemedicine

## Description

Create a database migration to grant telemedicine module permissions to existing Scheduler roles. This enables schedulers to book telemedicine appointments while maintaining separation between administrative (booking) and clinical (treatment) actions.

## Context

**Current Gap:**

- User Flow M2 states schedulers book appointments including telemedicine
- User Flow N1 shows physicians open "scheduled telemedicine appointments"
- Current RBAC: Only physicians have `telemedicine` module permissions
- Result: Schedulers cannot book telemedicine appointments

**Solution:**
Add limited telemedicine permissions to Scheduler roles:

- ✅ `telemedicine:view` - View appointments
- ✅ `telemedicine:create` - Book appointments
- ✅ `telemedicine:edit` - Reschedule/update
- ❌ NO `sign` - Clinical action (physician only)
- ❌ NO `delete` - Clinical action (physician only)

## Migration File

**Path:** `packages/db/src/migrations/0031_scheduler_telemedicine_permissions.sql`

## SQL Implementation

```sql
-- ============================================================================
-- Migration: Add Telemedicine Permissions to Scheduler Roles
-- Purpose: Enable schedulers to book telemedicine appointments
-- Date: 2026-05-22
-- ============================================================================

-- Add telemedicine:view permission to all active Scheduler roles
INSERT INTO role_permissions (role_id, module, action, created_at)
SELECT
    r.id,
    'telemedicine',
    'view',
    NOW()
FROM roles r
WHERE r.name = 'Scheduler'
  AND r.is_archived = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.module = 'telemedicine'
      AND rp.action = 'view'
  );

-- Add telemedicine:create permission to all active Scheduler roles
INSERT INTO role_permissions (role_id, module, action, created_at)
SELECT
    r.id,
    'telemedicine',
    'create',
    NOW()
FROM roles r
WHERE r.name = 'Scheduler'
  AND r.is_archived = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.module = 'telemedicine'
      AND rp.action = 'create'
  );

-- Add telemedicine:edit permission to all active Scheduler roles
INSERT INTO role_permissions (role_id, module, action, created_at)
SELECT
    r.id,
    'telemedicine',
    'edit',
    NOW()
FROM roles r
WHERE r.name = 'Scheduler'
  AND r.is_archived = false
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.module = 'telemedicine'
      AND rp.action = 'edit'
  );

-- Log migration completion
DO $$
DECLARE
    affected_roles INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_roles
    FROM roles r
    WHERE r.name = 'Scheduler' AND r.is_archived = false;

    RAISE NOTICE 'Added telemedicine permissions to % Scheduler role(s)', affected_roles;
END $$;
```

## Rollback SQL

```sql
-- ============================================================================
-- Rollback: Remove Telemedicine Permissions from Scheduler Roles
-- ============================================================================

DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM roles WHERE name = 'Scheduler'
)
AND module = 'telemedicine'
AND action IN ('view', 'create', 'edit');

-- Log rollback completion
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Removed % telemedicine permission(s) from Scheduler roles', affected_rows;
END $$;
```

## Testing Queries

```sql
-- Verify permissions were added
SELECT
    r.name AS role_name,
    r.facility_id,
    rp.module,
    rp.action,
    rp.created_at
FROM roles r
INNER JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'Scheduler'
  AND rp.module = 'telemedicine'
ORDER BY r.facility_id, rp.action;

-- Count affected roles
SELECT
    COUNT(DISTINCT r.id) AS scheduler_roles_updated
FROM roles r
INNER JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'Scheduler'
  AND rp.module = 'telemedicine';

-- Verify no sign/delete permissions were added (should return 0)
SELECT COUNT(*)
FROM roles r
INNER JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'Scheduler'
  AND rp.module = 'telemedicine'
  AND rp.action IN ('sign', 'delete');
```

## Acceptance Criteria

- [ ] Migration file created at correct path
- [ ] SQL runs without errors in development environment
- [ ] All active Scheduler roles receive exactly 3 new permissions (view, create, edit)
- [ ] No Scheduler roles receive sign or delete permissions
- [ ] Idempotent: Running migration multiple times doesn't create duplicates
- [ ] Rollback SQL successfully removes all added permissions
- [ ] Testing queries confirm expected state
- [ ] Migration logged in migration history table

## Dependencies

**Requires:**

- Existing `roles` table with Scheduler roles
- Existing `role_permissions` table
- RBAC schema from `packages/db/src/schema/rbac.ts`

**Blocks:**

- SCH-BE-02 (Backend validation logic)
- SCH-FE-01 (Frontend telemedicine booking UI)

## Notes

- This migration is **idempotent** - safe to run multiple times
- Uses `NOT EXISTS` to prevent duplicate permissions
- Only affects active (non-archived) Scheduler roles
- Preserves all existing permissions
- Does not modify physician or other role permissions
- Migration number (0031) may need adjustment based on latest migration

## Verification Steps

1. Run migration in development:

   ```bash
   cd packages/db
   pnpm db:migrate
   ```

2. Execute testing queries to verify permissions

3. Test in staging environment before production

4. Monitor for any permission-related errors in application logs

5. Verify schedulers can access telemedicine endpoints (after SCH-BE-02)
