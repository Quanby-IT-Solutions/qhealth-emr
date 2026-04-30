import { oc } from "@orpc/contract"

import { integrationRegistryContract } from "./integration-registry.contract.js"

export const v1IntegrationRegistry = oc
	.prefix("/integration-registry")
	.router(oc.router(integrationRegistryContract))
