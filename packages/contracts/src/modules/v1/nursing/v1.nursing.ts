import { oc } from "@orpc/contract"

import { nursingContract } from "./nursing.contract.js"

export const v1Nursing = oc.prefix("/nursing").router(oc.router(nursingContract))
