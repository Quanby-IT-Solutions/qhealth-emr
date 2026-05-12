import type { ReactNode } from "react"

import { BillingShell } from "@/features/billing/components/billing-shell"

export default function BillingLayout({ children }: { children: ReactNode }) {
	return <BillingShell>{children}</BillingShell>
}
