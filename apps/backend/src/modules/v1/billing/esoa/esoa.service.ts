import { Injectable } from "@nestjs/common"

// TODO: BIL-BE-06 — implement eSOA service methods
// - generateEsoa (idempotent per invoice version; XSD validate; persist to esoa_statements)
// - listEsoa (versions per invoice)
// - sendEsoa (reject if unsettled balance unless allowDraft=true; record delivery audit row)
@Injectable()
export class EsoaService {}
