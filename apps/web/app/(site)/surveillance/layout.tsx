import { SurveillanceShell } from "@/features/surveillance/components/surveillance-shell"

export default function SurveillanceLayout({ children }: { children: React.ReactNode }) {
	return <SurveillanceShell>{children}</SurveillanceShell>
}
