import { ApiKeyManagementPage } from "@/features/admin/integrations/components/api-key-management-page"

interface Props {
	params: Promise<{ integrationId: string }>
}

export default async function IntegrationKeysPage({ params }: Props) {
	const { integrationId } = await params
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">API Key Management</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Generate, rotate, and revoke API keys for this integration.
				</p>
			</div>
			<ApiKeyManagementPage integrationId={integrationId} />
		</div>
	)
}
