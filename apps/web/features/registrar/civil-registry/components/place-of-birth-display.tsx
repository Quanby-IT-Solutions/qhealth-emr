import type { BirthLocation } from "@/features/registrar/civil-registry/lib/philippines-locations"

export function PlaceOfBirthDisplay({
	barangay,
	municipality,
	province,
	region,
}: BirthLocation) {
	const parts = [
		barangay ? `Barangay ${barangay.replace(/^barangay\s+/i, "")}` : undefined,
		municipality,
		province,
		region,
	].filter(Boolean)

	return (
		<p className="rounded-lg border border-dashed border-border/70 bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
			{parts.length > 0 ? parts.join(", ") : "No place of birth location selected."}
		</p>
	)
}
