# Encounter Creation Tickets

**Feature:** Encounter creation tied to patient MRN (OPD / ER / IPD) with electronic DPA consent capture.
**Stories:** 2.2 | **Flow:** B2

---

## Status

| Ticket | Title | Status |
|--------|-------|--------|
| ENC-BE-001 | Create Encounter API | Open |
| ENC-BE-002 | DPA Consent Validation | Open |
| ENC-BE-003 | Queue Number Auto-Assignment | Open |
| ENC-FE-001 | Encounter Creation Page (Tabbed) | Open |
| ENC-FE-002 | Electronic Consent Capture Modal | Open |
| ENC-FE-003 | Encounter List Page | Open |

---

## Acceptance Criteria (Feature-Level)

- [ ] Encounter cannot be created without electronic DPA consent captured
- [ ] Encounter ID is auto-generated (UUID) and unique per facility
- [ ] Queue number is clinic-specific and resets daily (OPD only)
- [ ] Encounter appears in the clinic queue immediately after creation
- [ ] All three encounter types (OPD, ER, IPD) are supported with appropriate field sets

---

## Backend Tickets

- [`ENC-BE-001`](./backend/ENC-BE-001.md) — Create Encounter API
- [`ENC-BE-002`](./backend/ENC-BE-002.md) — DPA Consent Validation
- [`ENC-BE-003`](./backend/ENC-BE-003.md) — Queue Number Auto-Assignment

## Frontend Tickets

- [`ENC-FE-001`](./frontend/ENC-FE-001.md) — Encounter Creation Page (Tabbed)
- [`ENC-FE-002`](./frontend/ENC-FE-002.md) — Electronic Consent Capture Modal
- [`ENC-FE-003`](./frontend/ENC-FE-003.md) — Encounter List Page
