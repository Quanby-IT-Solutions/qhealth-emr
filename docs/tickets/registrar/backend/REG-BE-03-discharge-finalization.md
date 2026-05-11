# [REG-BE-03] Discharge Finalization — Clearance Gate, LOS, Death-Rate

**Role:** Registrar
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 2.6
**Flow Refs:** Flow B6 steps 5–7

## Description

Extend the existing inpatient discharge endpoint (`PATCH /api/v1/encounters/:id/discharge`, see `apps/backend/src/modules/v1/encounters/encounters.service.ts:967`) so it enforces all three clearances, captures time-of-discharge, auto-computes length-of-stay, and classifies expired patients as Gross or Net Death Rate per DOH AHSR.

## Behavior Changes

1. **Clearance gate** — before any state mutation, query `discharge_clearances` for `pharmacy`, `nurse`, `billing`. If any is missing, throw `BadRequestException` listing the missing types. (Bypasses the gate for outpatient close — that route already uses a separate endpoint.)
2. **Discharge timestamp** — if `input.dischargeDatetime` is omitted, use `new Date()`. Persist as `dischargeDatetime` (already exists in schema).
3. **Length of Stay** — compute `lengthOfStayMinutes = floor((dischargeDatetime - admissionDatetime) / 60000)`. Persist to the new column added in REG-BE-01.
4. **Death-rate classification** — when `disposition === "deceased"`:
   - Fetch the linked death report (already enforced to exist by current code).
   - `hours = (deathDatetime - admissionDatetime) / 3600000`.
   - `deathRateClassification = hours <= 48 ? "gross" : "net"`. Persist on encounter.
5. **Event emission** — keep existing `encounter.discharged` event. Add a new `encounter.gate-pass-eligible` event (consumed by REG-BE-04). Do **not** auto-transition the bed here; bed transition fires from gate-pass release in REG-BE-04 / REG-BE-05.

## Schema Updates Consumed

- `encounters.lengthOfStayMinutes` (added in REG-BE-01)
- `encounters.deathRateClassification` (added in REG-BE-01)

## Acceptance Criteria

- [ ] Discharge call without all three clearances returns 400 with body listing missing clearance types.
- [ ] `lengthOfStayMinutes` is correctly computed and stored; spot-check matches manual calculation for both same-day and multi-day stays.
- [ ] For deceased disposition, `deathRateClassification` is `gross` when death occurs ≤48h after admission and `net` when >48h. Verified by two unit tests.
- [ ] The discharge call no longer auto-transitions the bed to `available`; that responsibility moves to gate-pass release (REG-BE-04/05).
- [ ] `encounter.gate-pass-eligible` event is emitted on success.
- [ ] All existing discharge tests still pass; new tests cover clearance-gate, LOS, gross/net classification, missing admission timestamp guard.
- [ ] SLA event logging (existing `logSlaEvent`) is preserved.

## Dependencies

- REG-BE-01 (schema columns)
- REG-BE-02 (clearance records to read)

## References

- USER_FLOWS.md §B6 steps 5–7
- USER_STORIES.md §2.6
- TOR §2.4, §2.20 (AHSR Death Rates)
- Existing code: `apps/backend/src/modules/v1/encounters/encounters.service.ts:967`
