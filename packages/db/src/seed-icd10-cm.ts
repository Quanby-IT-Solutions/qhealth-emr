/* eslint-disable no-console */
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { config } from "dotenv"
import { eq, sql } from "drizzle-orm"
import { unzipSync } from "fflate"

import { createDBClient } from "./client.js"
import { icd10Codes } from "./schema/index.js"

const seedDir = dirname(fileURLToPath(import.meta.url))
for (const envPath of [
	resolve(seedDir, "../.env"),
	resolve(seedDir, "../../../apps/backend/.env"),
]) {
	if (existsSync(envPath)) {
		config({ path: envPath, override: false })
	}
}

const DATABASE_URL = process.env.DATABASE_URL
const ICD10_CM_SOURCE_URL =
	process.env.ICD10_CM_SOURCE_URL ??
	"https://www.cms.gov/files/zip/april-1-2026-code-descriptions-tabular-order.zip"
const ICD10_CM_LIMIT = Number(process.env.ICD10_CM_LIMIT ?? 0)
const ICD10_CM_DRY_RUN =
	process.env.ICD10_CM_DRY_RUN === "true" || process.argv.includes("--dry-run")
const BATCH_SIZE = Math.max(1, Number(process.env.ICD10_CM_BATCH_SIZE ?? 500))

type Icd10CmRow = {
	code: string
	description: string
	category: string
}

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

const db = createDBClient(DATABASE_URL)

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

function formatIcd10Code(rawCode: string) {
	const code = rawCode.trim().toUpperCase().replace(".", "")
	if (code.length <= 3) return code
	return `${code.slice(0, 3)}.${code.slice(3)}`
}

function getIcd10Category(rawCode: string) {
	const code = rawCode.trim().toUpperCase().replace(".", "")
	const letter = code[0] ?? ""
	const number = Number(code.slice(1, 3))

	if (letter === "A" || letter === "B") return "Certain infectious and parasitic diseases"
	if (letter === "C") return "Neoplasms"
	if (letter === "D" && number <= 49) return "Neoplasms"
	if (letter === "D") return "Diseases of the blood and blood-forming organs"
	if (letter === "E") return "Endocrine, nutritional and metabolic diseases"
	if (letter === "F") return "Mental, behavioral and neurodevelopmental disorders"
	if (letter === "G") return "Diseases of the nervous system"
	if (letter === "H" && number <= 59) return "Diseases of the eye and adnexa"
	if (letter === "H") return "Diseases of the ear and mastoid process"
	if (letter === "I") return "Diseases of the circulatory system"
	if (letter === "J") return "Diseases of the respiratory system"
	if (letter === "K") return "Diseases of the digestive system"
	if (letter === "L") return "Diseases of the skin and subcutaneous tissue"
	if (letter === "M") return "Diseases of the musculoskeletal system and connective tissue"
	if (letter === "N") return "Diseases of the genitourinary system"
	if (letter === "O") return "Pregnancy, childbirth and the puerperium"
	if (letter === "P") return "Certain conditions originating in the perinatal period"
	if (letter === "Q") return "Congenital malformations and chromosomal abnormalities"
	if (letter === "R") return "Symptoms, signs and abnormal clinical and laboratory findings"
	if (letter === "S" || letter === "T") return "Injury, poisoning and external causes"
	if (letter === "U") return "Codes for special purposes"
	if (letter === "V" || letter === "W" || letter === "X" || letter === "Y")
		return "External causes of morbidity"
	if (letter === "Z") return "Factors influencing health status and contact with health services"

	return "ICD-10-CM"
}

function parseIcd10CmCodes(text: string) {
	const rowsByCode = new Map<string, Icd10CmRow>()

	for (const line of text.split(/\r?\n/)) {
		const match = /^([A-Z][0-9A-Z]{2,6})\s+(.+)$/.exec(line.trim())
		if (!match) continue

		const rawCode = match[1]!
		const description = match[2]!.trim().replace(/\s+/g, " ")
		const code = formatIcd10Code(rawCode)
		if (!code || !description || rowsByCode.has(code)) continue

		rowsByCode.set(code, {
			code,
			description,
			category: getIcd10Category(rawCode),
		})
	}

	const rows = [...rowsByCode.values()].sort((left, right) => left.code.localeCompare(right.code))
	return ICD10_CM_LIMIT > 0 ? rows.slice(0, ICD10_CM_LIMIT) : rows
}

async function fetchIcd10CmRows() {
	console.log(`Fetching ICD-10-CM source: ${ICD10_CM_SOURCE_URL}`)

	const response = await fetch(ICD10_CM_SOURCE_URL)
	if (!response.ok) {
		throw new Error(`ICD-10-CM request failed: ${response.status} ${response.statusText}`)
	}

	const zipBytes = new Uint8Array(await response.arrayBuffer())
	const files = unzipSync(zipBytes)
	const codeFileName = Object.keys(files)
		.sort()
		.find(fileName => /icd10cm_codes_\d{4}\.txt$/i.test(fileName))

	if (!codeFileName) {
		throw new Error("ICD-10-CM code-description text file was not found in the source zip.")
	}

	console.log(`Parsing ICD-10-CM file: ${codeFileName}`)

	const text = new TextDecoder("utf-8").decode(files[codeFileName])
	return parseIcd10CmCodes(text)
}

export async function importIcd10CmCodes() {
	const sourceRows = await fetchIcd10CmRows()
	const existingRows = await db
		.select({
			code: icd10Codes.code,
			description: icd10Codes.description,
			category: icd10Codes.category,
			isActive: icd10Codes.isActive,
		})
		.from(icd10Codes)

	const existingByCode = new Map(existingRows.map(row => [row.code, row]))
	const toInsert = sourceRows.filter(row => !existingByCode.has(row.code))
	const toUpdate = sourceRows.filter(row => {
		const existing = existingByCode.get(row.code)
		if (!existing) return false
		return (
			existing.description !== row.description ||
			existing.category !== row.category ||
			existing.isActive !== true
		)
	})

	console.log(`ICD-10-CM codes prepared: ${sourceRows.length}`)
	console.log(`New icd10_codes rows: ${toInsert.length}`)
	console.log(`Existing rows to refresh: ${toUpdate.length}`)

	if (ICD10_CM_DRY_RUN) {
		console.log("Dry run enabled; no database changes were written.")
		return
	}

	let inserted = 0
	for (const batch of chunk(toInsert, BATCH_SIZE)) {
		await db.insert(icd10Codes).values(
			batch.map(row => ({
				code: row.code,
				description: row.description,
				category: row.category,
				isActive: true,
			}))
		)
		inserted += batch.length
	}

	let updated = 0
	for (const row of toUpdate) {
		await db
			.update(icd10Codes)
			.set({
				description: row.description,
				category: row.category,
				isActive: true,
			})
			.where(eq(icd10Codes.code, row.code))
		updated += 1
	}

	const totalResult = await db.select({ count: sql<number>`count(*)` }).from(icd10Codes)
	const total = totalResult[0]?.count ?? 0

	console.log(`Inserted ${inserted} ICD-10-CM rows.`)
	console.log(`Updated ${updated} existing ICD-10-CM rows.`)
	console.log(`icd10_codes total rows: ${total}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
	importIcd10CmCodes().catch(error => {
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	})
}
