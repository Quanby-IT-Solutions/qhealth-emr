# System Settings Tickets

Status: Closed
Scope: Admin-role system configuration surface at `/admin/settings`
TOR Reference: `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
Last Reviewed: 2026-04-26

## Current Verdict

Fresh repo-backed re-audit of the current `/admin/settings` implementation finds no remaining material TOR gaps.

What is aligned now:

- the page is permission-gated for `admin:view` plus `system_settings:view`;
- edits are restricted to `system_settings:edit` in both the page flow and the backend controller;
- TOR-mandatory controls remain locked on in the UI, rejected by the contract if disabled, and re-enforced in the backend update path;
- system settings audit visibility aligns with the writer and the governance readers again;
- offline continuity is now wired into a clinician-facing patient search workflow with reconnect refresh behavior;
- the settings surface remains administrative and does not expose clinical write actions.

## Ticket Index

No open tickets.

## Conclusion

`/admin/settings` is currently TOR-aligned for the reviewed admin-role scope. No new system-settings tickets are required from this re-audit.