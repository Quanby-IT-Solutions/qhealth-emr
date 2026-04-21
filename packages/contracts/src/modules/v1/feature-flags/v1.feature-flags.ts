import { oc } from "@orpc/contract"

import { featureFlagsContract } from "./feature-flags.contract.js"

export const v1FeatureFlags = oc.prefix("/feature-flags").router(oc.router(featureFlagsContract))
