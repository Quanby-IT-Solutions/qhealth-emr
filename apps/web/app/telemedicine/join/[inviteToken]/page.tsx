import { PatientLiveKitJoinPage } from "@/features/telemedicine/components/patient-livekit-join-page"

export default async function TelemedicinePatientJoinRoute({
	params,
}: {
	params: Promise<{ inviteToken: string }>
}) {
	const { inviteToken } = await params
	return <PatientLiveKitJoinPage inviteToken={inviteToken} />
}
