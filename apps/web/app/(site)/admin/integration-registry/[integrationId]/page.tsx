import { IntegrationDetail } from "@/features/integration-registry/components/integration-detail"

interface IntegrationDetailPageProps {
	params: Promise<{ integrationId: string }>
}

export default async function IntegrationDetailPage({ params }: IntegrationDetailPageProps) {
	const { integrationId } = await params
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Integration details</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Configure the integration endpoint, credentials, and sync settings.
				</p>
			</div>
			<IntegrationDetail integrationId={integrationId} />
		</div>
	)
}
