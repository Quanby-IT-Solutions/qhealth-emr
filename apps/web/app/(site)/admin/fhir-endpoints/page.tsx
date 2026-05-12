import { FhirEndpointConfigForm } from "@/features/admin/fhir-endpoints/components/fhir-endpoint-config-form"

export const metadata = { title: "FHIR Endpoint Configuration" }

export default function FhirEndpointsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">FHIR Endpoint Configuration</h1>
				<p className="text-sm text-muted-foreground mt-1">Configure external FHIR server connections, authentication, and sync schedule.</p>
			</div>
			<FhirEndpointConfigForm />
		</div>
	)
}
