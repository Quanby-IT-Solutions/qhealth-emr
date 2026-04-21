import { FeatureFlagDetail } from "@/features/feature-flags/components/feature-flag-detail"

interface FeatureFlagDetailPageProps {
	params: Promise<{ flagId: string }>
}

export default async function FeatureFlagDetailPage({ params }: FeatureFlagDetailPageProps) {
	const { flagId } = await params
	return <FeatureFlagDetail flagId={flagId} />
}
