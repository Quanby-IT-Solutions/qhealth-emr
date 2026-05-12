import { ExchangeLogTable } from "@/features/admin/fhir-endpoints/components/exchange-log-table"

export const metadata = { title: "FHIR Exchange Log" }

export default function FhirExchangeLogPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">FHIR Exchange Log</h1>
				<p className="text-sm text-muted-foreground mt-1">History of FHIR resource pushes and pulls with retry capability.</p>
			</div>
			<ExchangeLogTable />
		</div>
	)
}
