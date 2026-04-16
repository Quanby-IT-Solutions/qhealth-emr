import { oc } from "@orpc/contract"

import { deathReportingContract } from "./death-reporting.contract.js"

export const v1DeathReporting = oc.router(deathReportingContract)
