import { oc } from "@orpc/contract"

import { opdTriageContract } from "./opd-triage.contract.js"

export const v1OpdTriage = oc.prefix("/opd-triage").router(opdTriageContract)
