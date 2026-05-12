import { TurnaroundReportPage } from "@/features/admin/sla/components/turnaround-report-page"

interface Props {
	params: Promise<{ workflowId: string }>
}

export default async function TurnaroundPage({ params }: Props) {
	const { workflowId } = await params
	return (
		<div className="space-y-6">
			<TurnaroundReportPage workflowId={workflowId} />
		</div>
	)
}
