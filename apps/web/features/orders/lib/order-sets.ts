export type OrderSetPriority = "routine" | "urgent" | "stat"
export type OrderSetImagingModality = "xray" | "ct" | "mri" | "ultrasound" | "other"

export interface OrderSetLabPayload {
	testName: string
	panelName?: string
	loincCode?: string
	panelCode?: string
	specimenType?: string
	clinicalIndication?: string
	priority?: OrderSetPriority
}

export interface OrderSetImagingPayload {
	modality: OrderSetImagingModality
	bodyPart: string
	clinicalIndication?: string
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
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Blood Culture",
					panelName: "Sepsis Bundle",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Lactate",
					panelName: "Sepsis Bundle",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					priority: "stat",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Procalcitonin",
					panelName: "Sepsis Bundle",
					specimenType: "Blood",
					clinicalIndication: "Suspected sepsis",
					priority: "stat",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Suspected sepsis",
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
					specimenType: "Blood",
					clinicalIndication: "Chest pain evaluation",
					priority: "urgent",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "CK-MB",
					panelName: "Cardiac Workup",
					specimenType: "Blood",
					clinicalIndication: "Chest pain evaluation",
					priority: "urgent",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Chest pain evaluation",
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
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					priority: "routine",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "Basic Metabolic Panel",
					panelName: "Pre-op Panel",
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					priority: "routine",
				},
			},
			{
				type: "lab",
				payload: {
					testName: "PT/INR",
					panelName: "Pre-op Panel",
					specimenType: "Blood",
					clinicalIndication: "Pre-operative clearance",
					priority: "routine",
				},
			},
			{
				type: "imaging",
				payload: {
					modality: "xray",
					bodyPart: "Chest",
					clinicalIndication: "Pre-operative clearance",
					priority: "routine",
				},
			},
		],
	},
] satisfies OrderSetDefinition[]
