# [HIM-BE-04] Medical Records Issuance Service

**Role:** HIM Coder
**Layer:** Backend
**Category:** Integration & API Connectivity
**Priority:** P0
**Story Refs:** Story 15.3 — Medical Records Issuance
**Flow Refs:** Flow O3

## Description

Process patient/proxy requests for medical records, certificates, and abstracts under DPA consent rules.

## Endpoints (oRPC)

- `him.recordsRequests.create`.
- `him.recordsRequests.list`, `.get`.
- `him.recordsRequests.captureDpaConsent`.
- `him.recordsRequests.attachIdentityProof`.
- `him.recordsRequests.attachPhysicianSignature` — for Medical Certificates.
- `him.recordsRequests.markPaymentCleared` — listens to billing events.
- `him.recordsRequests.release` — generates the document(s), writes audit row.
- `him.recordsAudit.list`.

## Functional Requirements

- DPA consent is mandatory before release; capture stores patient signature image and DPA timestamp.
- Identity verification stores ID image hash and verification metadata.
- Release is gated on payment cleared (BIL-BE-03 event) and DPA captured.
- Audit row is tamper-evident (content hash of all release artifacts).

## Acceptance Criteria

- [ ] Release rejected without DPA consent or payment cleared.
- [ ] Audit row includes content hashes; rows cannot be modified after creation.
- [ ] Endpoints require `him.records.read|write` permissions.
- [ ] Integration tests cover the full path: create → DPA → ID → payment → release → audit.

## Dependencies

- HIM-BE-01, BIL-BE-03 (payment event).

## References

- USER_FLOWS.md §O3.
- USER_STORIES.md §15 Story 15.3.
- TOR §6 Flow 7; §4.2 — DPA compliance.
