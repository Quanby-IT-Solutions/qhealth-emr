import type { ReactNode } from "react"

import { AuditorShell } from "@/features/auditor/audit-log/components/auditor-shell"

export default function AuditorLayout({ children }: { children: ReactNode }) {
	return <AuditorShell>{children}</AuditorShell>
}
