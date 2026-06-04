"use client"

import { ClosingSection } from "./closing-section"
import { Footer } from "./footer"
import { HeroSection } from "./hero-section"
import { InteropSection } from "./interop-section"
import { ModulesSection } from "./modules-section"
import { Navbar } from "./navbar"
import { RegulatorySection } from "./regulatory-section"
import { ReportingSection } from "./reporting-section"
import { TrustSection } from "./trust-section"
import { WorkflowSection } from "./workflow-section"

export function LandingPage() {
	return (
		<div className="bg-background flex min-h-screen flex-col font-sans antialiased">
			<Navbar />
			<main className="flex-1">
				<HeroSection />
				<RegulatorySection />
				<ModulesSection />
				<ReportingSection />
				<WorkflowSection />
				<InteropSection />
				<TrustSection />
				<ClosingSection />
			</main>
			<Footer />
		</div>
	)
}
