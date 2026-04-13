import { oc } from "@orpc/contract"

import { rbacContract } from "./rbac.contract.js"

export const v1Rbac = oc.prefix("/rbac").router(oc.router(rbacContract))
