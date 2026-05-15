/**
 * Seed script for formulary reference data.
 * Run with: npx tsx packages/db/src/seed-formulary.ts
 *
 * Requires DATABASE_URL environment variable.
 */
import { drizzle } from "drizzle-orm/node-postgres"

import {
	drugBrands,
	drugGenerics,
	icd10Codes,
	loincCodes,
	rvsCodes,
	rxnormCodes,
	snomedCtCodes,
} from "./schema/formulary.js"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
	console.error("DATABASE_URL is required")
	process.exit(1)
}

const db = drizzle(DATABASE_URL)

async function seedDrugGenerics() {
	const data = [
		{ genericName: "Paracetamol", rxnormCode: "161", atcCode: "N02BE01" },
		{ genericName: "Amoxicillin", rxnormCode: "723", atcCode: "J01CA04" },
		{ genericName: "Metformin", rxnormCode: "6809", atcCode: "A10BA02" },
		{ genericName: "Amlodipine", rxnormCode: "17767", atcCode: "C08CA01" },
		{ genericName: "Losartan", rxnormCode: "52175", atcCode: "C09CA01" },
		{ genericName: "Omeprazole", rxnormCode: "7646", atcCode: "A02BC01" },
		{ genericName: "Salbutamol", rxnormCode: "435", atcCode: "R03AC02" },
		{ genericName: "Ibuprofen", rxnormCode: "5640", atcCode: "M01AE01" },
		{ genericName: "Ciprofloxacin", rxnormCode: "2551", atcCode: "J01MA02" },
		{ genericName: "Metoprolol", rxnormCode: "6918", atcCode: "C07AB02" },
		{ genericName: "Atorvastatin", rxnormCode: "83367", atcCode: "C10AA05" },
		{ genericName: "Insulin Glargine", rxnormCode: "274783", atcCode: "A10AE04" },
		{ genericName: "Clopidogrel", rxnormCode: "32968", atcCode: "B01AC04" },
		{ genericName: "Furosemide", rxnormCode: "4603", atcCode: "C03CA01" },
		{ genericName: "Prednisone", rxnormCode: "8640", atcCode: "H02AB07" },
	]

	await db.insert(drugGenerics).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} drug generics`)
	return db.select().from(drugGenerics)
}

async function seedDrugBrands(generics: { id: string; genericName: string }[]) {
	const getGenericId = (name: string) => generics.find(g => g.genericName === name)?.id

	const data = [
		{ drugGenericId: getGenericId("Paracetamol")!, brandName: "Biogesic", manufacturer: "Unilab" },
		{
			drugGenericId: getGenericId("Paracetamol")!,
			brandName: "Tylenol",
			manufacturer: "Johnson & Johnson",
		},
		{ drugGenericId: getGenericId("Amoxicillin")!, brandName: "Amoxil", manufacturer: "GSK" },
		{ drugGenericId: getGenericId("Metformin")!, brandName: "Glucophage", manufacturer: "Merck" },
		{ drugGenericId: getGenericId("Amlodipine")!, brandName: "Norvasc", manufacturer: "Pfizer" },
		{ drugGenericId: getGenericId("Losartan")!, brandName: "Cozaar", manufacturer: "Merck" },
		{ drugGenericId: getGenericId("Omeprazole")!, brandName: "Losec", manufacturer: "AstraZeneca" },
		{ drugGenericId: getGenericId("Salbutamol")!, brandName: "Ventolin", manufacturer: "GSK" },
		{ drugGenericId: getGenericId("Ibuprofen")!, brandName: "Advil", manufacturer: "Pfizer" },
		{ drugGenericId: getGenericId("Atorvastatin")!, brandName: "Lipitor", manufacturer: "Pfizer" },
		{
			drugGenericId: getGenericId("Insulin Glargine")!,
			brandName: "Lantus",
			manufacturer: "Sanofi",
		},
		{ drugGenericId: getGenericId("Furosemide")!, brandName: "Lasix", manufacturer: "Sanofi" },
	].filter(d => d.drugGenericId)

	await db.insert(drugBrands).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} drug brands`)
}

