"use client"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"

import { useTestFhirConnectionMutation } from "../api/fhir.hooks"

interface TestConnectionDrawerProps {
	endpointId: string
	endpointName: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function TestConnectionDrawer({
	endpointId,
	endpointName,
	open,
	onOpenChange,
}: TestConnectionDrawerProps) {
	const testMutation = useTestFhirConnectionMutation()

	function handleTest() {
		testMutation.mutate({ id: endpointId })
	}

	const result = testMutation.data
	const isOk = result?.status === "ok"

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Test Connection</SheetTitle>
					<SheetDescription>Testing connectivity to {endpointName}</SheetDescription>
				</SheetHeader>
				<div className="mt-6 space-y-4">
					{testMutation.isPending && (
						<p className="text-muted-foreground animate-pulse text-sm">Connecting...</p>
					)}
					{result && (
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Badge variant={isOk ? "default" : "destructive"}>
									{isOk ? "Connected" : "Failed"}
								</Badge>
								{result.httpStatus != null && (
									<span className="text-muted-foreground text-sm">HTTP {result.httpStatus}</span>
								)}
								{result.latencyMs != null && (
									<span className="text-muted-foreground text-sm">{result.latencyMs}ms</span>
								)}
							</div>
							<p className="text-sm">{result.detail}</p>
						</div>
					)}
					{testMutation.isError && (
						<p className="text-destructive text-sm">Test failed. Check endpoint configuration.</p>
					)}
					<Button onClick={handleTest} disabled={testMutation.isPending} size="sm">
						{testMutation.isPending ? "Testing..." : result ? "Re-test" : "Test Connection"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
