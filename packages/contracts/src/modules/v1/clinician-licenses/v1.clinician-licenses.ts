import { oc } from "@orpc/contract"

import { clinicianLicensesContract } from "./clinician-licenses.contract.js"

export const v1ClinicianLicenses = oc
	.prefix("/clinician-licenses")
	.router(oc.router(clinicianLicensesContract))
