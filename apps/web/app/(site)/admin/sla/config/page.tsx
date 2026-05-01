import { SlaConfig } from "@/features/sla/components/sla-config"

export const metadata = { title: "SLA Configuration" }

export default function SlaConfigPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">SLA Configuration</h1>
				<p className="text-sm text-muted-foreground mt-1">Set target minutes and hard caps for each ARTA workflow step.</p>
			</div>
			<SlaConfig />
		</div>
	)
}
