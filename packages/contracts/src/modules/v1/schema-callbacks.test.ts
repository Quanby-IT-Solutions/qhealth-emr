import { describe, expect, it } from "vitest"

import { ClinicianLicenseSchema } from "./clinician-licenses/clinician-licenses.schema.js"
import {
	ApiKeySchema,
	IntegrationSchema,
	RotatedApiKeyResponseSchema,
} from "./integration-registry/integration-registry.schema.js"
import { CreateMedOrderSchema, ImagingOrderListSchema } from "./orders/orders.schema.js"
import {
	PatientSchema,
	RegisterPatientWithOpdEncounterInputSchema,
} from "./patients/patients.schema.js"
import { AllergyListSchema } from "./problems-allergies/problems-allergies.schema.js"
import {
	CreateUserWithFacilitiesSchema,
	FacilitySchema,
	ListUsersQuerySchema,
	RolePermissionSchema,
	RoleSchema,
	StaffProfileSchema,
	UserRoleSchema,
	UserSummarySchema,
} from "./rbac/rbac.schema.js"

const ID = "550e8400-e29b-41d4-a716-446655440000"
const OTHER_ID = "550e8400-e29b-41d4-a716-446655440001"
const THIRD_ID = "550e8400-e29b-41d4-a716-446655440002"
const ISO_TIMESTAMP = "2026-01-01T00:00:00.000Z"
const DATE_TIMESTAMP = new Date(ISO_TIMESTAMP)

