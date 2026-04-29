# Integration Registry Admin Audit

Status: Clear
Last Reviewed: 2026-04-28
Scope: System Admin access to `/admin/integration-registry`
Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`

## Summary

The current admin integration-registry workspace is materially aligned with the TOR for the reviewed System Admin scope.

## Active Tickets

None. The latest TOR-backed audit did not find any new material compliance gaps for `/admin/integration-registry`.

## Notes

- CRUD, connectivity testing, and enablement behavior are permission-guarded and facility-scoped.
- Sensitive registry reads and mutations are audited.
- NHDR and PIDSR supporting runtime paths now honor the registry configuration in the areas previously tracked by INTREG-013, INTREG-014, and INTREG-015.
- Civil Registry remains covered by its dedicated admin module, not this registry surface.