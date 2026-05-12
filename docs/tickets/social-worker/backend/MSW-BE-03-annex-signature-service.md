# [MSW-BE-03] PhilHealth Annex A & B Signature Archive

**Role:** Social Worker
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 12.9 — PhilHealth Annex A & B Digital Signature Capture
**Flow Refs:** Flow L9

## Description

Persist patient + witness signatures, generate signed PDFs of Annex A and B, and surface them in the encounter and patient archive.

## Endpoints (oRPC)

- `msw.annex.capture` — input: encounterId, annexType (A | B), patientSignaturePngBase64, witnessSignaturePngBase64.
- `msw.annex.list` — by patient or encounter.
- `msw.annex.get`.

## Functional Requirements

- Capture writes the signature images to object storage, then renders the official Annex template + signatures into a final PDF.
- Each PDF is sealed (content hash recorded) so any later modification is detectable.
- Capture endpoint is rate-limited per encounter to prevent accidental duplicates.

## Acceptance Criteria

- [ ] PDF rendering deterministic for the same input (byte-identical for byte-identical input).
- [ ] Signed PDFs include patient identity, encounter id, ISO timestamp, and the rendered signatures.
- [ ] Capture is rejected if a PDF for the same encounter + annex type already exists unless `replace=true` with a reason.
- [ ] Endpoints require `msw.annex.read|write` permissions.
- [ ] Audit events emitted on every capture and replace.
- [ ] Integration tests verify byte-stable PDF and content hash.

## Dependencies

- MSW-BE-01.
- Object storage facade (shared).

## References

- USER_FLOWS.md §L9.
- USER_STORIES.md §12 Story 12.9.
- TOR §1 — MSW responsibility for PhilHealth Annex A and B.
