import { oc } from "@orpc/contract"

import { facilityProfileContract } from "./facility-profile.contract.js"

export const v1FacilityProfile = oc
	.prefix("/facility-profile")
	.router(oc.router(facilityProfileContract))
