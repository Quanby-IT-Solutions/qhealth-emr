import type { ReactNode } from "react"

import { MswShell } from "@/features/msw/components/msw-shell"

export default function MswLayout({ children }: { children: ReactNode }) {
	return <MswShell>{children}</MswShell>
}
