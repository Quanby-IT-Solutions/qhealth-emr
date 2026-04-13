import { oc } from "@orpc/contract"

import { encounterContract } from "./encounters.contract.js"

export const v1Encounter = oc.prefix("/encounter").router(oc.router(encounterContract))
