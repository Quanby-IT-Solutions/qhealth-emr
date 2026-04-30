# [ADM-BE-11] Facility, Department, Ward & Master Data API

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Stories 20.1 (Facility Setup), 20.2 (Master Data)
**Flow Refs:** Flow T1, Flow T2

## Description

Provide CRUD APIs for the facility profile, departments, wards, rooms, beds, and master-data catalogs (Drug Formulary, Lab Catalog, RVS Catalog, ICD-10 Sets).

## Endpoints (oRPC)

### Facility
- `admin.facility.get`, `admin.facility.update`.

### Departments / Wards / Rooms / Beds
- `admin.departments.list|get|upsert|delete`.
- `admin.wards.list|get|upsert|delete` (cascades to rooms).
- `admin.rooms.list|get|upsert|delete` (cascades to beds).
- `admin.beds.list|get|upsert|delete|setStatus`.

### Master Data
- `admin.masterData.catalogs.list`.
- `admin.masterData.items.list|get|upsert|deprecate|import` (per catalog).

## Acceptance Criteria

- [ ] Bed status taxonomy is constrained server-side to `Available | Occupied | Reserved | Dirty/For Cleaning` per Flow B7.
- [ ] Deleting a ward or room is blocked when occupied beds exist; returns a structured error indicating the blocking children.
- [ ] Master data import accepts CSV with explicit column mapping; row-level errors are returned as a structured array, no partial commits.
- [ ] `deprecate` enforces a replacement target for catalogs that have downstream dependencies (RVS, ICD-10, Drug Formulary).
- [ ] Audit events emitted on every write (`facility.update`, `ward.upsert`, `bed.setStatus`, `masterData.upsert`, etc.).
- [ ] Endpoints require `admin.facility.read|write` and `admin.master-data.read|write` permissions respectively.
- [ ] Integration tests cover the cascade rules and the import error reporting.

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §T1, §T2, §B7.
- USER_STORIES.md §20 Stories 20.1, 20.2.
- TOR §2.1 — Bed management; §3 — AHSR.
