import { CatalogEditorPage } from "@/features/admin/master-data/components/catalog-editor-page"

export const metadata = { title: "Catalog Editor" }

interface Props {
	params: Promise<{ catalogId: string }>
}

export default async function CatalogEditorPageRoute({ params }: Props) {
	const { catalogId } = await params
	return <CatalogEditorPage catalogId={catalogId} />
}
