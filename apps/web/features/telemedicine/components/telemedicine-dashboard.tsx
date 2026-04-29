"use client"

import { useState } from "react"
import { Calendar, ClipboardList, FileText, Pill, Video } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { EPrescriptionCard } from "@/features/telemedicine/components/e-prescription-card"
import { TeleAbstractPage } from "@/features/telemedicine/components/tele-abstract-page"
import { TelemedicineEncounterForm } from "@/features/telemedicine/components/telemedicine-encounter-form"
import { VideoCallPanel } from "@/features/telemedicine/components/video-call-panel"
import { VirtualVisitScheduler } from "@/features/telemedicine/components/virtual-visit-scheduler"

// ============================================================================
// Types
// ============================================================================

type ActiveTab = "scheduler" | "encounter" | "video" | "abstract" | "prescription"

interface TabConfig {
	id: ActiveTab
	label: string
	icon: React.ComponentType<{ className?: string }>
	description: string
}

// ============================================================================
// Constants
// ============================================================================

const TABS: TabConfig[] = [
	{
		id: "scheduler",
		label: "Scheduler",
		icon: Calendar,
		description: "Book virtual appointments via Zoom or Teams",
	},
	{
		id: "encounter",
		label: "Clinical Note",
		icon: ClipboardList,
		description: "Document telemedicine encounter and SOAP notes",
	},
	{
		id: "video",
		label: "Video Call",
		icon: Video,
		description: "Join or share video call link with patient",
	},
	{
		id: "abstract",
		label: "Abstract",
		icon: FileText,
		description: "Generate and sign encounter abstract for patient",
	},
	{
		id: "prescription",
		label: "E-Prescription",
		icon: Pill,
		description: "Generate and share e-prescription",
	},
]

// Placeholder profile data used for prescription generation
const DEMO_CLINICIAN = {
	name: "Dr. Maria Santos",
	prcNumber: "0123456",
}

const DEMO_FACILITY = {
	name: "QHealth Medical Center",
	address: "123 Healthcare Ave., Manila, Philippines",
}

// ============================================================================
// Main Dashboard
// ============================================================================

export function TelemedicineDashboard() {
	const [activeTab, setActiveTab] = useState<ActiveTab>("scheduler")
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
	const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null)

	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	// Demo patient info for prescription (in real app, would come from selected appointment)
	const demoPatient = {
		name: "Sample Patient",
		mrn: "MRN-00001",
		age: 35,
		sex: "Male",
	}

	function handleAppointmentCreated(appointmentId: string) {
		setSelectedAppointmentId(appointmentId)
		// Auto-advance to encounter tab after booking
		setActiveTab("encounter")
	}

	function handleEncounterCreated(encounterId: string) {
		setActiveEncounterId(encounterId)
		// Auto-advance to abstract tab
		setActiveTab("abstract")
	}

	function handleAbstractSigned() {
		// Auto-advance to prescription tab after signing abstract
		setActiveTab("prescription")
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-bold">Telemedicine</h1>
				<p className="text-muted-foreground text-sm">
					Virtual consultations with integrated scheduling, clinical notes, and e-prescriptions
				</p>
			</div>

			{/* Tab Navigation */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				{TABS.map(({ id, label, icon: Icon, description }) => (
					<button
						key={id}
						type="button"
						onClick={() => setActiveTab(id)}
						className={[
							"flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors",
							activeTab === id
								? "border-primary bg-primary/5"
								: "border-muted hover:border-primary/30",
						].join(" ")}
					>
						<div
							className={[
								"flex size-9 items-center justify-center rounded-lg",
								activeTab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
							].join(" ")}
						>
							<Icon className="size-4" />
						</div>
						<div>
							<p className={`text-sm font-semibold ${activeTab === id ? "text-primary" : ""}`}>
								{label}
							</p>
							<p className="text-muted-foreground text-xs leading-tight">{description}</p>
						</div>
					</button>
				))}
			</div>

			{/* Tab Content */}
			{activeTab === "scheduler" && (
				<VirtualVisitScheduler
					facilityId={facilityId}
					onAppointmentCreated={handleAppointmentCreated}
				/>
			)}

			{activeTab === "encounter" && (
				<>
					{selectedAppointmentId ? (
						<TelemedicineEncounterForm
							appointmentId={selectedAppointmentId}
							patientName={demoPatient.name}
							clinicianName={DEMO_CLINICIAN.name}
							onEncounterCreated={handleEncounterCreated}
						/>
					) : (
						<Card>
							<CardContent className="py-10 text-center">
								<ClipboardList className="text-muted-foreground mx-auto mb-3 size-10" />
								<p className="text-muted-foreground text-sm">
									Please book an appointment first to create a clinical note.
								</p>
								<button
									type="button"
									onClick={() => setActiveTab("scheduler")}
									className="text-primary mt-2 text-sm underline underline-offset-2"
								>
									Go to Scheduler
								</button>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{activeTab === "video" && (
				<VideoCallPanel appointmentId={selectedAppointmentId ?? undefined} />
			)}

			{activeTab === "abstract" && (
				<>
					{activeEncounterId ? (
						<TeleAbstractPage
							encounterId={activeEncounterId}
							onAbstractSigned={handleAbstractSigned}
						/>
					) : (
						<Card>
							<CardContent className="py-10 text-center">
								<FileText className="text-muted-foreground mx-auto mb-3 size-10" />
								<p className="text-muted-foreground text-sm">
									Please complete a clinical encounter first to generate an abstract.
								</p>
								<button
									type="button"
									onClick={() => setActiveTab("encounter")}
									className="text-primary mt-2 text-sm underline underline-offset-2"
								>
									Go to Clinical Note
								</button>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{activeTab === "prescription" && (
				<>
					{activeEncounterId ? (
						<EPrescriptionCard
							encounterId={activeEncounterId}
							patientName={demoPatient.name}
							patientMrn={demoPatient.mrn}
							patientAge={demoPatient.age}
							patientSex={demoPatient.sex}
							clinicianName={DEMO_CLINICIAN.name}
							clinicianPrcNumber={DEMO_CLINICIAN.prcNumber}
							facilityName={DEMO_FACILITY.name}
							facilityAddress={DEMO_FACILITY.address}
						/>
					) : (
						<Card>
							<CardContent className="py-10 text-center">
								<Pill className="text-muted-foreground mx-auto mb-3 size-10" />
								<p className="text-muted-foreground text-sm">
									Please complete a clinical encounter first to generate an e-prescription.
								</p>
								<button
									type="button"
									onClick={() => setActiveTab("encounter")}
									className="text-primary mt-2 text-sm underline underline-offset-2"
								>
									Go to Clinical Note
								</button>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	)
}
