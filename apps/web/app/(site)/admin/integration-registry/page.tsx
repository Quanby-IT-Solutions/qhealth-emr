import { IntegrationList } from "@/features/integration-registry/components/integration-list"

export default function AdminIntegrationRegistryPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Integration Registry</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Manage external system integrations, credential references, and sync status.
				</p>
			</div>
			<IntegrationList />
		</div>
	)
}
