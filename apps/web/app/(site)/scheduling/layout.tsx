import type { ReactNode } from "react"

import { SchedulingRouteGuard } from "@/features/scheduling/components/scheduling-route-guard"

export default function SchedulingLayout({ children }: { children: ReactNode }) {
	return <SchedulingRouteGuard>{children}</SchedulingRouteGuard>
}
