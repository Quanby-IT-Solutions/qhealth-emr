# [ADM-FE-03] Admin — User Management Pages

**Role:** Admin
**Layer:** Frontend
**Category:** Page Implementation
**Priority:** P0
**Story Refs:** Story 1.2 — Role-Based User Management (USER_STORIES.md §1)
**Flow Refs:** Flow A2 — Create User & Assign Role (RBAC) (USER_FLOWS.md §A2)

## Description

Implement every Wireframe Page from Flow A2: Admin Console Dashboard entry tile, **User Management List**, **Add/Edit User Form** (multi-step: Profile → Role → Permissions), **Role Assignment Page** (matrix of role × module permissions), and the **Activation Confirmation Modal**. Pages are wired to mock data only; live API wiring is in ADM-FE-12.

## Pages to Build

| Page | Route | Purpose |
|------|-------|---------|
| User Management List | `/admin/users` | Searchable table of users with role and status badges |
| Add User Wizard | `/admin/users/new` | Three-step wizard (Profile → Role → Permissions) |
| Edit User | `/admin/users/[id]` | Same wizard, pre-filled |
| Role Assignment Matrix | `/admin/users/roles` | Role × module-permission grid |
| Activation Confirmation Modal | overlay on `/admin/users/new` | Shows email-sent confirmation with temp password indicator |

## Functional Requirements (per Flow A2)

- List page: search by name/email, filter by role, filter by status (Active, Pending Activation, Disabled). Status uses `StatusBadge`.
- Add User wizard step 1 (Profile): Full Name, Email, Department; client-side validation only at this stage.
- Add User wizard step 2 (Role): single-select dropdown of the seventeen TOR roles (TOR §1) plus `Patient/Proxy` and `Break-Glass Clinician`; constrain to the six in-scope roles only when feature flag `ADMIN_RESTRICTED_ROLES` is on.
- Add User wizard step 3 (Permissions): module access matrix with checkbox per module from TOR §2.
- Activation Confirmation Modal: shows generated activation link (placeholder) and temporary password indicator.

## Acceptance Criteria

- [ ] All five pages render at the routes listed above and are accessible from the Admin Shell sidebar.
- [ ] User list supports text search, role filter, and status filter with URL-synced state (Next.js `searchParams`).
- [ ] Wizard navigation: Back/Next/Skip work, validation blocks Next when required fields are missing, completed steps are visually marked.
- [ ] Role × module matrix renders all modules from TOR §2 (ADT, ED, Clinical Documentation, CPOE, Maternal/NBS, Nursing, Problems, Vitals, Lab/Blood Bank, RIS/PACS, OR, Pharmacy, RCM, Telemedicine).
- [ ] Activation Confirmation Modal traps focus, closes on Esc, and announces to screen readers (`role="dialog"`, `aria-labelledby`).
- [ ] Empty, loading, and error states are designed and rendered for the list page.
- [ ] All inputs use shadcn `Form` + `react-hook-form` + Zod; the Zod schema is colocated in the same file as the form per project co-locate rule.
- [ ] No `index.ts` barrel files inside the feature folder.

## Dependencies

- ADM-FE-01 (route map), ADM-FE-02 (design system).

## References

- USER_FLOWS.md §A2 — full step list and wireframe page list.
- USER_STORIES.md §1 Story 1.2 — RBAC requirement.
- TOR §1 — Role definitions; TOR §2 — Module list for permission matrix.
