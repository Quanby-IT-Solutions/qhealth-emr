import { BottleneckAnalysisPage } from "@/features/admin/sla/components/bottleneck-analysis-page"

interface Props {
	params: Promise<{ workflowId: string }>
}

export default async function BottleneckPage({ params }: Props) {
	const { workflowId } = await params
	return (
		<div className="space-y-6">
			<BottleneckAnalysisPage workflowId={workflowId} />
		</div>
	)
}
