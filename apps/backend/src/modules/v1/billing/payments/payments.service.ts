import { Injectable } from "@nestjs/common"

// TODO: BIL-BE-03 — implement payment service methods
// - recordPayment (overflow check, partial OK)
// - recordMalasakitPayment (source: MALASAKIT, audit event)
// - issueReceipt (atomic sequence per facilityId+fiscalYear)
// - listPayments
@Injectable()
export class PaymentsService {}
