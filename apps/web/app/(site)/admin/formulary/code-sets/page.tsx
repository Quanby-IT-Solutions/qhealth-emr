import { Suspense } from "react"

import { CodeSetBrowser } from "@/features/formulary/components/code-set-browser"

export default function CodeSetsPage() {
	return (
		<div className="w-full max-w-7xl space-y-6 p-4">
			<div>
				<h1 className="text-2xl font-bold">Clinical Code Sets</h1>
				<p className="text-muted-foreground">
					Search and browse ICD-10, LOINC, RxNorm, and RVS reference codes.
				</p>
			</div>

			<Suspense fallback={<p>Loading code sets...</p>}>
				<CodeSetBrowser />
			</Suspense>
		</div>
	)
}
