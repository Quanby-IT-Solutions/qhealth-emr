-- =============================================================================
-- Facility Profile Access Wiring Fix
--
-- Migration 0002 incorrectly targeted role name 'Admin' when the system's
-- default admin role is 'Administrator'. This migration corrects that by
-- ensuring the four admin governance modules are granted to 'Administrator'
-- (and 'Admin' for any legacy environments that use that naming).
--
-- Scope: view, create, edit on facility_profile (and the other three admin
-- modules that 0002 was responsible for) so that the Administrator role can
-- access /admin/facility-profile and the other admin configuration surfaces.
--
-- Idempotent: ON CONFLICT DO NOTHING against the
-- role_permissions_role_module_action_unique unique index.
-- =============================================================================

INSERT INTO role_permissions (id, role_id, module, action, created_at)
SELECT
    gen_random_uuid(),
    r.id,
    m.module,
    a.action,
    NOW()
FROM roles r
CROSS JOIN (
    VALUES
        ('feature_flags'),
        ('system_settings'),
        ('facility_profile'),
        ('integration_registry')
) AS m(module)
CROSS JOIN (
    VALUES
        ('view'),
        ('create'),
        ('edit'),
        ('delete')
) AS a(action)
WHERE r.is_system_default = true
  AND r.name IN ('Admin', 'Administrator')
ON CONFLICT DO NOTHING;
