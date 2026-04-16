import { oc } from "@orpc/contract"

import { consentContract } from "./consent.contract.js"

export const v1Consent = oc.prefix("/consent").router(oc.router(consentContract))
