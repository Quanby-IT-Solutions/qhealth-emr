import provincesData from "philippine-administrative-divisions/dist/provinces.json"
import regionsData from "philippine-administrative-divisions/dist/regions.json"

interface RegionRecord {
	name: string
	provinces: string[]
}

interface ProvinceRecord {
	municipalities: Record<string, { barangays: string[] }>
}

export interface BirthLocation {
	barangay?: string
	municipality?: string
	province?: string
	region?: string
}

const regions = regionsData as RegionRecord[]
const provinces = provincesData as Record<string, ProvinceRecord>

function normalize(value: string | null | undefined) {
	return (value ?? "").trim().toUpperCase()
}

function findProvinceName(value: string | null | undefined) {
	const target = normalize(value)
	if (!target) return undefined

	return Object.keys(provinces).find(province => normalize(province) === target)
}

function findRegionByProvince(province: string | null | undefined) {
	const target = normalize(province)
	if (!target) return undefined

	return regions.find(region => region.provinces.some(item => normalize(item) === target))?.name
}

export function getRegionOptions() {
	return regions.map(region => region.name)
}

export function getProvinceOptions(region?: string) {
	if (!region) return Object.keys(provinces).sort()

	const regionRecord = regions.find(item => normalize(item.name) === normalize(region))
	return regionRecord?.provinces ?? []
}

export function getMunicipalityOptions(province?: string) {
	const provinceName = findProvinceName(province)
	if (!provinceName) return []

	return Object.keys(provinces[provinceName]?.municipalities ?? {}).sort()
}

export function getBarangayOptions(province?: string, municipality?: string) {
	const provinceName = findProvinceName(province)
	const municipalityName = normalize(municipality)
	if (!provinceName || !municipalityName) return []

	const municipalityRecord = Object.entries(provinces[provinceName]?.municipalities ?? {}).find(
		([name]) => normalize(name) === municipalityName
	)

	return municipalityRecord?.[1].barangays ?? []
}

export function findLocationByPatientAddress({
	city,
	province,
}: {
	city?: string | null
	province?: string | null
}): BirthLocation {
	const provinceName = findProvinceName(province)
	if (provinceName) {
		return {
			province: provinceName,
			region: findRegionByProvince(provinceName),
			municipality: getMunicipalityOptions(provinceName).find(
				municipality => normalize(municipality) === normalize(city)
			),
		}
	}

	const cityName = normalize(city)
	if (!cityName) return {}

	for (const [candidateProvince, provinceRecord] of Object.entries(provinces)) {
		const municipality = Object.keys(provinceRecord.municipalities).find(
			name => normalize(name) === cityName
		)

		if (municipality) {
			return {
				municipality,
				province: candidateProvince,
				region: findRegionByProvince(candidateProvince),
			}
		}
	}

	return {}
}
