-- =============================================================================
-- Permission Backfill — Access Governance Slice 5
--
-- Grants view, create, edit, delete on the four new admin modules to every
-- system-default admin role row.
--
-- Handles both historical 'Admin' naming and the current 'Administrator' naming
-- so this migration is safe for both clean installs and legacy environments.
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
  AND r.name IN ('Admin', 'Administrator')
ON CONFLICT DO NOTHING;
