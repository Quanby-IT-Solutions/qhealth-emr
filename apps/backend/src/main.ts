import "dotenv/config"
import "reflect-metadata"

import { bootstrap } from "@/bootstrap"

const globalBootstrapState = globalThis as typeof globalThis & {
	__qhealthBackendBootstrap?: Promise<void>
}

if (!globalBootstrapState.__qhealthBackendBootstrap) {
	globalBootstrapState.__qhealthBackendBootstrap = bootstrap()
}

void globalBootstrapState.__qhealthBackendBootstrap
