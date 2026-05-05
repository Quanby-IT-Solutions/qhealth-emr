import type { ReactNode } from "react"

import { HimRouteGuard } from "@/features/him/components/him-route-guard"

export default function HimLayout({ children }: { children: ReactNode }) {
	return <HimRouteGuard>{children}</HimRouteGuard>
}
