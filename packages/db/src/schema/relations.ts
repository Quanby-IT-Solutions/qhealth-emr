import { defineRelations } from "drizzle-orm"

import { accounts, sessions, twoFactors, users, verifications } from "./auth.js"
import { auditLogs, breakGlassEvents, notifications } from "./audit.js"
import {
	charges,
	chargeMasterItems,
	cf4Claims,
	cf5Claims,
	eligibilityChecks,
	invoiceLineItems,
	invoices,
	payments,
} from "./billing.js"
import { allergies, clinicalNotes, consentRecords, noteAddenda, noteTemplates, problems } from "./clinical.js"
import {
	bedCensusSnapshots,
	beds,
	encounters,
	encounterStatusEvents,
	encounterTransfers,
	patients,
	preEncounters,
	wards,
} from "./core.js"
import { deathReports } from "./death-reporting.js"
import { drugBrands, drugGenerics, formularyItems, icd10Codes, loincCodes, rxnormCodes, rvsCodes } from "./formulary.js"
import { mswEvaluations } from "./msw.js"
import { nbsLogEntries } from "./nbs.js"
import { flowsheetEntries, haiTags, ioEntries, marEntries, shiftHandoffs, tarEntries, vitalSigns } from "./nursing.js"
import { nutritionAssessments } from "./nutrition.js"
import { imagingOrders, labOrders, medicationOrders, orderVerifications, prescriptions } from "./orders.js"
import { facilities, rolePermissions, roles, staffProfiles, userRoles } from "./rbac.js"
import { ahsrSnapshots, fhirExports, pidsrCases, surveillanceFlags } from "./reporting.js"
import { appointments, clinicTemplates } from "./scheduling.js"
import {
	anesthesiaRecords,
	operationRecords,
	surgicalChecklists,
	surgicalRvsAssignments,
} from "./surgical.js"

// ============================================================================
// RELATIONS — Single defineRelations() call covering all cross-table relations
// ============================================================================

