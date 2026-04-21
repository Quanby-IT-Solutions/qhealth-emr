import { IntegrationCreate } from "@/features/integration-registry/components/integration-create"

export default function NewIntegrationPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Add integration</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Register a new external system integration.
				</p>
			</div>
			<IntegrationCreate />
		</div>
	)
}
