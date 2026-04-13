import { oc } from "@orpc/contract"

import { edContract } from "./ed.contract.js"

export const v1Ed = oc.prefix("/ed").router(oc.router(edContract))
