import { MasterDataCatalogsPage } from "@/features/admin/master-data/components/master-data-catalogs-page"

export const metadata = { title: "Master Data" }

export default function MasterDataPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Master Data</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Manage drug formulary, lab catalog, RVS, and ICD-10 code sets.
				</p>
			</div>
			<MasterDataCatalogsPage />
		</div>
	)
}
