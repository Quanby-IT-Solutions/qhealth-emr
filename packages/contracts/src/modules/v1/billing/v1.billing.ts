import { oc } from "@orpc/contract"

import { billingContract } from "./billing.contract.js"

export const v1Billing = oc.prefix("/billing").router(oc.router(billingContract))
