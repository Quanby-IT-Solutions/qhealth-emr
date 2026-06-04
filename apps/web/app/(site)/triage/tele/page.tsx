"use client"

import { useState } from "react"
import { PhoneCall, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreateInboundTriageMutation } from "@/features/ed/api/ed.hooks"
import { acuityLabel } from "@/features/ed/lib/acuity-utils"
import { InboundPatientQueue } from "@/features/triage/components/inbound-patient-queue"

export default function TeleTriagePage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffProfileId = profile?.staffProfiles?.[0]?.id ?? ""

	const permissions: { module: string; action: string }[] = profile?.activeRole?.permissions ?? []
	const canEdit = permissions.some(p => p.module === "ed" && p.action === "edit")

	const createMutation = useCreateInboundTriageMutation()

	const [caller, setCaller] = useState("")
	const [location, setLocation] = useState("")
	const [transport, setTransport] = useState<
		"ambulance" | "private_vehicle" | "walk_in" | "motorcycle_ambulance"
	>("ambulance")
	const [channel, setChannel] = useState<"phone" | "video">("phone")
	const [etaMinutes, setEtaMinutes] = useState("15")
	const [acuityLevel, setAcuityLevel] = useState("3")
	const [acuityScale, setAcuityScale] = useState<"esi" | "ats" | "ctas">("esi")
	const [complaint, setComplaint] = useState("")
	const [bedReady, setBedReady] = useState(false)
	const [codeTeam, setCodeTeam] = useState(false)
	const [equipment, setEquipment] = useState("")

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!facilityId || !staffProfileId) return

		createMutation.mutate(
			{
				facilityId,
				callerName: caller.trim() || "Inbound caller",
				patientLocation: location.trim() || "Location pending",
				transportMode: transport,
				channelType: channel,
				etaMinutes: Math.max(0, Number(etaMinutes) || 0),
				provisionalAcuityLevel: Number(acuityLevel) || 3,
				acuityScale,
				assessmentNotes: complaint.trim(),
				resourceNeeds: {
					bed: bedReady,
					codeTeam,
					equipment: equipment
						.split(",")
						.map(s => s.trim())
						.filter(Boolean),
				},
				triageStaffId: staffProfileId,
			},
			{
				onSuccess: () => {
					setCaller("")
					setLocation("")
					setTransport("ambulance")
					setChannel("phone")
					setEtaMinutes("15")
					setAcuityLevel("3")
					setAcuityScale("esi")
					setComplaint("")
					setBedReady(false)
					setCodeTeam(false)
					setEquipment("")
				},
			}
		)
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Tele-Triage Intake</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Capture inbound patient details, provisional acuity, ETA, and resource needs.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Video className="size-5" />
							Inbound Assessment
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="caller">Caller / Patient</Label>
								<Input
									id="caller"
									value={caller}
									onChange={e => setCaller(e.target.value)}
									placeholder="Name or temporary identifier"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="location">Patient Location</Label>
								<Input
									id="location"
									value={location}
									onChange={e => setLocation(e.target.value)}
									placeholder="Barangay, landmark, or facility"
								/>
							</div>

							<div className="space-y-2">
								<Label>Channel Type</Label>
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										variant={channel === "phone" ? "default" : "outline"}
										onClick={() => setChannel("phone")}
										className="flex-1"
									>
										<PhoneCall className="size-4" />
										Phone
									</Button>
									<Button
										type="button"
										size="sm"
										variant={channel === "video" ? "default" : "outline"}
										onClick={() => setChannel("video")}
										className="flex-1"
									>
										<Video className="size-4" />
										Video
									</Button>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Transport Mode</Label>
								<Select
									value={transport}
									onValueChange={v =>
										setTransport(
											v as "ambulance" | "private_vehicle" | "walk_in" | "motorcycle_ambulance"
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ambulance">Ambulance</SelectItem>
										<SelectItem value="private_vehicle">Private vehicle</SelectItem>
										<SelectItem value="walk_in">Walk-in</SelectItem>
										<SelectItem value="motorcycle_ambulance">Motorcycle ambulance</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="eta">ETA Minutes</Label>
								<Input
									id="eta"
									inputMode="numeric"
									value={etaMinutes}
									onChange={e => setEtaMinutes(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label>Acuity Scale</Label>
								<Select
									value={acuityScale}
									onValueChange={v => setAcuityScale(v as "esi" | "ats" | "ctas")}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="esi">ESI</SelectItem>
										<SelectItem value="ats">ATS</SelectItem>
										<SelectItem value="ctas">CTAS</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Provisional Acuity Level</Label>
								<Select value={acuityLevel} onValueChange={v => setAcuityLevel(v ?? "3")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[1, 2, 3, 4, 5].map(level => (
											<SelectItem key={level} value={String(level)}>
												Level {level} — {acuityLabel(level)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="equipment">Equipment Needs (comma-separated)</Label>
								<Input
									id="equipment"
									value={equipment}
									onChange={e => setEquipment(e.target.value)}
									placeholder="e.g. ventilator, defibrillator"
								/>
							</div>

							<div className="flex items-center gap-6 md:col-span-2">
								<div className="flex items-center gap-2">
									<Checkbox id="bed" checked={bedReady} onCheckedChange={v => setBedReady(!!v)} />
									<Label htmlFor="bed">Bed ready</Label>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox id="code" checked={codeTeam} onCheckedChange={v => setCodeTeam(!!v)} />
									<Label htmlFor="code">Code team</Label>
								</div>
							</div>

							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="complaint">Assessment Notes</Label>
								<Textarea
									id="complaint"
									value={complaint}
									onChange={e => setComplaint(e.target.value)}
									placeholder="Chief complaint, red flags, clinical findings"
									rows={4}
								/>
							</div>

							<div className="md:col-span-2">
								<Button
									type="submit"
									disabled={!facilityId || !staffProfileId || createMutation.isPending}
								>
									<PhoneCall className="size-4" />
									{createMutation.isPending ? "Queuing…" : "Queue Inbound Patient"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>

			{facilityId ? (
				<InboundPatientQueue facilityId={facilityId} canEdit={canEdit} />
			) : (
				<Card className="h-fit">
					<CardHeader>
						<CardTitle>Inbound Patient Queue</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">Loading…</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
