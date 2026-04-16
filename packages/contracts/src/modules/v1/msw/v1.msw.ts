import { oc } from "@orpc/contract"

import { mswContract } from "./msw.contract.js"

export const v1Msw = oc.prefix("/msw").router(oc.router(mswContract))