export const relations = defineRelations(
	{
		// Auth
		users,
		sessions,
		accounts,
		verifications,
		twoFactors,
		// RBAC
		facilities,
		staffProfiles,
		roles,
		rolePermissions,
		userRoles,
		// Core
		patients,
		encounters,
		encounterStatusEvents,
		preEncounters,
		encounterTransfers,
		wards,
		beds,
		bedCensusSnapshots,
		// Clinical
		clinicalNotes,
		noteAddenda,
		noteTemplates,
		consentRecords,
		problems,
		allergies,
		// Formulary
		drugGenerics,
		drugBrands,
		formularyItems,
		icd10Codes,
		loincCodes,
		rxnormCodes,
		rvsCodes,
		// Orders
		medicationOrders,
		labOrders,
		imagingOrders,
		orderVerifications,
		prescriptions,
		// Nursing
		vitalSigns,
		flowsheetEntries,
		marEntries,
		tarEntries,
		ioEntries,
		shiftHandoffs,
		haiTags,
		// Billing
		chargeMasterItems,
		charges,
		invoices,
		invoiceLineItems,
		payments,
		cf4Claims,
		cf5Claims,
		eligibilityChecks,
		// Reporting
		pidsrCases,
		surveillanceFlags,
		ahsrSnapshots,
		fhirExports,
		// Audit
		auditLogs,
		breakGlassEvents,
		notifications,
		// Surgical
		operationRecords,
		anesthesiaRecords,
		surgicalRvsAssignments,
		surgicalChecklists,
		// Scheduling
		clinicTemplates,
		appointments,
		// NBS
		nbsLogEntries,
		// Death Reporting
		deathReports,
		// Nutrition
		nutritionAssessments,
		// MSW
		mswEvaluations,
	},
	r => ({
		// -----------------------------------------------------------------------
		// Auth
		// -----------------------------------------------------------------------
		users: {
			sessions: r.many.sessions(),
			accounts: r.many.accounts(),
			twoFactors: r.many.twoFactors(),
			staffProfiles: r.many.staffProfiles(),
			auditLogs: r.many.auditLogs(),
		},
		sessions: {
			user: r.one.users({
				from: r.sessions.userId,
				to: r.users.id,
			}),
		},
		accounts: {
			user: r.one.users({
				from: r.accounts.userId,
				to: r.users.id,
			}),
		},
		twoFactors: {
			user: r.one.users({
				from: r.twoFactors.userId,
				to: r.users.id,
			}),
		},

		// -----------------------------------------------------------------------
		// RBAC
		// -----------------------------------------------------------------------
		facilities: {
			staffProfiles: r.many.staffProfiles(),
			roles: r.many.roles(),
			patients: r.many.patients(),
			encounters: r.many.encounters(),
			encounterStatusEvents: r.many.encounterStatusEvents(),
			preEncounters: r.many.preEncounters(),
			wards: r.many.wards(),
			beds: r.many.beds(),
			encounterTransfers: r.many.encounterTransfers(),
			notifications: r.many.notifications(),
			formularyItems: r.many.formularyItems(),
			chargeMasterItems: r.many.chargeMasterItems(),
			medicationOrders: r.many.medicationOrders(),
			labOrders: r.many.labOrders(),
			imagingOrders: r.many.imagingOrders(),
			prescriptions: r.many.prescriptions(),
			vitalSigns: r.many.vitalSigns(),
			flowsheetEntries: r.many.flowsheetEntries(),
			marEntries: r.many.marEntries(),
			tarEntries: r.many.tarEntries(),
			ioEntries: r.many.ioEntries(),
			shiftHandoffs: r.many.shiftHandoffs(),
			haiTags: r.many.haiTags(),
			clinicalNotes: r.many.clinicalNotes(),
			noteTemplates: r.many.noteTemplates(),
			consentRecords: r.many.consentRecords(),
			problems: r.many.problems(),
			allergies: r.many.allergies(),
			charges: r.many.charges(),
			invoices: r.many.invoices(),
			payments: r.many.payments(),
			cf4Claims: r.many.cf4Claims(),
			cf5Claims: r.many.cf5Claims(),
			eligibilityChecks: r.many.eligibilityChecks(),
			pidsrCases: r.many.pidsrCases(),
			surveillanceFlags: r.many.surveillanceFlags(),
			ahsrSnapshots: r.many.ahsrSnapshots(),
			fhirExports: r.many.fhirExports(),
			auditLogs: r.many.auditLogs(),
			breakGlassEvents: r.many.breakGlassEvents(),
			// New table many-relations
			operationRecords: r.many.operationRecords(),
			anesthesiaRecords: r.many.anesthesiaRecords(),
			surgicalRvsAssignments: r.many.surgicalRvsAssignments(),
			surgicalChecklists: r.many.surgicalChecklists(),
			clinicTemplates: r.many.clinicTemplates(),
			appointments: r.many.appointments(),
			nbsLogEntries: r.many.nbsLogEntries(),
			deathReports: r.many.deathReports(),
			nutritionAssessments: r.many.nutritionAssessments(),
			mswEvaluations: r.many.mswEvaluations(),
		},
		staffProfiles: {
			user: r.one.users({
				from: r.staffProfiles.userId,
				to: r.users.id,
			}),
			facility: r.one.facilities({
				from: r.staffProfiles.facilityId,
				to: r.facilities.id,
			}),
			userRoles: r.many.userRoles(),
			notifications: r.many.notifications(),
		},
		roles: {
			facility: r.one.facilities({
				from: r.roles.facilityId,
				to: r.facilities.id,
			}),
			rolePermissions: r.many.rolePermissions(),
			userRoles: r.many.userRoles(),
		},
		rolePermissions: {
			role: r.one.roles({
				from: r.rolePermissions.roleId,
				to: r.roles.id,
			}),
		},
		userRoles: {
			staffProfile: r.one.staffProfiles({
				from: r.userRoles.staffProfileId,
				to: r.staffProfiles.id,
			}),
			role: r.one.roles({
				from: r.userRoles.roleId,
				to: r.roles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Core
		// -----------------------------------------------------------------------
		patients: {
			facility: r.one.facilities({
				from: r.patients.facilityId,
				to: r.facilities.id,
			}),
			encounters: r.many.encounters(),
			problems: r.many.problems(),
			allergies: r.many.allergies(),
			consentRecords: r.many.consentRecords(),
			prescriptions: r.many.prescriptions(),
			invoices: r.many.invoices(),
			eligibilityChecks: r.many.eligibilityChecks(),
			pidsrCases: r.many.pidsrCases(),
			breakGlassEvents: r.many.breakGlassEvents(),
			// New table many-relations
			cf4Claims: r.many.cf4Claims(),
			appointments: r.many.appointments(),
			nbsLogEntries: r.many.nbsLogEntries(),
			deathReports: r.many.deathReports(),
			nutritionAssessments: r.many.nutritionAssessments(),
			mswEvaluations: r.many.mswEvaluations(),
		},
		encounters: {
			facility: r.one.facilities({
				from: r.encounters.facilityId,
				to: r.facilities.id,
			}),
			patient: r.one.patients({
				from: r.encounters.patientId,
				to: r.patients.id,
			}),
			bed: r.one.beds({
				from: r.encounters.bedId,
				to: r.beds.id,
			}),
			admittingStaff: r.one.staffProfiles({
				from: r.encounters.admittingStaffId,
				to: r.staffProfiles.id,
			}),
			attendingStaff: r.one.staffProfiles({
				from: r.encounters.attendingStaffId,
				to: r.staffProfiles.id,
			}),
			mergedFromPreEncounter: r.one.preEncounters({
				from: r.encounters.mergedFromPreEncounterId,
				to: r.preEncounters.id,
			}),
			transfers: r.many.encounterTransfers(),
			statusEvents: r.many.encounterStatusEvents(),
			clinicalNotes: r.many.clinicalNotes(),
			consentRecords: r.many.consentRecords(),
			vitalSigns: r.many.vitalSigns(),
			medicationOrders: r.many.medicationOrders(),
			labOrders: r.many.labOrders(),
			imagingOrders: r.many.imagingOrders(),
			marEntries: r.many.marEntries(),
			tarEntries: r.many.tarEntries(),
			ioEntries: r.many.ioEntries(),
			flowsheetEntries: r.many.flowsheetEntries(),
			shiftHandoffs: r.many.shiftHandoffs(),
			haiTags: r.many.haiTags(),
			charges: r.many.charges(),
			invoices: r.many.invoices(),
			cf4Claims: r.many.cf4Claims(),
			cf5Claims: r.many.cf5Claims(),
			prescriptions: r.many.prescriptions(),
			pidsrCases: r.many.pidsrCases(),
			surveillanceFlags: r.many.surveillanceFlags(),
			// New table many-relations
			operationRecords: r.many.operationRecords(),
			nbsLogEntries: r.many.nbsLogEntries(),
			deathReports: r.many.deathReports(),
			nutritionAssessments: r.many.nutritionAssessments(),
			mswEvaluations: r.many.mswEvaluations(),
		},
		preEncounters: {
			facility: r.one.facilities({
				from: r.preEncounters.facilityId,
				to: r.facilities.id,
			}),
			triageStaff: r.one.staffProfiles({
				from: r.preEncounters.triageStaffId,
				to: r.staffProfiles.id,
			}),
			mergedToEncounter: r.one.encounters({
				from: r.preEncounters.mergedToEncounterId,
				to: r.encounters.id,
			}),
			clinicalNotes: r.many.clinicalNotes(),
			vitalSigns: r.many.vitalSigns(),
			medicationOrders: r.many.medicationOrders(),
			labOrders: r.many.labOrders(),
			imagingOrders: r.many.imagingOrders(),
			marEntries: r.many.marEntries(),
			tarEntries: r.many.tarEntries(),
			ioEntries: r.many.ioEntries(),
		},
		encounterTransfers: {
			facility: r.one.facilities({
				from: r.encounterTransfers.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.encounterTransfers.encounterId,
				to: r.encounters.id,
			}),
			fromWard: r.one.wards({
				from: r.encounterTransfers.fromWardId,
				to: r.wards.id,
			}),
			fromBed: r.one.beds({
				from: r.encounterTransfers.fromBedId,
				to: r.beds.id,
			}),
			toWard: r.one.wards({
				from: r.encounterTransfers.toWardId,
				to: r.wards.id,
			}),
			toBed: r.one.beds({
				from: r.encounterTransfers.toBedId,
				to: r.beds.id,
			}),
			orderingStaff: r.one.staffProfiles({
				from: r.encounterTransfers.orderingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		wards: {
			facility: r.one.facilities({
				from: r.wards.facilityId,
				to: r.facilities.id,
			}),
			beds: r.many.beds(),
			bedCensusSnapshots: r.many.bedCensusSnapshots(),
		},
		beds: {
			ward: r.one.wards({
				from: r.beds.wardId,
				to: r.wards.id,
			}),
			facility: r.one.facilities({
				from: r.beds.facilityId,
				to: r.facilities.id,
			}),
			currentEncounter: r.one.encounters({
				from: r.beds.currentEncounterId,
				to: r.encounters.id,
			}),
		},
		bedCensusSnapshots: {
			facility: r.one.facilities({
				from: r.bedCensusSnapshots.facilityId,
				to: r.facilities.id,
			}),
			ward: r.one.wards({
				from: r.bedCensusSnapshots.wardId,
				to: r.wards.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Clinical
		// -----------------------------------------------------------------------
		clinicalNotes: {
			facility: r.one.facilities({
				from: r.clinicalNotes.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.clinicalNotes.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.clinicalNotes.preEncounterId,
				to: r.preEncounters.id,
			}),
			template: r.one.noteTemplates({
				from: r.clinicalNotes.templateId,
				to: r.noteTemplates.id,
			}),
			authorStaff: r.one.staffProfiles({
				from: r.clinicalNotes.authorStaffId,
				to: r.staffProfiles.id,
			}),
			addenda: r.many.noteAddenda(),
			surveillanceFlags: r.many.surveillanceFlags(),
		},
		noteAddenda: {
			note: r.one.clinicalNotes({
				from: r.noteAddenda.noteId,
				to: r.clinicalNotes.id,
			}),
			authorStaff: r.one.staffProfiles({
				from: r.noteAddenda.authorStaffId,
				to: r.staffProfiles.id,
			}),
		},
		noteTemplates: {
			facility: r.one.facilities({
				from: r.noteTemplates.facilityId,
				to: r.facilities.id,
			}),
			createdByStaff: r.one.staffProfiles({
				from: r.noteTemplates.createdByStaffId,
				to: r.staffProfiles.id,
			}),
			clinicalNotes: r.many.clinicalNotes(),
		},
		consentRecords: {
			facility: r.one.facilities({
				from: r.consentRecords.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.consentRecords.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.consentRecords.patientId,
				to: r.patients.id,
			}),
			witnessStaff: r.one.staffProfiles({
				from: r.consentRecords.witnessStaffId,
				to: r.staffProfiles.id,
			}),
		},
		problems: {
			facility: r.one.facilities({
				from: r.problems.facilityId,
				to: r.facilities.id,
			}),
			patient: r.one.patients({
				from: r.problems.patientId,
				to: r.patients.id,
			}),
			documentingStaff: r.one.staffProfiles({
				from: r.problems.documentingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		allergies: {
			facility: r.one.facilities({
				from: r.allergies.facilityId,
				to: r.facilities.id,
			}),
			patient: r.one.patients({
				from: r.allergies.patientId,
				to: r.patients.id,
			}),
			documentingStaff: r.one.staffProfiles({
				from: r.allergies.documentingStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Formulary
		// -----------------------------------------------------------------------
		drugGenerics: {
			drugBrands: r.many.drugBrands(),
			formularyItems: r.many.formularyItems(),
		},
		drugBrands: {
			drugGeneric: r.one.drugGenerics({
				from: r.drugBrands.drugGenericId,
				to: r.drugGenerics.id,
			}),
			formularyItems: r.many.formularyItems(),
		},
		formularyItems: {
			facility: r.one.facilities({
				from: r.formularyItems.facilityId,
				to: r.facilities.id,
			}),
			drugGeneric: r.one.drugGenerics({
				from: r.formularyItems.drugGenericId,
				to: r.drugGenerics.id,
			}),
			drugBrand: r.one.drugBrands({
				from: r.formularyItems.drugBrandId,
				to: r.drugBrands.id,
			}),
			medicationOrders: r.many.medicationOrders(),
		},

		// -----------------------------------------------------------------------
		// Orders
		// -----------------------------------------------------------------------
		medicationOrders: {
			facility: r.one.facilities({
				from: r.medicationOrders.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.medicationOrders.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.medicationOrders.preEncounterId,
				to: r.preEncounters.id,
			}),
			formularyItem: r.one.formularyItems({
				from: r.medicationOrders.formularyItemId,
				to: r.formularyItems.id,
			}),
			orderingStaff: r.one.staffProfiles({
				from: r.medicationOrders.orderingStaffId,
				to: r.staffProfiles.id,
			}),
			verifications: r.many.orderVerifications(),
			marEntries: r.many.marEntries(),
			prescriptions: r.many.prescriptions(),
		},
		labOrders: {
			facility: r.one.facilities({
				from: r.labOrders.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.labOrders.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.labOrders.preEncounterId,
				to: r.preEncounters.id,
			}),
			orderingStaff: r.one.staffProfiles({
				from: r.labOrders.orderingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		imagingOrders: {
			facility: r.one.facilities({
				from: r.imagingOrders.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.imagingOrders.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.imagingOrders.preEncounterId,
				to: r.preEncounters.id,
			}),
			orderingStaff: r.one.staffProfiles({
				from: r.imagingOrders.orderingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		orderVerifications: {
			medicationOrder: r.one.medicationOrders({
				from: r.orderVerifications.medicationOrderId,
				to: r.medicationOrders.id,
			}),
			pharmacistStaff: r.one.staffProfiles({
				from: r.orderVerifications.pharmacistStaffId,
				to: r.staffProfiles.id,
			}),
		},
		prescriptions: {
			encounter: r.one.encounters({
				from: r.prescriptions.encounterId,
				to: r.encounters.id,
			}),
			medicationOrder: r.one.medicationOrders({
				from: r.prescriptions.medicationOrderId,
				to: r.medicationOrders.id,
			}),
			patient: r.one.patients({
				from: r.prescriptions.patientId,
				to: r.patients.id,
			}),
			prescriberStaff: r.one.staffProfiles({
				from: r.prescriptions.prescriberStaffId,
				to: r.staffProfiles.id,
			}),
			facility: r.one.facilities({
				from: r.prescriptions.facilityId,
				to: r.facilities.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Nursing
		// -----------------------------------------------------------------------
		vitalSigns: {
			facility: r.one.facilities({
				from: r.vitalSigns.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.vitalSigns.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.vitalSigns.preEncounterId,
				to: r.preEncounters.id,
			}),
			recordedByStaff: r.one.staffProfiles({
				from: r.vitalSigns.recordedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		flowsheetEntries: {
			facility: r.one.facilities({
				from: r.flowsheetEntries.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.flowsheetEntries.encounterId,
				to: r.encounters.id,
			}),
			recordedByStaff: r.one.staffProfiles({
				from: r.flowsheetEntries.recordedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		marEntries: {
			facility: r.one.facilities({
				from: r.marEntries.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.marEntries.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.marEntries.preEncounterId,
				to: r.preEncounters.id,
			}),
			medicationOrder: r.one.medicationOrders({
				from: r.marEntries.medicationOrderId,
				to: r.medicationOrders.id,
			}),
			administeredByStaff: r.one.staffProfiles({
				from: r.marEntries.administeredByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		tarEntries: {
			facility: r.one.facilities({
				from: r.tarEntries.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.tarEntries.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.tarEntries.preEncounterId,
				to: r.preEncounters.id,
			}),
			administeredByStaff: r.one.staffProfiles({
				from: r.tarEntries.administeredByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		ioEntries: {
			facility: r.one.facilities({
				from: r.ioEntries.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.ioEntries.encounterId,
				to: r.encounters.id,
			}),
			preEncounter: r.one.preEncounters({
				from: r.ioEntries.preEncounterId,
				to: r.preEncounters.id,
			}),
			recordedByStaff: r.one.staffProfiles({
				from: r.ioEntries.recordedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		shiftHandoffs: {
			facility: r.one.facilities({
				from: r.shiftHandoffs.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.shiftHandoffs.encounterId,
				to: r.encounters.id,
			}),
			outgoingStaff: r.one.staffProfiles({
				from: r.shiftHandoffs.outgoingStaffId,
				to: r.staffProfiles.id,
			}),
			incomingStaff: r.one.staffProfiles({
				from: r.shiftHandoffs.incomingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		haiTags: {
			facility: r.one.facilities({
				from: r.haiTags.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.haiTags.encounterId,
				to: r.encounters.id,
			}),
			documentedByStaff: r.one.staffProfiles({
				from: r.haiTags.documentedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Billing
		// -----------------------------------------------------------------------
		chargeMasterItems: {
			facility: r.one.facilities({
				from: r.chargeMasterItems.facilityId,
				to: r.facilities.id,
			}),
			charges: r.many.charges(),
		},
		charges: {
			facility: r.one.facilities({
				from: r.charges.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.charges.encounterId,
				to: r.encounters.id,
			}),
			chargeMasterItem: r.one.chargeMasterItems({
				from: r.charges.chargeMasterItemId,
				to: r.chargeMasterItems.id,
			}),
			createdByStaff: r.one.staffProfiles({
				from: r.charges.createdByStaffId,
				to: r.staffProfiles.id,
			}),
			invoiceLineItems: r.many.invoiceLineItems(),
		},
		invoices: {
			facility: r.one.facilities({
				from: r.invoices.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.invoices.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.invoices.patientId,
				to: r.patients.id,
			}),
			createdByStaff: r.one.staffProfiles({
				from: r.invoices.createdByStaffId,
				to: r.staffProfiles.id,
			}),
			lineItems: r.many.invoiceLineItems(),
			payments: r.many.payments(),
			cf4Claims: r.many.cf4Claims(),
		},
		invoiceLineItems: {
			invoice: r.one.invoices({
				from: r.invoiceLineItems.invoiceId,
				to: r.invoices.id,
			}),
			charge: r.one.charges({
				from: r.invoiceLineItems.chargeId,
				to: r.charges.id,
			}),
		},
		payments: {
			facility: r.one.facilities({
				from: r.payments.facilityId,
				to: r.facilities.id,
			}),
			invoice: r.one.invoices({
				from: r.payments.invoiceId,
				to: r.invoices.id,
			}),
			receivedByStaff: r.one.staffProfiles({
				from: r.payments.receivedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		cf4Claims: {
			facility: r.one.facilities({
				from: r.cf4Claims.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.cf4Claims.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.cf4Claims.patientId,
				to: r.patients.id,
			}),
			invoice: r.one.invoices({
				from: r.cf4Claims.invoiceId,
				to: r.invoices.id,
			}),
		},
		eligibilityChecks: {
			facility: r.one.facilities({
				from: r.eligibilityChecks.facilityId,
				to: r.facilities.id,
			}),
			patient: r.one.patients({
				from: r.eligibilityChecks.patientId,
				to: r.patients.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Reporting
		// -----------------------------------------------------------------------
		pidsrCases: {
			facility: r.one.facilities({
				from: r.pidsrCases.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.pidsrCases.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.pidsrCases.patientId,
				to: r.patients.id,
			}),
			reportingStaff: r.one.staffProfiles({
				from: r.pidsrCases.reportingStaffId,
				to: r.staffProfiles.id,
			}),
		},
		surveillanceFlags: {
			facility: r.one.facilities({
				from: r.surveillanceFlags.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.surveillanceFlags.encounterId,
				to: r.encounters.id,
			}),
			note: r.one.clinicalNotes({
				from: r.surveillanceFlags.noteId,
				to: r.clinicalNotes.id,
			}),
			reviewedByStaff: r.one.staffProfiles({
				from: r.surveillanceFlags.reviewedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		ahsrSnapshots: {
			facility: r.one.facilities({
				from: r.ahsrSnapshots.facilityId,
				to: r.facilities.id,
			}),
			generatedByStaff: r.one.staffProfiles({
				from: r.ahsrSnapshots.generatedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Audit
		// -----------------------------------------------------------------------
		auditLogs: {
			facility: r.one.facilities({
				from: r.auditLogs.facilityId,
				to: r.facilities.id,
			}),
			user: r.one.users({
				from: r.auditLogs.userId,
				to: r.users.id,
			}),
			staffProfile: r.one.staffProfiles({
				from: r.auditLogs.staffProfileId,
				to: r.staffProfiles.id,
			}),
		},
		breakGlassEvents: {
			facility: r.one.facilities({
				from: r.breakGlassEvents.facilityId,
				to: r.facilities.id,
			}),
			clinicianStaff: r.one.staffProfiles({
				from: r.breakGlassEvents.clinicianStaffId,
				to: r.staffProfiles.id,
			}),
			patient: r.one.patients({
				from: r.breakGlassEvents.patientId,
				to: r.patients.id,
			}),
			reviewedByStaff: r.one.staffProfiles({
				from: r.breakGlassEvents.reviewedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		notifications: {
			facility: r.one.facilities({
				from: r.notifications.facilityId,
				to: r.facilities.id,
			}),
			recipientStaff: r.one.staffProfiles({
				from: r.notifications.recipientStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Encounter Status Events (SLA tracking)
		// -----------------------------------------------------------------------
		encounterStatusEvents: {
			facility: r.one.facilities({
				from: r.encounterStatusEvents.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.encounterStatusEvents.encounterId,
				to: r.encounters.id,
			}),
			staff: r.one.staffProfiles({
				from: r.encounterStatusEvents.staffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// CF5 Claims (DRG shadow billing)
		// -----------------------------------------------------------------------
		cf5Claims: {
			facility: r.one.facilities({
				from: r.cf5Claims.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.cf5Claims.encounterId,
				to: r.encounters.id,
			}),
			cf4Claim: r.one.cf4Claims({
				from: r.cf5Claims.cf4ClaimId,
				to: r.cf4Claims.id,
			}),
			validatedByStaff: r.one.staffProfiles({
				from: r.cf5Claims.validatedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// FHIR Exports (NHDR submissions)
		// -----------------------------------------------------------------------
		fhirExports: {
			facility: r.one.facilities({
				from: r.fhirExports.facilityId,
				to: r.facilities.id,
			}),
			initiatedByStaff: r.one.staffProfiles({
				from: r.fhirExports.initiatedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Surgical — Operation Records, Anesthesia, RVS, Checklists
		// -----------------------------------------------------------------------
		operationRecords: {
			facility: r.one.facilities({
				from: r.operationRecords.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.operationRecords.encounterId,
				to: r.encounters.id,
			}),
			surgeonStaff: r.one.staffProfiles({
				from: r.operationRecords.surgeonStaffId,
				to: r.staffProfiles.id,
			}),
			anesthesiologistStaff: r.one.staffProfiles({
				from: r.operationRecords.anesthesiologistStaffId,
				to: r.staffProfiles.id,
			}),
			anesthesiaRecords: r.many.anesthesiaRecords(),
			surgicalRvsAssignments: r.many.surgicalRvsAssignments(),
			surgicalChecklists: r.many.surgicalChecklists(),
		},
		anesthesiaRecords: {
			facility: r.one.facilities({
				from: r.anesthesiaRecords.facilityId,
				to: r.facilities.id,
			}),
			operationRecord: r.one.operationRecords({
				from: r.anesthesiaRecords.operationRecordId,
				to: r.operationRecords.id,
			}),
			anesthesiologistStaff: r.one.staffProfiles({
				from: r.anesthesiaRecords.anesthesiologistStaffId,
				to: r.staffProfiles.id,
			}),
		},
		surgicalRvsAssignments: {
			facility: r.one.facilities({
				from: r.surgicalRvsAssignments.facilityId,
				to: r.facilities.id,
			}),
			operationRecord: r.one.operationRecords({
				from: r.surgicalRvsAssignments.operationRecordId,
				to: r.operationRecords.id,
			}),
			rvsCodeRef: r.one.rvsCodes({
				from: r.surgicalRvsAssignments.rvsCodeId,
				to: r.rvsCodes.id,
			}),
			suggestedByStaff: r.one.staffProfiles({
				from: r.surgicalRvsAssignments.suggestedByStaffId,
				to: r.staffProfiles.id,
			}),
			validatedByStaff: r.one.staffProfiles({
				from: r.surgicalRvsAssignments.validatedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
		surgicalChecklists: {
			facility: r.one.facilities({
				from: r.surgicalChecklists.facilityId,
				to: r.facilities.id,
			}),
			operationRecord: r.one.operationRecords({
				from: r.surgicalChecklists.operationRecordId,
				to: r.operationRecords.id,
			}),
			completedByStaff: r.one.staffProfiles({
				from: r.surgicalChecklists.completedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Scheduling — Clinic Templates, Appointments
		// -----------------------------------------------------------------------
		clinicTemplates: {
			facility: r.one.facilities({
				from: r.clinicTemplates.facilityId,
				to: r.facilities.id,
			}),
			clinicianStaff: r.one.staffProfiles({
				from: r.clinicTemplates.clinicianStaffId,
				to: r.staffProfiles.id,
			}),
			appointments: r.many.appointments(),
		},
		appointments: {
			facility: r.one.facilities({
				from: r.appointments.facilityId,
				to: r.facilities.id,
			}),
			patient: r.one.patients({
				from: r.appointments.patientId,
				to: r.patients.id,
			}),
			clinicTemplate: r.one.clinicTemplates({
				from: r.appointments.clinicTemplateId,
				to: r.clinicTemplates.id,
			}),
			bookedByStaff: r.one.staffProfiles({
				from: r.appointments.bookedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// NBS Log Entries (Newborn Screening)
		// -----------------------------------------------------------------------
		nbsLogEntries: {
			facility: r.one.facilities({
				from: r.nbsLogEntries.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.nbsLogEntries.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.nbsLogEntries.patientId,
				to: r.patients.id,
			}),
			screenedByStaff: r.one.staffProfiles({
				from: r.nbsLogEntries.screenedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Death Reports (FMDRF/FNDRF)
		// -----------------------------------------------------------------------
		deathReports: {
			facility: r.one.facilities({
				from: r.deathReports.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.deathReports.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.deathReports.patientId,
				to: r.patients.id,
			}),
			certifyingStaff: r.one.staffProfiles({
				from: r.deathReports.certifyingStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// Nutrition Assessments
		// -----------------------------------------------------------------------
		nutritionAssessments: {
			facility: r.one.facilities({
				from: r.nutritionAssessments.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.nutritionAssessments.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.nutritionAssessments.patientId,
				to: r.patients.id,
			}),
			assessedByStaff: r.one.staffProfiles({
				from: r.nutritionAssessments.assessedByStaffId,
				to: r.staffProfiles.id,
			}),
		},

		// -----------------------------------------------------------------------
		// MSW Evaluations (Medical Social Work)
		// -----------------------------------------------------------------------
		mswEvaluations: {
			facility: r.one.facilities({
				from: r.mswEvaluations.facilityId,
				to: r.facilities.id,
			}),
			encounter: r.one.encounters({
				from: r.mswEvaluations.encounterId,
				to: r.encounters.id,
			}),
			patient: r.one.patients({
				from: r.mswEvaluations.patientId,
				to: r.patients.id,
			}),
			evaluatedByStaff: r.one.staffProfiles({
				from: r.mswEvaluations.evaluatedByStaffId,
				to: r.staffProfiles.id,
			}),
			approvedByStaff: r.one.staffProfiles({
				from: r.mswEvaluations.approvedByStaffId,
				to: r.staffProfiles.id,
			}),
		},
	})
)
