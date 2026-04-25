import { oc } from "@orpc/contract"

import { civilRegistryContract } from "./civil-registry.contract.js"

export const v1CivilRegistry = oc.router(civilRegistryContract)
