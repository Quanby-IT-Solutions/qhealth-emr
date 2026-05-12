# Auditor Module — Route Map

| Route | Page | Story | Flow | Wireframe Page |
|-------|------|-------|------|----------------|
| `/auditor/audit-log` | Audit Log Dashboard | Story 1.6 — Audit Trail Review | Flow A6 | Audit Log Dashboard |
| `/auditor/audit-log/[eventId]` | Audit Event Detail | Story 1.6 — Audit Trail Review | Flow A6 | Audit Detail Page |
| `/auditor/break-glass` | Break-Glass Inbox | Story 1.6 — Audit Trail Review (break-glass branch) | Flow A6 (break-glass section) | Break-Glass Inbox |
| `/auditor/break-glass/[eventId]` | Break-Glass Audit Report | Story 1.6 — Audit Trail Review (break-glass branch) | Flow A6 (break-glass section), Flow A5 (context) | Break-Glass Audit Report Page |

## Feature Structure

```
apps/web/features/auditor/
├── ROUTES.md                         — this file
├── audit-log/
│   ├── api/
│   │   └── audit-log.hooks.ts        — TanStack Query hooks for audit log
│   ├── components/
│   │   ├── auditor-shell.tsx         — Auditor layout shell with read-only banner
│   │   ├── audit-log-table.tsx       — Dashboard table with filters + pagination
│   │   ├── audit-detail.tsx          — Detail view with diff (FE-02)
│   │   └── export-modal.tsx          — CSV/PDF export modal
│   └── lib/
│       └── audit-log.utils.ts        — Color tokens, formatters
└── break-glass-review/
    ├── api/
    │   └── break-glass.hooks.ts      — TanStack Query hooks for break-glass
    ├── components/
    │   ├── break-glass-inbox.tsx     — Inbox table with SLA aging chips
    │   ├── break-glass-report.tsx    — Full event report page (FE-03)
    │   ├── add-note-drawer.tsx       — Add Note drawer (FE-03)
    │   └── investigation-flag-drawer.tsx — Flag drawer (FE-03)
    └── lib/
        └── break-glass.utils.ts      — SLA helpers, status colors
```

## RBAC

All routes require `audit:view` permission. Review actions (`approve`, `flag`, `addNote`) require `audit:view` permission (write path on break-glass review).

## Notes

- All pages render inside `AuditorShell` layout which shows the read-only banner.
- Old routes `/audit` and `/audit/break-glass` redirect to `/auditor/audit-log` and `/auditor/break-glass` respectively.
