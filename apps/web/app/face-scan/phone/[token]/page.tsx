import { FaceScanPhonePage } from "@/features/face-scan/components/face-scan-phone-page"

export default async function FaceScanPhoneRoute({
	params,
}: {
	params: Promise<{ token: string }>
}) {
	const { token } = await params
	return <FaceScanPhonePage token={token} />
}