async function seedIcd10Codes() {
	const data = [
		{
			code: "A09",
			description: "Infectious gastroenteritis and colitis, unspecified",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "A15.0",
			description: "Tuberculosis of lung",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "B20",
			description: "Human immunodeficiency virus [HIV] disease",
			category: "Certain infectious and parasitic diseases",
		},
		{
			code: "E11",
			description: "Type 2 diabetes mellitus",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "E11.65",
			description: "Type 2 diabetes mellitus with hyperglycemia",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "E78.5",
			description: "Dyslipidemia, unspecified",
			category: "Endocrine, nutritional and metabolic diseases",
		},
		{
			code: "I10",
			description: "Essential (primary) hypertension",
			category: "Diseases of the circulatory system",
		},
		{
			code: "I25.10",
			description: "Atherosclerotic heart disease of native coronary artery",
			category: "Diseases of the circulatory system",
		},
		{
			code: "I50.9",
			description: "Heart failure, unspecified",
			category: "Diseases of the circulatory system",
		},
		{
			code: "J06.9",
			description: "Acute upper respiratory infection, unspecified",
			category: "Diseases of the respiratory system",
		},
		{
			code: "J18.9",
			description: "Pneumonia, unspecified organism",
			category: "Diseases of the respiratory system",
		},
		{
			code: "J45.909",
			description: "Unspecified asthma, uncomplicated",
			category: "Diseases of the respiratory system",
		},
		{
			code: "K21.0",
			description: "Gastro-esophageal reflux disease with esophagitis",
			category: "Diseases of the digestive system",
		},
		{
			code: "M54.5",
			description: "Low back pain",
			category: "Diseases of the musculoskeletal system",
		},
		{
			code: "N18.3",
			description: "Chronic kidney disease, stage 3",
			category: "Diseases of the genitourinary system",
		},
		{
			code: "R50.9",
			description: "Fever, unspecified",
			category: "Symptoms, signs and abnormal clinical findings",
		},
		{
			code: "Z00.00",
			description: "Encounter for general adult medical examination without abnormal findings",
			category: "Factors influencing health status",
		},
	]

	await db.insert(icd10Codes).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} ICD-10 codes`)
}

async function seedSnomedCtCodes() {
	const data = [
		{
			conceptId: "38341003",
			fsn: "Hypertensive disorder, systemic arterial (disorder)",
			preferredTerm: "Hypertension",
			semanticTag: "disorder",
		},
		{
			conceptId: "44054006",
			fsn: "Diabetes mellitus type 2 (disorder)",
			preferredTerm: "Type 2 diabetes mellitus",
			semanticTag: "disorder",
		},
		{
			conceptId: "233604007",
			fsn: "Pneumonia (disorder)",
			preferredTerm: "Pneumonia",
			semanticTag: "disorder",
		},
		{
			conceptId: "195967001",
			fsn: "Asthma (disorder)",
			preferredTerm: "Asthma",
			semanticTag: "disorder",
		},
		{
			conceptId: "13645005",
			fsn: "Chronic obstructive lung disease (disorder)",
			preferredTerm: "Chronic obstructive pulmonary disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "84114007",
			fsn: "Heart failure (disorder)",
			preferredTerm: "Heart failure",
			semanticTag: "disorder",
		},
		{
			conceptId: "53741008",
			fsn: "Coronary arteriosclerosis (disorder)",
			preferredTerm: "Coronary artery disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "235595009",
			fsn: "Gastroesophageal reflux disease (disorder)",
			preferredTerm: "Gastroesophageal reflux disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "279039007",
			fsn: "Low back pain (finding)",
			preferredTerm: "Low back pain",
			semanticTag: "finding",
		},
		{
			conceptId: "709044004",
			fsn: "Chronic kidney disease (disorder)",
			preferredTerm: "Chronic kidney disease",
			semanticTag: "disorder",
		},
		{
			conceptId: "386661006",
			fsn: "Fever (finding)",
			preferredTerm: "Fever",
			semanticTag: "finding",
		},
		{
			conceptId: "68566005",
			fsn: "Urinary tract infectious disease (disorder)",
			preferredTerm: "Urinary tract infection",
			semanticTag: "disorder",
		},
		{
			conceptId: "40930008",
			fsn: "Hypothyroidism (disorder)",
			preferredTerm: "Hypothyroidism",
			semanticTag: "disorder",
		},
		{
			conceptId: "55822004",
			fsn: "Hyperlipidemia (disorder)",
			preferredTerm: "Hyperlipidemia",
			semanticTag: "disorder",
		},
		{
			conceptId: "69896004",
			fsn: "Rheumatoid arthritis (disorder)",
			preferredTerm: "Rheumatoid arthritis",
			semanticTag: "disorder",
		},
	]

	await db.insert(snomedCtCodes).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} SNOMED CT codes`)
}

