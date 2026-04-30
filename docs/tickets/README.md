# EMR Ticket Backlog

Tickets organized by role and layer. Source-of-truth documents:

- [MASTER_EMR_TERMS_OF_REFERENCE.md](../MASTER_EMR_TERMS_OF_REFERENCE.md) — Sections referenced as `TOR §N.M`
- [USER_FLOWS.md](../USER_FLOWS.md) — Flows referenced as `Flow X1`, `Flow A1`, etc.
- [USER_STORIES.md](../USER_STORIES.md) — Stories referenced as `Story 1.2`, `Story 12.1`, etc.

## Roles in Scope

Only the six roles below are covered. All other roles defined in the TOR (Registrar, Triage, Physician, Surgeon, Anesthesiologist, Nurse, Dietitian, Pharmacist, Lab Tech, Radiologist, Blood Bank, Scheduler, Patient/Proxy, Break-Glass Clinician) are out of scope for this batch.

| Role | Stories Covered | Folder |
|------|-----------------|--------|
| Admin | 1.2, 1.3, 1.4, 2.5, 17.1, 17.2, 19.1, 19.2, 20.1, 20.2, 20.3 | `admin/` |
| Billing Officer | 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7 | `billing-officer/` |
| Social Worker | 12.8, 12.9, 12.10, 12.11 | `social-worker/` |
| HIM Coder | 15.1, 15.2, 15.3, 15.4 | `him-coder/` |
| Surveillance | 16.1, 16.2, 16.3 | `surveillance/` |
| Auditor | 1.6 | `auditor/` |
| **Shared (auth)** | **1.1** | **`_shared/`** |

The `_shared/` folder contains role-agnostic tickets (e.g., login, 2FA, password reset) that every in-scope role consumes.

## Ticket Categories

1. **Planning & Architecture** — Module breakdown, route map, state plan, schema/contract scaffolding.
2. **Frontend Design & UI/UX** — Wireframe-to-design, component library decisions, accessibility, responsive rules.
3. **Page Implementation** — Build the pages enumerated in USER_FLOWS.md per story.
4. **Integration & API Connectivity** — Wire pages to oRPC contracts, TanStack Query hooks, server actions.

## Conventions

- Ticket IDs follow `<ROLE>-<LAYER>-<NN>` (e.g., `ADM-FE-04`, `BIL-BE-02`).
- Frontend and backend tasks are never combined in the same ticket.
- DevOps and deployment are excluded from this backlog (use the ops backlog).
- Each ticket cites the exact section of the TOR / Flow / Story that drives it.
- Acceptance criteria are explicit and verifiable.

## Folder Layout

```
tickets/
├── _shared/
│   └── frontend/
│       └── AUTH-FE-01-authentication-pages.md
├── admin/
│   ├── frontend/
│   └── backend/
├── billing-officer/
│   ├── frontend/
│   └── backend/
├── social-worker/
│   ├── frontend/
│   └── backend/
├── him-coder/
│   ├── frontend/
│   └── backend/
├── surveillance/
│   ├── frontend/
│   └── backend/
└── auditor/
    ├── frontend/
    └── backend/
```

## Inventory

| Role | FE | BE |
|------|----|----|
| Shared (auth) | 1 | 0 (auth backend lives in ADM-BE-02) |
| Admin | 12 | 12 |
| Billing Officer | 10 | 8 |
| Social Worker | 6 | 5 |
| HIM Coder | 6 | 5 |
| Surveillance | 5 | 4 |
| Auditor | 4 | 3 |
| **Total** | **44** | **37** |
| **Grand total** | **81 tickets + 1 README = 82 ticket files** | |
