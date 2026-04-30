-- =============================================================================
-- TOR-Mandatory System Settings Backfill
--
-- Corrects any existing facility rows in system_settings where one or more
-- TOR-mandatory boolean controls were persisted as false.  These controls
-- are required to be true by the Terms of Reference (Sections 4.2, 4.3, 6,
-- and the Flow-5 offline-capability requirement):
--
--   · break_glass_requires_reason       (TOR §4.2 emergency-access audit trail)
--   · auto_freeze_charges_on_discharge  (TOR §6 revenue-cycle integrity)
--   · require_dpa_consent_before_export (TOR §4.2 DPA/privacy compliance)
--   · enable_offline_summary_cache      (TOR Flow-5 offline continuity)
--
-- The DB-column DEFAULT for each of these was corrected to TRUE in a prior
-- schema change, so all rows created after that migration are already
-- compliant.  This migration addresses legacy rows provisioned before the
-- default correction.
--
-- Idempotent: the WHERE clause limits the UPDATE to non-compliant rows only,
-- so re-running this migration is safe.
--
-- Audit note: this migration is the authoritative record of this one-time
-- correction.  It is tracked in source control, code-reviewed, and
-- timestamped by the migration runner.  No additional audit_logs row is
-- written here because the audit_logs table requires a real user FK, which
-- does not apply to system-level schema corrections.  The runtime
-- SystemSettingsService.get() path no longer mutates rows, so all future
-- configuration changes will carry a proper human-actor audit entry via
-- the update() path.
-- =============================================================================

UPDATE system_settings
SET
    break_glass_requires_reason       = true,
    auto_freeze_charges_on_discharge  = true,
    require_dpa_consent_before_export = true,
    enable_offline_summary_cache      = true,
    updated_at                        = NOW()
WHERE
    break_glass_requires_reason       = false
    OR auto_freeze_charges_on_discharge  = false
    OR require_dpa_consent_before_export = false
    OR enable_offline_summary_cache      = false;
