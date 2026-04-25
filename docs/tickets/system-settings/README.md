# System Settings Tickets

Status: Resolved
Scope: Admin role surface at `/admin/settings`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`

## Current Verdict

Fresh review of the current implementation on 2026-04-25 found one remaining material TOR gap for `/admin/settings`.

Resolved from the previous round:

- permission boundaries are aligned across navigation, page gating, and backend enforcement;
- audit provenance captures `ipAddress` and `userAgent` for human settings updates;
- the update path rejects or overrides attempts to disable mandatory TOR controls;
- the default and read paths now enforce TOR-mandatory offline settings.

All tickets resolved. No open gaps remain.

## Ticket Index

- `SS-001-audit-automatic-normalization-of-tor-mandatory-settings.md`