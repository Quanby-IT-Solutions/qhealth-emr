# SS-001: Audit Automatic Normalization of TOR-Mandatory System Settings

Status: Resolved
Severity: Blocking
Surface: `/admin/settings`
TOR Reference: Section 1 - Auditor/Privacy Officer; Section 4.2 - Privacy, Security, and Offline Capability

## Problem

The current read path silently repairs legacy non-compliant settings rows, but it does so without writing an audit event.

Current behavior:

- `apps/backend/src/modules/v1/system-settings/system-settings.service.ts` corrects TOR-mandatory booleans inside `get()` when legacy rows still contain `false` values;
- the same method explicitly documents that no audit record is written for this correction;
- the persisted row can therefore change as a side effect of opening `/admin/settings` with no corresponding audit trail entry.

This leaves the settings surface functionally compliant while still violating the TOR requirement for detailed, comprehensive auditability of system activity.

## Required Outcome

Any automatic correction of persisted system settings must be auditable. The system must not mutate compliance-critical settings rows without producing a reviewable audit record, or it must move that correction into a one-time migration path that is separately auditable.

## Acceptance Criteria

1. Legacy-row normalization no longer changes persisted system settings silently on the read path.
2. If normalization still occurs at runtime, it produces an audit event with before/after state and actor metadata appropriate for a system-originated correction.
3. If normalization is moved out of the read path, the deployed correction mechanism is documented and leaves the read path side-effect free.
4. Auditors and privacy officers can determine when and how the corrected settings changed.
5. No other TOR-mandatory boolean can be auto-corrected in a way that bypasses the audit log.

## Likely Files

- `apps/backend/src/modules/v1/system-settings/system-settings.service.ts`
- `apps/backend/src/modules/v1/audit/`
- `packages/contracts/src/modules/v1/audit/`

## Notes

- This is not a request to add a new audit UI surface. The repo already contains config-history and audit-log capabilities.
- The gap is the missing underlying audit event for an automatic persisted change.