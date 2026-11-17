/* eslint-disable no-console */
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { config } from "dotenv"
import { eq, sql } from "drizzle-orm"
import { unzipSync } from "fflate"

import { createDBClient } from "./client.js"
import { loincCodes } from "./schema/index.js"

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
const LOINC_SOURCE_PATH = getArgValue("--source") ?? process.env.LOINC_SOURCE_PATH
const LOINC_LIMIT = Number(process.env.LOINC_LIMIT ?? 0)
const LOINC_DRY_RUN = process.env.LOINC_DRY_RUN === "true" || process.argv.includes("--dry-run")
const BATCH_SIZE = Math.max(1, Number(process.env.LOINC_BATCH_SIZE ?? 500))

type LoincRow = {
	loincNum: string
	component: string | null
	property: string | null
	timeAspect: string | null
	system: string | null
	scale: string | null
	method: string | null
	longCommonName: string | null
	isActive: boolean
}

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

if (!LOINC_SOURCE_PATH) {
	console.error(
		"LOINC_SOURCE_PATH is required. Use the official LOINC download, e.g. pnpm -F @repo/db seed:loinc -- --source C:\\path\\Loinc_2.xx.zip"
	)
	process.exit(1)
}

const db = createDBClient(DATABASE_URL)

function getArgValue(name: string) {
	const index = process.argv.indexOf(name)
	if (index === -1) return undefined
	return process.argv[index + 1]
}

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

function normalizeHeader(value: string) {
	return value
		.trim()
		.replace(/^\uFEFF/, "")
		.toUpperCase()
}

function normalizeText(value: string | undefined) {
	const trimmed = value?.trim().replace(/\s+/g, " ")
	return trimmed ? trimmed : null
}

function parseCsvRows(text: string) {
	const rows: string[][] = []
	let row: string[] = []
	let field = ""
	let inQuotes = false

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index]
		const next = text[index + 1]

		if (char === '"') {
			if (inQuotes && next === '"') {
				field += '"'
				index += 1
			} else {
				inQuotes = !inQuotes
			}
			continue
		}

		if (char === "," && !inQuotes) {
			row.push(field)
			field = ""
			continue
		}

		if ((char === "\n" || char === "\r") && !inQuotes) {
			if (char === "\r" && next === "\n") index += 1
			row.push(field)
			if (row.some(value => value.trim())) rows.push(row)
			row = []
			field = ""
			continue
		}

		field += char
	}

	row.push(field)
	if (row.some(value => value.trim())) rows.push(row)

	return rows
}

function isActiveLoincStatus(status: string | undefined) {
	const normalized = normalizeHeader(status ?? "")
	return normalized !== "DEPRECATED" && normalized !== "DISCOURAGED"
}

function pick(row: Record<string, string>, ...headers: string[]) {
	for (const header of headers) {
		const value = row[header]
		if (value !== undefined) return value
	}
	return undefined
}

function parseLoincCsv(text: string) {
	const csvRows = parseCsvRows(text)
	if (csvRows.length < 2) return []

	const headers = csvRows[0]!.map(normalizeHeader)
	const rowsByCode = new Map<string, LoincRow>()

	for (const values of csvRows.slice(1)) {
		const record: Record<string, string> = {}
		headers.forEach((header, index) => {
			record[header] = values[index] ?? ""
		})

		const loincNum = normalizeText(pick(record, "LOINC_NUM", "LOINCNUM", "LOINC"))
		if (!loincNum || rowsByCode.has(loincNum)) continue

		rowsByCode.set(loincNum, {
			loincNum,
			component: normalizeText(pick(record, "COMPONENT")),
			property: normalizeText(pick(record, "PROPERTY")),
			timeAspect: normalizeText(pick(record, "TIME_ASPCT", "TIME_ASPECT")),
			system: normalizeText(pick(record, "SYSTEM")),
			scale: normalizeText(pick(record, "SCALE_TYP", "SCALE_TYPE")),
			method: normalizeText(pick(record, "METHOD_TYP", "METHOD_TYPE")),
			longCommonName: normalizeText(pick(record, "LONG_COMMON_NAME", "COMMON_TEST_RANK_NAME")),
			isActive: isActiveLoincStatus(pick(record, "STATUS")),
		})
	}

	const rows = [...rowsByCode.values()].sort((left, right) =>
		left.loincNum.localeCompare(right.loincNum)
	)
	return LOINC_LIMIT > 0 ? rows.slice(0, LOINC_LIMIT) : rows
}

