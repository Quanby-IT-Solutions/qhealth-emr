import { Injectable, Logger } from "@nestjs/common"
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib"
import QRCode from "qrcode"
import { Builder } from "xml2js"

import { birthRegistrations, deathCertificateRegistrations } from "@repo/db/schema"

import { FileStorageService } from "@/common/file-storage/file-storage.service"

type BirthRegistrationRow = typeof birthRegistrations.$inferSelect
type DeathCertificateRegistrationRow = typeof deathCertificateRegistrations.$inferSelect

@Injectable()
export class LcrArtifactGeneratorService {
	private readonly logger = new Logger(LcrArtifactGeneratorService.name)
	private readonly xmlBuilder = new Builder({
		xmldec: { version: "1.0", encoding: "UTF-8" },
		renderOpts: { pretty: true },
	})

	constructor(private readonly fileStorageService: FileStorageService) {}

	async generateBirthCertificateArtifacts(
		registration: BirthRegistrationRow
	): Promise<{ pdfUrl: string; xmlUrl: string }> {
		const [pdf, xml] = await Promise.all([
			this.generateBirthCertificatePdf(registration),
			this.generateBirthCertificateXml(registration),
		])

		const year = registration.birthDatetime.getFullYear()
		const [pdfUrl, xmlUrl] = await Promise.all([
			this.fileStorageService.uploadLcrArtifact(pdf, {
				facilityId: registration.facilityId,
				certificateType: "birth",
				registrationId: registration.id,
				artifactType: "pdf",
				year,
			}),
			this.fileStorageService.uploadLcrArtifact(Buffer.from(xml, "utf8"), {
				facilityId: registration.facilityId,
				certificateType: "birth",
				registrationId: registration.id,
				artifactType: "xml",
				year,
			}),
		])

		this.logger.log(`Generated LCR birth artifacts registrationId=${registration.id}`)
		return { pdfUrl, xmlUrl }
	}

	async generateDeathCertificateArtifacts(
		registration: DeathCertificateRegistrationRow
	): Promise<{ pdfUrl: string; xmlUrl: string }> {
		const [pdf, xml] = await Promise.all([
			this.generateDeathCertificatePdf(registration),
			this.generateDeathCertificateXml(registration),
		])

		const year = registration.deathDatetime.getFullYear()
		const [pdfUrl, xmlUrl] = await Promise.all([
			this.fileStorageService.uploadLcrArtifact(pdf, {
				facilityId: registration.facilityId,
				certificateType: "death",
				registrationId: registration.id,
				artifactType: "pdf",
				year,
			}),
			this.fileStorageService.uploadLcrArtifact(Buffer.from(xml, "utf8"), {
				facilityId: registration.facilityId,
				certificateType: "death",
				registrationId: registration.id,
				artifactType: "xml",
				year,
			}),
		])

		this.logger.log(`Generated LCR death artifacts registrationId=${registration.id}`)
		return { pdfUrl, xmlUrl }
	}

	private async generateBirthCertificatePdf(registration: BirthRegistrationRow): Promise<Buffer> {
		return this.generateCertificatePdf({
			title: "CERTIFICATE OF LIVE BIRTH",
			certificateNumber: registration.certificateNumber,
			verificationId: `birth:${registration.id}`,
			sections: [
				{
					heading: "Child and Birth Information",
					rows: [
						["Registration ID", registration.id],
						["Patient ID", registration.patientId],
						["Date and Time of Birth", registration.birthDatetime.toLocaleString("en-PH")],
						[
							"Place of Birth",
							[
								registration.placeOfBirthBarangay,
								registration.placeOfBirthMunicipality,
								registration.placeOfBirthProvince,
								registration.placeOfBirthRegion,
							]
								.filter(Boolean)
								.join(", "),
						],
						["Attendant at Birth", registration.attendantAtBirth],
					],
				},
				{
					heading: "Parents Information",
					rows: [
						["Mother", registration.motherName],
						["Father", registration.fatherName],
					],
				},
				{
					heading: "Physician Certification",
					rows: [
						["Physician", registration.physicianName],
						["PRC License No.", registration.physicianLicenseNo],
						["Signature Captured", registration.physicianSignature ? "Yes" : "No"],
					],
				},
			],
		})
	}

	private async generateDeathCertificatePdf(
		registration: DeathCertificateRegistrationRow
	): Promise<Buffer> {
		return this.generateCertificatePdf({
			title: "CERTIFICATE OF DEATH",
			certificateNumber: registration.certificateNumber,
			verificationId: `death:${registration.id}`,
			sections: [
				{
					heading: "Deceased Information",
					rows: [
						["Registration ID", registration.id],
						["Name", registration.deceasedName],
						["MRN", registration.deceasedMrn],
						["Age at Death", registration.ageAtDeathYears?.toString()],
						["Address", registration.deceasedAddress],
						["Date and Time of Death", registration.deathDatetime.toLocaleString("en-PH")],
						["Place of Death", registration.placeOfDeath],
					],
				},
				{
					heading: "Cause of Death",
					rows: [
						["Immediate", registration.causeOfDeathImmediate],
						["Antecedent", registration.causeOfDeathAntecedent],
						["Underlying", registration.causeOfDeathUnderlying],
						["Contributing", registration.causeOfDeathContributing],
					],
				},
				{
					heading: "Certification and Informant",
					rows: [
						["Informant", registration.informantName],
						["Relationship", registration.informantRelationship],
						["Physician", registration.physicianName],
						["PRC License No.", registration.physicianLicenseNo],
						["Signature Captured", registration.physicianSignature ? "Yes" : "No"],
					],
				},
			],
		})
	}

