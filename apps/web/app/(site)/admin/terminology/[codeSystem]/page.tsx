import { CodeSetPage } from "@/features/admin/terminology/components/code-set-page"

interface Props {
	params: Promise<{ codeSystem: string }>
}

export default async function CodeSystemPage({ params }: Props) {
	const { codeSystem } = await params
	const labels: Record<string, string> = {
		icd10: "ICD-10", snomed: "SNOMED CT", loinc: "LOINC", rxnorm: "RxNorm", rvs: "RVS",
	}
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{labels[codeSystem] ?? codeSystem}</h1>
				<p className="text-sm text-muted-foreground mt-1">Browse, search, and manage code entries.</p>
			</div>
			<CodeSetPage codeSystem={codeSystem} />
		</div>
	)
}
