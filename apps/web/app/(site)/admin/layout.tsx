import type { ReactNode } from "react"

import { LicenseExpiryBanner } from "@/features/admin/clinician-licenses/components/license-expiry-banner"
import { AdminBreadcrumb } from "@/features/admin/components/admin-breadcrumb"
import { AdminRoleIndicator } from "@/features/admin/components/admin-role-indicator"

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between border-b pb-3">
				<AdminBreadcrumb />
				<AdminRoleIndicator />
			</div>
			<LicenseExpiryBanner />
			{children}
		</div>
	)
}
