import { oc } from "@orpc/contract"

import { reportingContract } from "./reporting.contract.js"

export const v1Reporting = oc.prefix("/reporting").router(oc.router(reportingContract))
