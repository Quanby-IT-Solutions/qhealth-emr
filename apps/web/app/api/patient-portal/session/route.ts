import { NextResponse } from "next/server"

import {
	createPortalSessionCookie,
	getPatientPortalCookieOptions,
	PATIENT_PORTAL_COOKIE,
	verifyPatientPortalIdentity,
} from "@/features/patient-portal/lib/patient-portal-records"

type PortalLoginRequest = {
	mrn?: string
	dateOfBirth?: string
}

export async function POST(request: Request) {
	let body: PortalLoginRequest

	try {
		body = (await request.json()) as PortalLoginRequest
	} catch {
		return NextResponse.json({ message: "Invalid patient portal login request." }, { status: 400 })
	}

	if (!body.mrn?.trim() || !body.dateOfBirth?.trim()) {
		return NextResponse.json({ message: "MRN and date of birth are required." }, { status: 400 })
	}

	const patient = await verifyPatientPortalIdentity(body.mrn, body.dateOfBirth)

	if (!patient) {
		return NextResponse.json(
			{ message: "MRN and date of birth do not match a patient record." },
			{ status: 404 }
		)
	}

	const response = NextResponse.json({
		patient: {
			mrn: patient.mrn,
			name: `${patient.first_name} ${patient.last_name}`,
			dateOfBirth: patient.date_of_birth,
		},
	})

	response.cookies.set(
		PATIENT_PORTAL_COOKIE,
		createPortalSessionCookie({
			patientId: patient.id,
			mrn: patient.mrn,
			dateOfBirth: patient.date_of_birth,
			issuedAt: Math.floor(Date.now() / 1000),
		}),
		getPatientPortalCookieOptions()
	)

	return response
}

export async function DELETE() {
	const response = NextResponse.json({ ok: true })

	response.cookies.set(PATIENT_PORTAL_COOKIE, "", {
		...getPatientPortalCookieOptions(),
		maxAge: 0,
	})

	return response
}
