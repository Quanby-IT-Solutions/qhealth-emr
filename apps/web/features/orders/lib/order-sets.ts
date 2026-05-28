export type OrderSetPriority = "routine" | "urgent" | "stat"
export type OrderSetImagingModality = "xray" | "ct" | "mri" | "ultrasound" | "other"

export interface OrderSetLabPayload {
	testName: string
	panelName?: string
	loincCode?: string
	panelCode?: string
	specimenType?: string
	clinicalIndication?: string
	indicationIcd10Code?: string
	indicationIcd10Display?: string
	priority?: OrderSetPriority
}

export interface OrderSetImagingPayload {
	modality: OrderSetImagingModality
	bodyPart: string
	clinicalIndication?: string
	indicationIcd10Code?: string
	indicationIcd10Display?: string
	priority?: OrderSetPriority
}

export type OrderSetOrder =
	| {
			type: "lab"
			payload: OrderSetLabPayload
	  }
	| {
			type: "imaging"
			payload: OrderSetImagingPayload
	  }

export interface OrderSetDefinition {
	id: string
	name: string
	description: string
	orders: OrderSetOrder[]
}

export const ORDER_SETS = [
	{
		id: "sepsis-bundle",
		name: "Sepsis Bundle",
		description: "Rapid infection workup with immediate labs and chest imaging.",
		orders: [
			{
				type: "lab",
				payload: {
					testName: "Complete Blood Count",
					panelName: "Sepsis Bundle",
					loincCode: "57021-8",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					indicationIcd10Code: "A41.9",
					indicationIcd10Display: "Sepsis, unspecified organism",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Blood Culture",
					panelName: "Sepsis Bundle",
					loincCode: "600-7",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					indicationIcd10Code: "A41.9",
					indicationIcd10Display: "Sepsis, unspecified organism",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Lactate",
					panelName: "Sepsis Bundle",
					loincCode: "2524-7",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					indicationIcd10Code: "A41.9",
					indicationIcd10Display: "Sepsis, unspecified organism",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Procalcitonin",
					panelName: "Sepsis Bundle",
					loincCode: "33959-8",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					indicationIcd10Code: "A41.9",
					indicationIcd10Display: "Sepsis, unspecified organism",
					priority: "stat",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Suspected sepsis",
					indicationIcd10Code: "A41.9",
					indicationIcd10Display: "Sepsis, unspecified organism",
					priority: "stat",
				},
			},
		],
	},
	{
		id: "cardiac-workup",
		name: "Cardiac Workup",
		description: "Initial cardiac biomarker and chest imaging bundle for acute evaluation.",
		orders: [
			{
				type: "lab",
				payload: {
					testName: "Troponin I",
					panelName: "Cardiac Workup",
					loincCode: "10839-9",
					specimenType: "Blood",
					clinicalIndication: "Chest pain evaluation",
					indicationIcd10Code: "R07.9",
					indicationIcd10Display: "Chest pain, unspecified",
					priority: "urgent",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "CK-MB",
					panelName: "Cardiac Workup",
					loincCode: "13969-1",
					specimenType: "Blood",
					clinicalIndication: "Chest pain evaluation",
					indicationIcd10Code: "R07.9",
					indicationIcd10Display: "Chest pain, unspecified",
					priority: "urgent",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Chest pain evaluation",
					indicationIcd10Code: "R07.9",
					indicationIcd10Display: "Chest pain, unspecified",
					priority: "urgent",
				},
			},
		],
	},
	{
		id: "pre-op-panel",
		name: "Pre-op Panel",
		description: "Common pre-operative labs with chest imaging for surgical clearance.",
		orders: [
			{
				type: "lab",
				payload: {
					testName: "Complete Blood Count",
					panelName: "Pre-op Panel",
					loincCode: "57021-8",
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					indicationIcd10Code: "Z01.818",
					indicationIcd10Display: "Encounter for other preprocedural examination",
					priority: "routine",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Basic Metabolic Panel",
					panelName: "Pre-op Panel",
					loincCode: "51990-0",
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					indicationIcd10Code: "Z01.818",
					indicationIcd10Display: "Encounter for other preprocedural examination",
					priority: "routine",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "PT/INR",
					panelName: "Pre-op Panel",
					loincCode: "5902-2",
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					indicationIcd10Code: "Z01.818",
					indicationIcd10Display: "Encounter for other preprocedural examination",
					priority: "routine",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Pre-operative clearance",
					indicationIcd10Code: "Z01.818",
					indicationIcd10Display: "Encounter for other preprocedural examination",
					priority: "routine",
				},
			},
		],
	},
] satisfies OrderSetDefinition[]
