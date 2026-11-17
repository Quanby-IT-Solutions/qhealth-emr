import { PublicOrderAccessPage } from "@/features/orders/components/public-order-access-page"

export default async function PublicLabRequestPage({
	params,
}: {
	params: Promise<{ token: string }>
}) {
	const { token } = await params
	return <PublicOrderAccessPage token={token} />
}