function readLoincSource(sourcePath: string) {
	const resolved = resolve(sourcePath)
	const bytes = readFileSync(resolved)

	if (/\.zip$/i.test(resolved)) {
		const files = unzipSync(new Uint8Array(bytes))
		const csvFileName = Object.keys(files)
			.sort()
			.find(fileName => /(^|\/)Loinc(Table(Core)?)?\.csv$/i.test(fileName))

		if (!csvFileName) {
			throw new Error("Could not find Loinc.csv or LoincTableCore.csv in the source zip.")
		}

		console.log(`Parsing LOINC file from zip: ${csvFileName}`)
		return new TextDecoder("utf-8").decode(files[csvFileName])
	}

	console.log(`Parsing LOINC CSV file: ${basename(resolved)}`)
	return bytes.toString("utf-8")
}

export async function importLoincCodes() {
	const sourceRows = parseLoincCsv(readLoincSource(LOINC_SOURCE_PATH!))
	const existingRows = await db
		.select({
			loincNum: loincCodes.loincNum,
			component: loincCodes.component,
			property: loincCodes.property,
			timeAspect: loincCodes.timeAspect,
			system: loincCodes.system,
			scale: loincCodes.scale,
			method: loincCodes.method,
			longCommonName: loincCodes.longCommonName,
			isActive: loincCodes.isActive,
		})
		.from(loincCodes)

	const existingByCode = new Map(existingRows.map(row => [row.loincNum, row]))
	const toInsert = sourceRows.filter(row => !existingByCode.has(row.loincNum))
	const toUpdate = sourceRows.filter(row => {
		const existing = existingByCode.get(row.loincNum)
		if (!existing) return false
		return (
			existing.component !== row.component ||
			existing.property !== row.property ||
			existing.timeAspect !== row.timeAspect ||
			existing.system !== row.system ||
			existing.scale !== row.scale ||
			existing.method !== row.method ||
			existing.longCommonName !== row.longCommonName ||
			existing.isActive !== row.isActive
		)
	})

	console.log(`LOINC rows prepared: ${sourceRows.length}`)
	console.log(`New loinc_codes rows: ${toInsert.length}`)
	console.log(`Existing rows to refresh: ${toUpdate.length}`)

	if (LOINC_DRY_RUN) {
		console.log("Dry run enabled; no database changes were written.")
		return
	}

	let inserted = 0
	for (const batch of chunk(toInsert, BATCH_SIZE)) {
		await db.insert(loincCodes).values(batch)
		inserted += batch.length
	}

	let updated = 0
	for (const row of toUpdate) {
		await db
			.update(loincCodes)
			.set({
				component: row.component,
				property: row.property,
				timeAspect: row.timeAspect,
				system: row.system,
				scale: row.scale,
				method: row.method,
				longCommonName: row.longCommonName,
				isActive: row.isActive,
			})
			.where(eq(loincCodes.loincNum, row.loincNum))
		updated += 1
	}

	const totalResult = await db.select({ count: sql<number>`count(*)` }).from(loincCodes)
	const total = totalResult[0]?.count ?? 0

	console.log(`Inserted ${inserted} LOINC rows.`)
	console.log(`Updated ${updated} existing LOINC rows.`)
	console.log(`loinc_codes total rows: ${total}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
	importLoincCodes().catch(error => {
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	})
}
