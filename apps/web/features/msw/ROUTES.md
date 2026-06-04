# MSW Route Map

| Route                                      | Story | Flow | Page                                   |
| ------------------------------------------ | ----- | ---- | -------------------------------------- |
| `/msw`                                     | —     | —    | MSW Dashboard                          |
| `/msw/encounters/[encounterId]/assessment` | 12.8  | L8   | Financial Evaluation & Assessment      |
| `/msw/encounters/[encounterId]/coe`        | 12.8  | L8   | Certificate of Eligibility Issuance    |
| `/msw/encounters/[encounterId]/annex`      | 12.9  | L9   | PhilHealth Annex A/B Signature Capture |
| `/msw/signed-forms`                        | 12.9  | L9   | Signed Annex Forms Archive             |
| `/msw/malasakit`                           | 12.10 | L10  | Malasakit Case Tracking Queue          |
| `/msw/malasakit/[caseId]`                  | 12.10 | L10  | Malasakit Case Detail & Timeline       |
| `/msw/ancillary-clearance`                 | 12.11 | L11  | Ancillary Service Clearance Queue      |
| `/msw/ancillary-clearance/[orderId]`       | 12.11 | L11  | Coverage Application & Order Clearance |

## Permissions Required

All routes require `msw:view` permission minimum. Write operations require `msw:create` or `msw:edit`.
