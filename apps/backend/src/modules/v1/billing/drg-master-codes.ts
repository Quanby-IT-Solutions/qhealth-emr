/**
 * PhilHealth DRG Master Codes (representative subset).
 *
 * In production these are seeded from the PhilHealth DRG grouper master data
 * via the admin ADM-BE-11 pipeline. Until that pipeline lands, this module
 * holds a curated set that covers the most common MDCs seen in PhilHealth
 * accredited facilities.
 *
 * Each entry carries:
 *  - code        — PhilHealth DRG code
 *  - description — Human-readable description
 *  - mdrg        — Major Diagnostic Category group code
 *  - weight      — Relative weight (case-mix index)
 *  - baseRate    — PhilHealth 2024 base rate in PHP
 *  - deprecated  — Set to true for retired DRG codes; never returned to callers
 */

export interface DrgMasterEntry {
	code: string
	description: string
	mdrg: string
	weight: number
	baseRate: number
	deprecated?: boolean
}

export const DRG_MASTER_CODES: DrgMasterEntry[] = [
	// MDC01 — Nervous System
	{
		code: "A01",
		description: "Craniotomy for trauma",
		mdrg: "MDC01",
		weight: 3.5,
		baseRate: 32000,
	},
	{ code: "A02", description: "Spinal procedures", mdrg: "MDC01", weight: 2.8, baseRate: 32000 },
	{
		code: "A03",
		description: "Simple nervous system procedures",
		mdrg: "MDC01",
		weight: 1.9,
		baseRate: 32000,
	},
	// MDC02 — Eye
	{ code: "B01", description: "Lens procedures", mdrg: "MDC02", weight: 1.2, baseRate: 32000 },
	{ code: "B02", description: "Other eye procedures", mdrg: "MDC02", weight: 0.9, baseRate: 32000 },
	// MDC04 — Respiratory
	{
		code: "C01",
		description: "Major chest procedures",
		mdrg: "MDC04",
		weight: 2.5,
		baseRate: 32000,
	},
	{
		code: "C02",
		description: "Other respiratory procedures",
		mdrg: "MDC04",
		weight: 1.6,
		baseRate: 32000,
	},
	{
		code: "DRG-089",
		description: "Simple Pneumonia & Pleurisy - Age > 17",
		mdrg: "MDC04",
		weight: 1.2847,
		baseRate: 14850,
	},
	{
		code: "DRG-090",
		description: "Simple Pneumonia & Pleurisy - Age 0-17",
		mdrg: "MDC04",
		weight: 0.9234,
		baseRate: 10690,
	},
	{
		code: "DRG-079",
		description: "Respiratory Infections & Inflammations",
		mdrg: "MDC04",
		weight: 1.0421,
		baseRate: 12060,
	},
	{
		code: "DRG-475",
		description: "Respiratory System Diagnosis with Ventilator Support",
		mdrg: "MDC04",
		weight: 4.12,
		baseRate: 47760,
	},
	// MDC05 — Circulatory
	{
		code: "D01",
		description: "Cardiac valve procedures",
		mdrg: "MDC05",
		weight: 4.0,
		baseRate: 32000,
	},
	{ code: "D02", description: "Coronary bypass", mdrg: "MDC05", weight: 5.2, baseRate: 32000 },
	{
		code: "DRG-127",
		description: "Heart Failure & Shock",
		mdrg: "MDC05",
		weight: 1.07,
		baseRate: 12410,
	},
	{ code: "DRG-140", description: "Angina Pectoris", mdrg: "MDC05", weight: 0.55, baseRate: 6380 },
	// MDC06 — Digestive
	{ code: "E01", description: "Appendectomy", mdrg: "MDC06", weight: 1.5, baseRate: 32000 },
	{
		code: "E02",
		description: "Other digestive system procedures",
		mdrg: "MDC06",
		weight: 1.3,
		baseRate: 32000,
	},
	// MDC08 — Musculoskeletal
	{ code: "F01", description: "Hip replacement", mdrg: "MDC08", weight: 2.2, baseRate: 32000 },
	{ code: "F02", description: "Knee replacement", mdrg: "MDC08", weight: 1.8, baseRate: 32000 },
	{ code: "F03", description: "Fracture repair", mdrg: "MDC08", weight: 1.4, baseRate: 32000 },
	// MDC14 — Pregnancy / Delivery
	{ code: "G01", description: "Normal delivery", mdrg: "MDC14", weight: 0.8, baseRate: 32000 },
	{ code: "G02", description: "Cesarean section", mdrg: "MDC14", weight: 1.4, baseRate: 32000 },
	{
		code: "G03",
		description: "Vaginal delivery with complicating diagnoses",
		mdrg: "MDC14",
		weight: 1.0,
		baseRate: 32000,
	},
	// MDC15 — Newborn
	{
		code: "H01",
		description: "Newborn care — normal weight",
		mdrg: "MDC15",
		weight: 0.5,
		baseRate: 32000,
	},
	{
		code: "H02",
		description: "Newborn care — low birth weight",
		mdrg: "MDC15",
		weight: 2.1,
		baseRate: 32000,
	},
	// MDC16 — Blood & Immunology
	{ code: "I01", description: "Splenectomy", mdrg: "MDC16", weight: 2.3, baseRate: 32000 },
	// MDC17 — Myeloproliferative
	{
		code: "J01",
		description: "Lymphoma & leukemia procedures",
		mdrg: "MDC17",
		weight: 3.1,
		baseRate: 32000,
	},
	// MDC18 — Infectious / Parasitic
	{
		code: "K01",
		description: "Post-operative & post-traumatic infections",
		mdrg: "MDC18",
		weight: 1.7,
		baseRate: 32000,
	},
	{
		code: "DRG-416",
		description: "Septicemia — Age > 17",
		mdrg: "MDC18",
		weight: 1.89,
		baseRate: 21910,
	},
]

/** Active (non-deprecated) codes only — use this for suggestion and search. */
export const ACTIVE_DRG_CODES = DRG_MASTER_CODES.filter(d => !d.deprecated)

/**
 * Look up a single DRG by code. Returns undefined for unknown or deprecated codes.
 */
export function findDrgCode(code: string): DrgMasterEntry | undefined {
	return ACTIVE_DRG_CODES.find(d => d.code === code)
}
