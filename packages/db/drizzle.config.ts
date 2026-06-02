/// <reference types="node" />
import "dotenv/config"

import { defineConfig } from "drizzle-kit"

export default defineConfig({
	// Point Drizzle at the schema-entity barrel only. Globbing the whole folder
	// also loads relations.ts, which is not a schema entity and breaks generate.
	schema: "./src/schema/index.ts",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
	},
	schemaFilter: ["public"],
})