async function seedLoincCodes() {
	const data = [
		{
			loincNum: "2160-0",
			component: "Creatinine",
			property: "MCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Creatinine [Mass/volume] in Serum or Plasma",
		},
		{
			loincNum: "2345-7",
			component: "Glucose",
			property: "MCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Glucose [Mass/volume] in Serum or Plasma",
		},
		{
			loincNum: "718-7",
			component: "Hemoglobin",
			property: "MCnc",
			system: "Bld",
			scale: "Qn",
			longCommonName: "Hemoglobin [Mass/volume] in Blood",
		},
		{
			loincNum: "4548-4",
			component: "Hemoglobin A1c/Hemoglobin.total",
			property: "MFr",
			system: "Bld",
			scale: "Qn",
			longCommonName: "Hemoglobin A1c/Hemoglobin.total in Blood",
		},
		{
			loincNum: "2093-3",
			component: "Cholesterol.total",
			property: "MCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Cholesterol [Mass/volume] in Serum or Plasma",
		},
		{
			loincNum: "6690-2",
			component: "Leukocytes",
			property: "NCnc",
			system: "Bld",
			scale: "Qn",
			longCommonName: "Leukocytes [#/volume] in Blood by Automated count",
		},
		{
			loincNum: "777-3",
			component: "Platelets",
			property: "NCnc",
			system: "Bld",
			scale: "Qn",
			longCommonName: "Platelets [#/volume] in Blood by Automated count",
		},
		{
			loincNum: "2951-2",
			component: "Sodium",
			property: "SCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Sodium [Moles/volume] in Serum or Plasma",
		},
		{
			loincNum: "2823-3",
			component: "Potassium",
			property: "SCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Potassium [Moles/volume] in Serum or Plasma",
		},
		{
			loincNum: "1742-6",
			component: "Alanine aminotransferase",
			property: "CCnc",
			system: "Ser/Plas",
			scale: "Qn",
			longCommonName: "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
		},
	]

	await db.insert(loincCodes).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} LOINC codes`)
}

async function seedRxnormCodes() {
	const data = [
		{ rxcui: "161", name: "Acetaminophen", tty: "IN" },
		{ rxcui: "723", name: "Amoxicillin", tty: "IN" },
		{ rxcui: "6809", name: "Metformin", tty: "IN" },
		{ rxcui: "17767", name: "Amlodipine", tty: "IN" },
		{ rxcui: "52175", name: "Losartan", tty: "IN" },
		{ rxcui: "7646", name: "Omeprazole", tty: "IN" },
		{ rxcui: "435", name: "Albuterol", tty: "IN" },
		{ rxcui: "5640", name: "Ibuprofen", tty: "IN" },
		{ rxcui: "2551", name: "Ciprofloxacin", tty: "IN" },
		{ rxcui: "6918", name: "Metoprolol", tty: "IN" },
		{ rxcui: "83367", name: "Atorvastatin", tty: "IN" },
		{ rxcui: "274783", name: "Insulin Glargine", tty: "IN" },
		{ rxcui: "32968", name: "Clopidogrel", tty: "IN" },
		{ rxcui: "4603", name: "Furosemide", tty: "IN" },
		{ rxcui: "8640", name: "Prednisone", tty: "IN" },
	]

	await db.insert(rxnormCodes).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} RxNorm codes`)
}

async function seedRvsCodes() {
	const data = [
		{
			rvsCode: "99201",
			procedureName: "Office or other outpatient visit, new patient, minimal",
			category: "Evaluation and Management",
			rvsValue: "0.48",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "99213",
			procedureName: "Office or other outpatient visit, established patient, low complexity",
			category: "Evaluation and Management",
			rvsValue: "1.30",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "99214",
			procedureName: "Office or other outpatient visit, established patient, moderate complexity",
			category: "Evaluation and Management",
			rvsValue: "1.92",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "99281",
			procedureName: "Emergency department visit, self-limited or minor",
			category: "Emergency Medicine",
			rvsValue: "0.63",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "99285",
			procedureName: "Emergency department visit, high complexity",
			category: "Emergency Medicine",
			rvsValue: "4.00",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "36415",
			procedureName: "Collection of venous blood by venipuncture",
			category: "Pathology and Laboratory",
			rvsValue: "0.17",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "80053",
			procedureName: "Comprehensive metabolic panel",
			category: "Pathology and Laboratory",
			rvsValue: "0.00",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "85025",
			procedureName: "Complete blood count with automated differential",
			category: "Pathology and Laboratory",
			rvsValue: "0.00",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "71046",
			procedureName: "Radiologic examination, chest, 2 views",
			category: "Radiology",
			rvsValue: "0.60",
			effectiveDate: "2024-01-01",
		},
		{
			rvsCode: "93000",
			procedureName: "Electrocardiogram, 12-lead with interpretation and report",
			category: "Cardiology",
			rvsValue: "0.34",
			effectiveDate: "2024-01-01",
		},
	]

	await db.insert(rvsCodes).values(data).onConflictDoNothing()
	console.log(`Seeded ${data.length} RVS codes`)
}

async function main() {
	console.log("Seeding formulary reference data...")

	const generics = await seedDrugGenerics()
	await seedDrugBrands(generics)
	await seedIcd10Codes()
	await seedSnomedCtCodes()
	await seedLoincCodes()
	await seedRxnormCodes()
	await seedRvsCodes()

	console.log("Formulary seed complete!")
	process.exit(0)
}

main().catch(err => {
	console.error("Seed failed:", err)
	process.exit(1)
})
