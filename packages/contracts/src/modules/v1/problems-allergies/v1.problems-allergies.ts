import { oc } from "@orpc/contract"

import { problemsAllergiesContract } from "./problems-allergies.contract.js"

export const v1ProblemsAllergies = oc
	.prefix("/problems-allergies")
	.router(oc.router(problemsAllergiesContract))
