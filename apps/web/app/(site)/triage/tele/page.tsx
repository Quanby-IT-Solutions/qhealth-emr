"use client"

import { useMemo, useState } from "react"
import { PhoneCall, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { acuityColor, acuityLabel } from "@/features/ed/lib/acuity-utils"

interface InboundPatient {
	id: string
	caller: string
	location: string
	transport: string
	etaMinutes: number
	acuityLevel: number
	complaint: string
}

const INITIAL_QUEUE: InboundPatient[] = []

export default function TeleTriagePage() {
	const [queue, setQueue] = useState(INITIAL_QUEUE)
	const [caller, setCaller] = useState("")
	const [location, setLocation] = useState("")
	const [transport, setTransport] = useState("Ambulance")
	const [etaMinutes, setEtaMinutes] = useState("15")
	const [acuityLevel, setAcuityLevel] = useState("3")
	const [complaint, setComplaint] = useState("")

	const sortedQueue = useMemo(() => [...queue].sort((a, b) => a.etaMinutes - b.etaMinutes), [queue])

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		setQueue(current => [
			...current,
			{
				id: crypto.randomUUID(),
				caller: caller.trim() || "Inbound caller",
				location: location.trim() || "Location pending",
				transport,
				etaMinutes: Number(etaMinutes) || 0,
				acuityLevel: Number(acuityLevel) || 3,
				complaint: complaint.trim() || "Assessment pending",
			},
		])
		setCaller("")
		setLocation("")
		setTransport("Ambulance")
		setEtaMinutes("15")
		setAcuityLevel("3")
		setComplaint("")
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
									onChange={event => setCaller(event.target.value)}
									placeholder="Name or temporary identifier"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="location">Patient Location</Label>
								<Input
									id="location"
									value={location}
									onChange={event => setLocation(event.target.value)}
									placeholder="Barangay, landmark, or facility"
								/>
							</div>
							<div className="space-y-2">
								<Label>Transport Mode</Label>
								<Select
									value={transport}
									onValueChange={value => setTransport(value ?? "Ambulance")}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Ambulance">Ambulance</SelectItem>
										<SelectItem value="Private vehicle">Private vehicle</SelectItem>
										<SelectItem value="Walk-in">Walk-in</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="eta">ETA Minutes</Label>
								<Input
									id="eta"
									inputMode="numeric"
									value={etaMinutes}
									onChange={event => setEtaMinutes(event.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Provisional Acuity</Label>
								<Select value={acuityLevel} onValueChange={value => setAcuityLevel(value ?? "3")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[1, 2, 3, 4, 5].map(level => (
											<SelectItem key={level} value={String(level)}>
												Level {level} - {acuityLabel(level)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="complaint">Assessment Notes</Label>
								<Textarea
									id="complaint"
									value={complaint}
									onChange={event => setComplaint(event.target.value)}
									placeholder="Chief complaint, red flags, resource needs"
									rows={4}
								/>
							</div>
							<div className="md:col-span-2">
								<Button type="submit">
									<PhoneCall className="size-4" />
									Queue Inbound Patient
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>

			<Card className="h-fit">
				<CardHeader>
					<CardTitle>Inbound Patient Queue</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{sortedQueue.length === 0 ? (
						<p className="text-muted-foreground text-sm">No inbound patients queued.</p>
					) : (
						sortedQueue.map(patient => (
							<div key={patient.id} className="rounded-md border p-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">{patient.caller}</p>
										<p className="text-muted-foreground text-xs">{patient.location}</p>
									</div>
									<Badge className={acuityColor(patient.acuityLevel)}>L{patient.acuityLevel}</Badge>
								</div>
								<p className="text-muted-foreground mt-2 text-xs">
									{patient.transport} · ETA {patient.etaMinutes}m · {patient.complaint}
								</p>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	)
}
