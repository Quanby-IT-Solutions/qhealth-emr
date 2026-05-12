export interface Cf4Section {
	key: string
	label: string
	fields: Array<{ key: string; label: string; required: boolean; source?: string }>
}

export const CF4_SECTIONS: Cf4Section[] = [
	{
		key: "patient",
		label: "Patient Information",
		fields: [
			{ key: "memberPin", label: "PhilHealth PIN", required: true, source: "philhealth" },
			{ key: "patientName", label: "Patient Name", required: true, source: "patient" },
			{ key: "dateOfBirth", label: "Date of Birth", required: true, source: "patient" },
		],
	},
	{
		key: "encounter",
		label: "Encounter Details",
		fields: [
			{ key: "admissionDate", label: "Admission Date", required: true, source: "encounter" },
			{ key: "dischargeDate", label: "Discharge Date", required: false, source: "encounter" },
			{ key: "lengthOfStay", label: "Length of Stay (days)", required: false, source: "encounter" },
		],
	},
	{
		key: "clinical",
		label: "Clinical Summary",
		fields: [
			{ key: "chiefComplaint", label: "Chief Complaint", required: true, source: "diagnosis" },
			{ key: "briefHistory", label: "Brief History", required: false, source: "diagnosis" },
			{ key: "managementPlan", label: "Management Plan", required: false, source: "manual" },
		],
	},
	{
		key: "diagnoses",
		label: "ICD-10 Diagnoses",
		fields: [
			{ key: "primaryDiagnosis", label: "Primary Diagnosis", required: true, source: "diagnosis" },
			{ key: "secondaryDiagnoses", label: "Secondary Diagnoses", required: false, source: "diagnosis" },
		],
	},
	{
		key: "procedures",
		label: "Procedures / RVS",
		fields: [
			{ key: "procedures", label: "Procedures Performed", required: false, source: "orders" },
		],
	},
	{
		key: "charges",
		label: "Charges",
		fields: [
			{ key: "totalCharges", label: "Total Hospital Charges", required: true, source: "encounter" },
			{ key: "philhealthBenefit", label: "PhilHealth Benefit Claimed", required: true, source: "philhealth" },
		],
	},
]
