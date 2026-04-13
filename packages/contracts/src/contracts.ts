/**
 * Central contract registry
 * Re-exports version routers
 */

// V1 contracts (routers)
export { v1Contract } from "./modules/v1/v1.contract.js"
export type { V1Contract } from "./modules/v1/v1.contract.js"

// Patient schemas — exported for frontend validation (e.g. CreatePatientSchema.safeParse)
export {
	CreatePatientSchema,
	UpdatePatientSchema,
	PatientSearchSchema,
	type CreatePatientInput,
	type UpdatePatientInput,
	type PatientSearchInput,
	type Patient,
} from "./modules/v1/patients/patients.schema.js"

// Encounter schemas — exported for shared types (e.g. EncounterDetail in chart context)
export type { EncounterDetail } from "./modules/v1/encounters/encounters.schema.js"

// Audit schemas (enums, types) for use in frontend and backend
export * from "./modules/v1/audit/audit.schema.js"

// Future versions:
// export { v2Contract, type V2Contract } from "./modules/v2/v2.contract.js"
// export const v2 = { ... }
// export type { Todo as V2Todo, ... } from "./modules/v2/..."
