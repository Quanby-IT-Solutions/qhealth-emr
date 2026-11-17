export const IMAGING_MODALITY_OPTIONS = [
	{ value: "xray", label: "X-Ray / Radiography" },
	{ value: "ct", label: "CT Scan" },
	{ value: "mri", label: "MRI" },
	{ value: "ultrasound", label: "Ultrasound" },
	{ value: "mammography", label: "Mammography" },
	{ value: "fluoroscopy", label: "Fluoroscopy" },
	{ value: "nuclear_medicine", label: "Nuclear Medicine" },
	{ value: "pet_ct", label: "PET / PET-CT" },
	{ value: "dexa", label: "DEXA / Bone Density" },
	{ value: "interventional_radiology", label: "Interventional Radiology" },
	{ value: "other", label: "Other" },
] as const

export type ImagingModality = (typeof IMAGING_MODALITY_OPTIONS)[number]["value"]

const modalityLabelByValue = new Map<string, string>(
	IMAGING_MODALITY_OPTIONS.map(option => [option.value, option.label])
)

export function formatImagingModalityLabel(modality: string | null | undefined) {
	if (!modality) return "--"
	const normalized = modality.trim().toLowerCase()
	return modalityLabelByValue.get(normalized) ?? modality.trim().replaceAll("_", " ")
}

export function formatImagingExamName(
	modality: string | null | undefined,
	bodyPart: string | null | undefined
) {
	const cleanBodyPart = bodyPart?.trim() || "--"
	return `${formatImagingModalityLabel(modality)} - ${cleanBodyPart}`
}
