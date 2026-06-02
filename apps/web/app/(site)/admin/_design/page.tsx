import { env } from "@/env"
import { AdminPageHeader } from "@/features/admin/components/admin-page-header"
import { DesignShowcase } from "@/features/admin/components/design-showcase"

export const metadata = { title: "Design System — Admin" }

export default function AdminDesignPage() {
	if (env.NODE_ENV !== "development") {
		return (
			<div className="text-muted-foreground py-16 text-center text-sm">
				Design showcase is only available in development mode.
			</div>
		)
	}

	return (
		<div className="space-y-8">
			<AdminPageHeader
				title="Design System"
				description="Admin component library — all primitives with representative states."
			/>
			<DesignShowcase />
		</div>
	)
}
