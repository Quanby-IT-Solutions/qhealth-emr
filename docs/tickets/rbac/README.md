# RBAC Tickets

Fresh audit date: 2026-04-25

Current status:

- Zero remaining RBAC alignment gaps in the reviewed TOR scope

Resolved tickets:

- `RBAC-001` - Align HIM dashboard permission boundaries with TOR roles
- `RBAC-002` - Assign surgical case creation to the correct TOR-authorized role
- `RBAC-003` - Gate surgical encounter write controls for view-only roles

These three items have been implemented and re-audited cleanly. The RBAC layer is materially aligned with the current TOR review scope, so follow-on work should move to page-level or module-level gap analysis.