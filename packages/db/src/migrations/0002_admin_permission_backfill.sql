-- =============================================================================
-- Permission Backfill — Access Governance Slice 5
--
-- Grants view, create, edit, delete on the four new admin modules to every
-- roles row where isSystemDefault = true AND name = 'Admin'.
--
-- Idempotent: uses ON CONFLICT DO NOTHING against the
-- role_permissions_role_module_action_unique index.
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
  AND r.name = 'Admin'
ON CONFLICT DO NOTHING;
