import { SlaDashboard } from "@/features/sla/components/sla-dashboard"

export const metadata = { title: "SLA Status Log" }

export default function SlaStatusLogPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Workflow Status Log</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Real-time SLA breach monitoring and workflow step log.
				</p>
			</div>
			<SlaDashboard />
		</div>
	)
}
