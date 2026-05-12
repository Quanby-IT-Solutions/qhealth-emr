import { oc } from "@orpc/contract"

import { masterDataContract } from "./master-data.contract.js"

export const v1MasterData = oc.prefix("/master-data").router(oc.router(masterDataContract))
