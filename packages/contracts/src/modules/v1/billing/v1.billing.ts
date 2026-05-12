import { oc } from "@orpc/contract"

import { billingContract } from "./billing.contract.js"

// Build the billing router. Cast to `any` here so TypeScript serializes a smaller type
// for v1Contract — the full type is still correct at runtime and inferred locally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const v1Billing = oc.prefix("/billing").router(oc.router(billingContract as any))