describe("schema callback coverage", () => {
	it("coerces clinician license timestamps from strings and preserves Date objects", () => {
		for (const timestamp of [ISO_TIMESTAMP, DATE_TIMESTAMP]) {
			const result = ClinicianLicenseSchema.parse({
				id: ID,
				staffProfileId: OTHER_ID,
				licenseType: "PRC",
				licenseNumber: "PRC-1001",
				issueDate: "2025-01-01",
				expiryDate: "2027-01-01",
				documentUri: null,
				status: "verified",
				verificationProof: null,
				verifiedAt: timestamp,
				createdAt: timestamp,
				updatedAt: timestamp,
			})

			expect(result.verifiedAt).toBeInstanceOf(Date)
			expect(result.createdAt).toBeInstanceOf(Date)
			expect(result.updatedAt).toBeInstanceOf(Date)
		}
	})

	it("coerces integration and API-key timestamps from strings and preserves Date objects", () => {
		for (const timestamp of [ISO_TIMESTAMP, DATE_TIMESTAMP]) {
			const integration = IntegrationSchema.parse({
				id: ID,
				facilityId: OTHER_ID,
				kind: "fhir",
				name: "FHIR endpoint",
				endpointUrl: "https://example.test/fhir",
				credentialsRef: null,
				webhookUrl: null,
				enabled: true,
				notes: null,
				lastSyncAt: timestamp,
				lastSyncStatus: "ok",
				lastTestedAt: timestamp,
				lastTestStatus: "ok",
				lastTestReadinessLevel: "activation",
				credentialStatus: "ok",
				createdAt: timestamp,
				updatedAt: timestamp,
			})
			const apiKey = ApiKeySchema.parse({
				id: ID,
				integrationId: OTHER_ID,
				label: "primary",
				keyPrefix: "qh_live",
				createdBy: "admin",
				createdAt: timestamp,
				revokedAt: timestamp,
			})
			const rotatedApiKey = RotatedApiKeyResponseSchema.parse({
				...apiKey,
				rawKey: "secret",
				oldKeyRevokedAt: timestamp,
			})

			expect(integration.lastTestedAt).toBeInstanceOf(Date)
			expect(apiKey.revokedAt).toBeInstanceOf(Date)
			expect(rotatedApiKey.oldKeyRevokedAt).toBeInstanceOf(Date)
		}
	})

	it("coerces patient timestamps and requires triage before outpatient registration", () => {
		for (const timestamp of [ISO_TIMESTAMP, DATE_TIMESTAMP]) {
			const patient = PatientSchema.parse({
				id: ID,
				facilityId: OTHER_ID,
				mrn: "MRN-001",
				firstName: "Ana",
				lastName: "Santos",
				middleName: null,
				dateOfBirth: "1980-01-01",
				sex: "female",
				addressLine1: null,
				addressLine2: null,
				city: null,
				province: null,
				zipCode: null,
				phone: null,
				email: null,
				philhealthMemberId: null,
				emergencyContactName: null,
				emergencyContactPhone: null,
				nextOfKinName: null,
				nextOfKinRelationship: null,
				isActive: true,
				createdAt: timestamp,
				updatedAt: timestamp,
			})

			expect(patient.createdAt).toBeInstanceOf(Date)
			expect(patient.updatedAt).toBeInstanceOf(Date)
		}

		const registration = {
			facilityId: ID,
			firstName: "Ana",
			lastName: "Santos",
			dateOfBirth: "1980-01-01",
			sex: "female" as const,
			clinicianStaffId: OTHER_ID,
		}

		expect(RegisterPatientWithOpdEncounterInputSchema.safeParse(registration).success).toBe(false)
		expect(
			RegisterPatientWithOpdEncounterInputSchema.safeParse({
				...registration,
				pendingTriageId: THIRD_ID,
			}).success
		).toBe(true)
	})

	it("coerces allergy-list boolean query strings", () => {
		expect(
			AllergyListSchema.parse({
				patientId: ID,
				isActive: "true",
				isVerified: "false",
			})
		).toMatchObject({
			isActive: true,
			isVerified: false,
		})
	})

	it("validates medication duration and imaging-list scope refinements", () => {
		expect(
			CreateMedOrderSchema.safeParse({
				facilityId: ID,
				genericName: "Morphine",
				dose: "10",
				doseUnit: "mg",
				doseForm: "tablet",
				route: "PO",
				frequency: "bid",
				isControlledSubstance: true,
				pdeaSchedule: "S2",
				durationDays: 30,
			}).success
		).toBe(true)

		expect(ImagingOrderListSchema.safeParse({ facilityId: ID }).success).toBe(true)
		expect(ImagingOrderListSchema.safeParse({ encounterId: ID }).success).toBe(true)
		expect(ImagingOrderListSchema.safeParse({ preEncounterId: ID }).success).toBe(true)
		expect(ImagingOrderListSchema.safeParse({}).success).toBe(false)
	})

	it("coerces RBAC timestamps from strings and preserves Date objects", () => {
		for (const timestamp of [ISO_TIMESTAMP, DATE_TIMESTAMP]) {
			const facility = FacilitySchema.parse({
				id: ID,
				name: "QHealth General Hospital",
				facilityType: "tertiary",
				address: null,
				dohLicenseNumber: null,
				philhealthAccreditationId: null,
				createdAt: timestamp,
				updatedAt: timestamp,
			})
			const staffProfile = StaffProfileSchema.parse({
				id: ID,
				userId: "user-1",
				facilityId: OTHER_ID,
				employeeNumber: null,
				department: null,
				prcLicenseNumber: null,
				prcExpiry: null,
				ptrNumber: null,
				ptrExpiry: null,
				pdeaS2License: null,
				pdeaS2Expiry: null,
				isActive: true,
				createdAt: timestamp,
				updatedAt: timestamp,
			})
			const role = RoleSchema.parse({
				id: ID,
				facilityId: OTHER_ID,
				name: "Nurse",
				description: null,
				isSystemDefault: false,
				isArchived: true,
				archivedAt: timestamp,
				createdAt: timestamp,
			})
			const permission = RolePermissionSchema.parse({
				id: ID,
				roleId: OTHER_ID,
				module: "nursing",
				action: "read",
				createdAt: timestamp,
			})
			const userRole = UserRoleSchema.parse({
				id: ID,
				staffProfileId: OTHER_ID,
				roleId: THIRD_ID,
				isPrimary: true,
				createdAt: timestamp,
			})
			const user = UserSummarySchema.parse({
				id: "user-1",
				name: "Ana Santos",
				email: "ana@example.test",
				createdAt: timestamp,
			})

			expect(facility.createdAt).toBeInstanceOf(Date)
			expect(staffProfile.createdAt).toBeInstanceOf(Date)
			expect(role.archivedAt).toBeInstanceOf(Date)
			expect(permission.createdAt).toBeInstanceOf(Date)
			expect(userRole.createdAt).toBeInstanceOf(Date)
			expect(user.createdAt).toBeInstanceOf(Date)
		}
	})

	it("validates RBAC facility memberships and boolean query strings", () => {
		const membership = {
			facilityId: ID,
			roleIds: [OTHER_ID],
			isPrimary: true,
		}
		const user = {
			name: "Ana Santos",
			email: "ana@example.test",
			password: "password",
			facilities: [membership],
		}

		expect(CreateUserWithFacilitiesSchema.safeParse(user).success).toBe(true)
		expect(
			CreateUserWithFacilitiesSchema.safeParse({
				...user,
				facilities: [{ ...membership, isPrimary: false }],
			}).success
		).toBe(false)
		expect(
			CreateUserWithFacilitiesSchema.safeParse({
				...user,
				facilities: [membership, { ...membership, isPrimary: false }],
			}).success
		).toBe(false)

		expect(ListUsersQuerySchema.parse({ isActive: "true" }).isActive).toBe(true)
		expect(ListUsersQuerySchema.parse({ isActive: "false" }).isActive).toBe(false)
		expect(ListUsersQuerySchema.parse({ isActive: true }).isActive).toBe(true)
	})
})
