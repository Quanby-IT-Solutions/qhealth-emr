import { Injectable } from "@nestjs/common"

// TODO: BIL-BE-07 — implement CEWS eligibility service methods
// - verifyCews (validate 12-digit PIN; retry 3× exponential backoff; graceful degradation)
// - snapshotCews (atomic insert to cews_snapshots + audit log)
// - listCewsSnapshots (ordered by capturedAt desc)
@Injectable()
export class CewsService {}
