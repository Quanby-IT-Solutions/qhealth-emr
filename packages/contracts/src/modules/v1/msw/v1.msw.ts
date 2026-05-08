import { oc } from "@orpc/contract"

import { ancillaryClearanceContract } from "./ancillary-clearance.contract.js"
import { annexSignaturesContract } from "./annex-signatures.contract.js"
import { assessmentsContract } from "./assessments.contract.js"
import { coeContract } from "./coe.contract.js"
import { malasakitContract } from "./malasakit.contract.js"
import { mswContract } from "./msw.contract.js"

// Cast entire router object to `any` so TypeScript serializes a smaller type for v1Contract (avoids TS7056).
// Full types are preserved in each sub-contract file and cast back in controllers and the mswOrpc client.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const v1Msw = oc.prefix("/msw").router(
	oc.router({
		...mswContract,
		assessments: oc.router(assessmentsContract),
		coe: oc.router(coeContract),
		annexSignatures: oc.router(annexSignaturesContract),
		malasakit: oc.router(malasakitContract),
		ancillaryClearance: oc.router(ancillaryClearanceContract),
	} as any)
)
/* eslint-enable @typescript-eslint/no-explicit-any */