	private generateBirthCertificateXml(registration: BirthRegistrationRow): string {
		return this.xmlBuilder.buildObject({
			BirthCertificateSubmission: {
				$: { schemaVersion: "1.0" },
				RegistrationId: registration.id,
				CertificateNumber: registration.certificateNumber,
				FacilityId: registration.facilityId,
				PatientId: registration.patientId,
				BirthDatetime: registration.birthDatetime.toISOString(),
				PlaceOfBirth: {
					Barangay: registration.placeOfBirthBarangay,
					Municipality: registration.placeOfBirthMunicipality,
					Province: registration.placeOfBirthProvince,
					Region: registration.placeOfBirthRegion,
				},
				Parents: {
					MotherName: registration.motherName,
					FatherName: registration.fatherName,
				},
				PhysicianCertification: {
					PhysicianName: registration.physicianName,
					LicenseNumber: registration.physicianLicenseNo,
					Signed: Boolean(registration.physicianSignature),
				},
			},
		})
	}

	private generateDeathCertificateXml(registration: DeathCertificateRegistrationRow): string {
		return this.xmlBuilder.buildObject({
			DeathCertificateSubmission: {
				$: { schemaVersion: "1.0" },
				RegistrationId: registration.id,
				CertificateNumber: registration.certificateNumber,
				FacilityId: registration.facilityId,
				PatientId: registration.patientId,
				DeathDatetime: registration.deathDatetime.toISOString(),
				Deceased: {
					Name: registration.deceasedName,
					Mrn: registration.deceasedMrn,
					AgeAtDeathYears: registration.ageAtDeathYears,
					Address: registration.deceasedAddress,
					PlaceOfDeath: registration.placeOfDeath,
				},
				CauseOfDeath: {
					Immediate: registration.causeOfDeathImmediate,
					Antecedent: registration.causeOfDeathAntecedent,
					Underlying: registration.causeOfDeathUnderlying,
					Contributing: registration.causeOfDeathContributing,
				},
				Informant: {
					Name: registration.informantName,
					Relationship: registration.informantRelationship,
				},
				PhysicianCertification: {
					PhysicianName: registration.physicianName,
					LicenseNumber: registration.physicianLicenseNo,
					Signed: Boolean(registration.physicianSignature),
				},
			},
		})
	}

	private async generateCertificatePdf(input: {
		title: string
		certificateNumber: string | null
		verificationId: string
		sections: Array<{ heading: string; rows: Array<[string, string | null | undefined]> }>
	}): Promise<Buffer> {
		const document = await PDFDocument.create()
		const page = document.addPage([612, 792])
		const regular = await document.embedFont(StandardFonts.Helvetica)
		const bold = await document.embedFont(StandardFonts.HelveticaBold)
		const qrDataUrl = await QRCode.toDataURL(input.verificationId, { margin: 1, width: 96 })
		const qrImage = await document.embedPng(qrDataUrl)
		const { width, height } = page.getSize()
		let y = height - 48

		page.drawText("REPUBLIC OF THE PHILIPPINES", {
			x: 72,
			y,
			size: 10,
			font: bold,
			color: rgb(0.2, 0.2, 0.2),
		})
		y -= 14
		page.drawText("PHILIPPINE STATISTICS AUTHORITY / LOCAL CIVIL REGISTRY", {
			x: 72,
			y,
			size: 10,
			font: bold,
			color: rgb(0.2, 0.2, 0.2),
		})
		page.drawText(`Certificate No: ${input.certificateNumber ?? "Pending"}`, {
			x: width - 220,
			y: height - 48,
			size: 9,
			font: regular,
			color: rgb(0.2, 0.2, 0.2),
		})

		y -= 38
		page.drawText(input.title, { x: 72, y, size: 18, font: bold, color: rgb(0.05, 0.05, 0.05) })

		page.drawText("QHEALTH EMR GENERATED LCR COPY", {
			x: 120,
			y: 380,
			size: 28,
			font: bold,
			color: rgb(0.88, 0.88, 0.88),
			rotate: degrees(32),
		})

		y -= 34
		for (const section of input.sections) {
			page.drawText(section.heading.toUpperCase(), { x: 72, y, size: 11, font: bold })
			y -= 18
			for (const [label, value] of section.rows) {
				page.drawText(label, { x: 90, y, size: 9, font: bold, color: rgb(0.25, 0.25, 0.25) })
				page.drawText(this.truncate(value || "-", 72), {
					x: 230,
					y,
					size: 9,
					font: regular,
					color: rgb(0.1, 0.1, 0.1),
				})
				y -= 15
			}
			y -= 12
		}

		page.drawImage(qrImage, { x: width - 150, y: 72, width: 86, height: 86 })
		page.drawText("Verification QR", { x: width - 145, y: 58, size: 8, font: regular })
		page.drawText(`Generated ${new Date().toLocaleString("en-PH")}`, {
			x: 72,
			y: 58,
			size: 8,
			font: regular,
			color: rgb(0.4, 0.4, 0.4),
		})

		return Buffer.from(await document.save())
	}

	private truncate(value: string, maxLength: number): string {
		return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
	}
}
