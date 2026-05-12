import { Injectable } from "@nestjs/common"

// TODO: BIL-BE-05 — implement DRG mapping service methods
// - suggestDrg (rule-based top-3 from master data, with confidence + rationale)
// - confirmDrg (persist to drg_mappings; override reason required if ≠ top-1)
// - generateCf5, previewCf5, submitCf5 (CF5 XSD validation mandatory)
// - pollCf5Status, resubmitCf5
@Injectable()
export class DrgService {}
