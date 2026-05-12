import { LicenseVerificationPage } from "@/features/admin/clinician-licenses/components/license-verification-page"

interface Props {
	params: Promise<{ clinicianId: string }>
}

export default async function ClinicianLicenseDetailPage({ params }: Props) {
	const { clinicianId } = await params
	return (
		<div className="space-y-6">
			<LicenseVerificationPage staffProfileId={clinicianId} />
		</div>
	)
}
