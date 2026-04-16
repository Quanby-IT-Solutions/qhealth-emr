import "dotenv/config"

import type { NextConfig } from "next"
import path from "node:path"

import "./env"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api"

/** @type {import("next").NextConfig} */
const config: NextConfig = {
	typedRoutes: true,
	output: "standalone",
	outputFileTracingRoot: path.resolve(import.meta.dirname, "../../"),

	/** Enables hot reloading for local packages without a build step */
	transpilePackages: [
		"@repo/auth",
		"@repo/backend",
		"@repo/contracts",
		"@repo/db",
		"@t3-oss/env-core",
		"@t3-oss/env-nextjs",
	],

	typescript: { ignoreBuildErrors: true },
	reactCompiler: true,

	devIndicators: {
		position: "bottom-right",
	},

	// Proxy SSE/streaming endpoints to backend to avoid cross-origin cookie issues
	async rewrites() {
		return [
			{
				source: "/api/v1/notification/stream",
				destination: `${BACKEND_URL}/v1/notification/stream`,
			},
		]
	},
}

export default config
