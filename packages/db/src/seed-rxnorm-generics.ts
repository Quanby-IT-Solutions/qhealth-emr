/* eslint-disable no-console */
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { config } from "dotenv"
import { and, eq, isNull, sql } from "drizzle-orm"

import { createDBClient } from "./client.js"
import { drugGenerics } from "./schema/index.js"

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
const RXNORM_BASE_URL = process.env.RXNORM_BASE_URL ?? "https://rxnav.nlm.nih.gov/REST"
const RXNORM_TTYS = (process.env.RXNORM_TTYS ?? "IN MIN PIN")
	.split(/[,\s]+/)
	.map(tty => tty.trim().toUpperCase())
	.filter(Boolean)
const RXNORM_LIMIT = Number(process.env.RXNORM_LIMIT ?? 0)
const RXNORM_DRY_RUN = process.env.RXNORM_DRY_RUN === "true" || process.argv.includes("--dry-run")
const BATCH_SIZE = Number(process.env.RXNORM_BATCH_SIZE ?? 500)

type RxNormConcept = {
	rxcui?: string
	name?: string
	tty?: string
}

type RxNormAllConceptsResponse = {
	minConceptGroup?: {
		minConcept?: RxNormConcept[]
	}
}

if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

if (RXNORM_TTYS.length === 0) {
	console.error("RXNORM_TTYS must include at least one RxNorm term type, e.g. IN MIN PIN.")
	process.exit(1)
}

const db = createDBClient(DATABASE_URL)

function normalizeDrugName(name: string) {
	return name.trim().replace(/\s+/g, " ").toLowerCase()
}

function sanitizeDrugName(name: string) {
	return name.trim().replace(/\s+/g, " ")
}

function chunk<T>(items: T[], size: number) {
	const chunks: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size))
	}
	return chunks
}

async function fetchRxNormIngredientConcepts() {
	const url = new URL(`${RXNORM_BASE_URL.replace(/\/$/, "")}/allconcepts.json`)
	url.searchParams.set("tty", RXNORM_TTYS.join(" "))

	console.log(`Fetching RxNorm concepts: ${url.toString()}`)

	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`RxNorm request failed: ${response.status} ${response.statusText}`)
	}

	const payload = (await response.json()) as RxNormAllConceptsResponse
	const concepts = payload.minConceptGroup?.minConcept ?? []

	const uniqueByName = new Map<string, { genericName: string; rxnormCode: string | null }>()
	for (const concept of concepts) {
		if (!concept.name) continue

		const genericName = sanitizeDrugName(concept.name)
		const normalizedName = normalizeDrugName(genericName)
		if (!normalizedName) continue

		const existing = uniqueByName.get(normalizedName)
		if (existing?.rxnormCode) continue

		uniqueByName.set(normalizedName, {
			genericName,
			rxnormCode: concept.rxcui ?? null,
		})
	}

	const values = [...uniqueByName.values()].sort((left, right) =>
		left.genericName.localeCompare(right.genericName)
	)

	return RXNORM_LIMIT > 0 ? values.slice(0, RXNORM_LIMIT) : values
}

export async function importRxNormGenerics() {
	const rxnormGenerics = await fetchRxNormIngredientConcepts()
	const existingGenerics = await db
		.select({
			id: drugGenerics.id,
			genericName: drugGenerics.genericName,
			rxnormCode: drugGenerics.rxnormCode,
		})
		.from(drugGenerics)

	const existingByName = new Map(
		existingGenerics.map(row => [normalizeDrugName(row.genericName), row])
	)
	const toInsert = rxnormGenerics.filter(
		generic => !existingByName.has(normalizeDrugName(generic.genericName))
	)
	const toUpdate = rxnormGenerics
		.map(generic => ({
			...generic,
			existing: existingByName.get(normalizeDrugName(generic.genericName)),
		}))
		.filter(row => row.rxnormCode && row.existing && !row.existing.rxnormCode)

	console.log(`RxNorm concepts prepared: ${rxnormGenerics.length}`)
	console.log(`New drug_generics rows: ${toInsert.length}`)
	console.log(`Existing rows with missing RxCUI to update: ${toUpdate.length}`)

	if (RXNORM_DRY_RUN) {
		console.log("Dry run enabled; no database changes were written.")
		return
	}

	let inserted = 0
	for (const batch of chunk(toInsert, BATCH_SIZE)) {
		if (batch.length === 0) continue
		await db.insert(drugGenerics).values(
			batch.map(generic => ({
				genericName: generic.genericName,
				rxnormCode: generic.rxnormCode,
				atcCode: null,
				isActive: true,
			}))
		)
		inserted += batch.length
	}

	let updated = 0
	for (const generic of toUpdate) {
		if (!generic.existing || !generic.rxnormCode) continue

		await db
			.update(drugGenerics)
			.set({ rxnormCode: generic.rxnormCode })
			.where(and(eq(drugGenerics.id, generic.existing.id), isNull(drugGenerics.rxnormCode)))
		updated += 1
	}

	const totalResult = await db.select({ count: sql<number>`count(*)` }).from(drugGenerics)
	const total = totalResult[0]?.count ?? 0

	console.log(`Inserted ${inserted} RxNorm generic rows.`)
	console.log(`Updated ${updated} existing rows with RxCUI.`)
	console.log(`drug_generics total rows: ${total}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
	importRxNormGenerics().catch(error => {
		console.error(error instanceof Error ? error.message : error)
		process.exit(1)
	})
}
