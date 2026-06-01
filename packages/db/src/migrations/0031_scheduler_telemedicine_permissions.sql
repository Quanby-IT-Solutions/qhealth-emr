-- ============================================================================
-- Migration: Add Telemedicine Permissions to Scheduler Roles
-- Purpose: Enable schedulers to book and update telemedicine appointments
-- Date: 2026-05-22
-- ============================================================================

INSERT INTO "role_permissions" ("role_id", "module", "action", "created_at")
SELECT
	"roles"."id",
	"permissions"."module",
	"permissions"."action",
	now()
FROM "roles"
CROSS JOIN (
	VALUES
		('telemedicine', 'view'),
		('telemedicine', 'create'),
		('telemedicine', 'edit')
) AS "permissions" ("module", "action")
WHERE "roles"."name" = 'Scheduler'
	AND "roles"."is_archived" = false
ON CONFLICT ("role_id", "module", "action") DO NOTHING;
--> statement-breakpoint

DO $$
DECLARE
	affected_roles integer;
BEGIN
	SELECT COUNT(*) INTO affected_roles
	FROM "roles"
	WHERE "name" = 'Scheduler'
		AND "is_archived" = false;

	RAISE NOTICE 'Ensured telemedicine view/create/edit permissions for % active Scheduler role(s)', affected_roles;
END $$;

-- Rollback:
-- DELETE FROM "role_permissions"
-- WHERE "role_id" IN (
-- 	SELECT "id" FROM "roles" WHERE "name" = 'Scheduler'
-- )
-- AND "module" = 'telemedicine'
-- AND "action" IN ('view', 'create', 'edit');
