import type { ReactNode } from "react"

import { TriageRouteGuard } from "@/features/triage/components/triage-route-guard"

export default function TriageLayout({ children }: { children: ReactNode }) {
	return <TriageRouteGuard>{children}</TriageRouteGuard>
}
