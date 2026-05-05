import { oc } from "@orpc/contract"

import { departmentsContract } from "./departments.contract.js"

export const v1Departments = oc.prefix("/departments").router(oc.router(departmentsContract))
