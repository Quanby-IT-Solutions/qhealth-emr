"use client"

import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	getBarangayOptions,
	getMunicipalityOptions,
	getProvinceOptions,
	getRegionOptions,
	type BirthLocation,
} from "@/features/registrar/civil-registry/lib/philippines-locations"

interface LocationPickerProps {
	value: BirthLocation
	onLocationChange: (location: BirthLocation) => void
}

function selectedValue(value: string | undefined) {
	return value && value.trim() ? value : null
}

export function LocationPicker({ value, onLocationChange }: LocationPickerProps) {
	const regions = getRegionOptions()
	const provinces = getProvinceOptions(value.region)
	const municipalities = getMunicipalityOptions(value.province)
	const barangays = getBarangayOptions(value.province, value.municipality)

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="space-y-1.5">
				<Label>Region</Label>
				<Select
					value={selectedValue(value.region)}
					onValueChange={next =>
						onLocationChange({
							region: String(next ?? ""),
							province: undefined,
							municipality: undefined,
							barangay: undefined,
						})
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{value.region || "Select region"}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{regions.map(region => (
							<SelectItem key={region} value={region}>
								{region}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label>Province</Label>
				<Select
					value={selectedValue(value.province)}
					onValueChange={next =>
						onLocationChange({
							...value,
							province: String(next ?? ""),
							municipality: undefined,
							barangay: undefined,
						})
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{value.province || "Select province"}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{provinces.map(province => (
							<SelectItem key={province} value={province}>
								{province}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label>Municipality / City</Label>
				<Select
					value={selectedValue(value.municipality)}
					onValueChange={next =>
						onLocationChange({
							...value,
							municipality: String(next ?? ""),
							barangay: undefined,
						})
					}
					disabled={!value.province}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{value.municipality || "Select municipality / city"}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{municipalities.map(municipality => (
							<SelectItem key={municipality} value={municipality}>
								{municipality}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1.5">
				<Label>Barangay</Label>
				<Select
					value={selectedValue(value.barangay)}
					onValueChange={next => onLocationChange({ ...value, barangay: String(next ?? "") })}
					disabled={!value.province || !value.municipality}
				>
					<SelectTrigger className="w-full">
						<SelectValue>{value.barangay || "Select barangay"}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{barangays.map(barangay => (
							<SelectItem key={barangay} value={barangay}>
								{barangay}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
