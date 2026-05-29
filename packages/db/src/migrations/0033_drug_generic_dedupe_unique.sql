-- Collapse duplicate drug generic master-data rows before enforcing uniqueness.
-- Canonical row choice prefers active rows, then rows with RxNorm/ATC codes, then oldest row.

WITH ranked_generics AS (
	SELECT
		id,
		first_value(id) OVER (
			PARTITION BY lower(regexp_replace(trim(generic_name), '\s+', ' ', 'g'))
			ORDER BY is_active DESC, (rxnorm_code IS NOT NULL) DESC, (atc_code IS NOT NULL) DESC, created_at ASC, id ASC
		) AS canonical_id,
		row_number() OVER (
			PARTITION BY lower(regexp_replace(trim(generic_name), '\s+', ' ', 'g'))
			ORDER BY is_active DESC, (rxnorm_code IS NOT NULL) DESC, (atc_code IS NOT NULL) DESC, created_at ASC, id ASC
		) AS duplicate_rank
	FROM drug_generics
),
duplicate_generics AS (
	SELECT id, canonical_id
	FROM ranked_generics
	WHERE duplicate_rank > 1
)
UPDATE drug_brands
SET drug_generic_id = duplicate_generics.canonical_id
FROM duplicate_generics
WHERE drug_brands.drug_generic_id = duplicate_generics.id;

WITH ranked_generics AS (
	SELECT
		id,
		first_value(id) OVER (
			PARTITION BY lower(regexp_replace(trim(generic_name), '\s+', ' ', 'g'))
			ORDER BY is_active DESC, (rxnorm_code IS NOT NULL) DESC, (atc_code IS NOT NULL) DESC, created_at ASC, id ASC
		) AS canonical_id,
		row_number() OVER (
			PARTITION BY lower(regexp_replace(trim(generic_name), '\s+', ' ', 'g'))
			ORDER BY is_active DESC, (rxnorm_code IS NOT NULL) DESC, (atc_code IS NOT NULL) DESC, created_at ASC, id ASC
		) AS duplicate_rank
	FROM drug_generics
),
duplicate_generics AS (
	SELECT id, canonical_id
	FROM ranked_generics
	WHERE duplicate_rank > 1
)
UPDATE formulary_items
SET drug_generic_id = duplicate_generics.canonical_id
FROM duplicate_generics
WHERE formulary_items.drug_generic_id = duplicate_generics.id;

WITH ranked_generics AS (
	SELECT
		id,
		row_number() OVER (
			PARTITION BY lower(regexp_replace(trim(generic_name), '\s+', ' ', 'g'))
			ORDER BY is_active DESC, (rxnorm_code IS NOT NULL) DESC, (atc_code IS NOT NULL) DESC, created_at ASC, id ASC
		) AS duplicate_rank
	FROM drug_generics
)
DELETE FROM drug_generics
USING ranked_generics
WHERE drug_generics.id = ranked_generics.id
	AND ranked_generics.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "drug_generics_generic_name_normalized_uniq"
	ON "drug_generics" (lower(regexp_replace(trim("generic_name"), '\s+', ' ', 'g')));
