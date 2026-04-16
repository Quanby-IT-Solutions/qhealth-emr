import { oc } from "@orpc/contract"

import { philhealthContract } from "./philhealth.contract.js"

export const v1Philhealth = oc.prefix("/philhealth").router(oc.router(philhealthContract))
