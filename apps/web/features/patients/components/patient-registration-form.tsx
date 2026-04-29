"use client"

import { useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
	ArrowLeft,
	BadgeCheck,
	CalendarDays,
	Check,
	HeartHandshake,
	Mail,
	MapPinHouse,
	Phone,
	ShieldCheck,
	Stethoscope,
	UserRound,
	UserRoundPlus,
	Users,
	type LucideIcon,
} from "lucide-react"

import { CreatePatientSchema } from "@repo/contracts"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useCreatePatientMutation,
	useListCliniciansQuery,
	useRegisterPatientWithOpdEncounterMutation,
} from "@/features/patients/api/patients.hooks"
import { PatientRegistrationShell } from "@/features/patients/components/patient-registration-shell"

interface PatientRegistrationFormProps {
	mode?: "standalone" | "triage-linked"
}

function buildBackToSearchHref({ pendingTriageId }: { pendingTriageId: string }) {
	if (pendingTriageId) {
		return `/patients/register?pendingTriageId=${pendingTriageId}`
	}

	return "/patients/register"
}

function formatRegisteredPatientName({
	firstName,
	middleName,
	lastName,
}: {
	firstName: string
	middleName: string
	lastName: string
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function StatusCard({ message, action }: { message: string; action?: ReactNode }) {
	return (
		<Card className="border-border/60 bg-card shadow-sm">
			<CardContent className="flex min-h-56 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
				<p className="text-muted-foreground max-w-lg text-sm">{message}</p>
				{action}
			</CardContent>
		</Card>
	)
}

function FormField({
	htmlFor,
	label,
	icon: Icon,
	required,
	error,
	children,
}: {
	htmlFor: string
	label: string
	icon: LucideIcon
	required?: boolean
	error?: string
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			<Label
				htmlFor={htmlFor}
				className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.22em] uppercase"
			>
				<Icon className="size-3.5" />
				<span>{label}</span>
				{required && <span className="text-foreground">*</span>}
			</Label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	)
}

function FormSection({
	label,
	icon: Icon,
	children,
}: {
	label: string
	icon: LucideIcon
	children: ReactNode
}) {
	return (
		<section className="space-y-5">
			<div className="text-muted-foreground flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.24em] uppercase">
				<Icon className="size-3.5" />
				<span>{label}</span>
			</div>
			{children}
		</section>
	)
}

export function PatientRegistrationForm({ mode = "triage-linked" }: PatientRegistrationFormProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""
	const isStandaloneRegistration = mode === "standalone"
	const backToSearchHref = buildBackToSearchHref({ pendingTriageId })
	const fieldClassName = "h-11 rounded-xl border-border/60 bg-background"
	const primaryButtonClassName = "bg-foreground text-background hover:bg-foreground/90"

	const { data: profile } = useMyProfile()
	const facilityId = useActiveFacilityId()
	const activeStaffProfile =
		profile?.staffProfiles?.find(staffProfile =>
			staffProfile.roles?.some(role => role.id === profile.activeRole?.id)
		) ?? profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""
	const canCreate =
		profile?.activeRole?.permissions.some((permission: { module: string; action: string }) => {
			return permission.module === "patients" && permission.action === "create"
		}) ?? false
	const createPatient = useCreatePatientMutation()
	const registerPatient = useRegisterPatientWithOpdEncounterMutation()

	const [errors, setErrors] = useState<Record<string, string>>({})
	const [clinicianStaffId, setClinicianStaffId] = useState("")
	const [createdPatientResult, setCreatedPatientResult] = useState<{
		patientId: string
		mrn: string
	} | null>(null)
	const [regQueueResult, setRegQueueResult] = useState<{
		queueNumber: number
		encounterId: string
		patientId: string
		mrn: string
	} | null>(null)

	const [form, setForm] = useState({
		firstName: "",
		lastName: "",
		middleName: "",
		dateOfBirth: "",
		sex: "" as "" | "male" | "female" | "other",
		addressLine1: "",
		addressLine2: "",
		city: "",
		province: "",
		zipCode: "",
		phone: "",
		email: "",
		philhealthMemberId: "",
		emergencyContactName: "",
		emergencyContactPhone: "",
		nextOfKinName: "",
		nextOfKinRelationship: "",
	})

	const { data: cliniciansData } = useListCliniciansQuery(facilityId ?? undefined)
	const clinicianOptions = cliniciansData?.data ?? []

	const update = (field: string, value: string) => {
		setForm(previous => ({ ...previous, [field]: value }))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!facilityId || !canCreate) return

		const payload = {
			facilityId,
			firstName: form.firstName,
			lastName: form.lastName,
			middleName: form.middleName || undefined,
			dateOfBirth: form.dateOfBirth,
			sex: form.sex || undefined,
			addressLine1: form.addressLine1 || undefined,
			addressLine2: form.addressLine2 || undefined,
			city: form.city || undefined,
			province: form.province || undefined,
			zipCode: form.zipCode || undefined,
			phone: form.phone || undefined,
			email: form.email || undefined,
			philhealthMemberId: form.philhealthMemberId || undefined,
			emergencyContactName: form.emergencyContactName || undefined,
			emergencyContactPhone: form.emergencyContactPhone || undefined,
			nextOfKinName: form.nextOfKinName || undefined,
			nextOfKinRelationship: form.nextOfKinRelationship || undefined,
		}

		const result = CreatePatientSchema.safeParse(payload)
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			result.error.issues.forEach(issue => {
				const field = String(issue.path[0] ?? "")
				if (field && !fieldErrors[field]) {
					fieldErrors[field] = issue.message
				}
			})
			setErrors(fieldErrors)
			return
		}

		setErrors({})
		if (isStandaloneRegistration) {
			const created = await createPatient.mutateAsync(result.data)
			setCreatedPatientResult({
				patientId: created.id,
				mrn: created.mrn,
			})
			return
		}

		if (!clinicianStaffId) return

		const reg = await registerPatient.mutateAsync({
			...result.data,
			admittingStaffId: staffId || undefined,
			clinicianStaffId,
			pendingTriageId: pendingTriageId || undefined,
		})

		if (reg.queueNumber !== null) {
			setRegQueueResult({
				queueNumber: reg.queueNumber,
				encounterId: reg.encounterId,
				patientId: reg.patientId,
				mrn: reg.mrn,
			})
		} else {
			router.push(`/patients/${reg.patientId}/encounters/${reg.encounterId}`)
		}
	}

	const patientName = formatRegisteredPatientName(form)
	const isSubmitting = isStandaloneRegistration
		? createPatient.isPending
		: registerPatient.isPending
	const submissionError = isStandaloneRegistration
		? createPatient.error?.message
		: registerPatient.error?.message

	if (!profile) {
		return (
			<PatientRegistrationShell
				step="register"
				title="Loading patient registration"
				subtitle="Preparing the registration workflow and validating your access."
			>
				<StatusCard message="Loading the patient registration workflow…" />
			</PatientRegistrationShell>
		)
	}

	if (!facilityId) {
		return (
			<PatientRegistrationShell
				step="register"
				title="Facility context is required"
				subtitle="Switch to a facility role before creating a patient record or assigning an MRN."
			>
				<StatusCard message="No active facility context is available. Switch to a facility role to continue with registration." />
			</PatientRegistrationShell>
		)
	}

	if (!canCreate) {
		return (
			<PatientRegistrationShell
				step="register"
				title="Patient registration is unavailable"
				subtitle="Your current role can view this page but cannot create a new patient record."
			>
				<StatusCard message="You do not have permission to register patients." />
			</PatientRegistrationShell>
		)
	}

	if (createdPatientResult) {
		return (
			<PatientRegistrationShell
				step="success"
				title="Medical record number assigned"
				subtitle={`The patient chart for ${patientName || "this patient"} is ready for use.`}
			>
				<Card className="border-border/60 bg-card mx-auto max-w-3xl shadow-sm">
					<CardContent className="flex flex-col items-center gap-8 px-6 py-12 text-center">
						<div className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
							<Check className="size-7" />
						</div>

						<div className="space-y-3">
							<h3 className="text-foreground text-2xl font-semibold tracking-tight">
								Patient successfully registered
							</h3>
							<p className="text-muted-foreground text-base">
								A new patient record has been created for {patientName || "this patient"}.
							</p>
						</div>

						<div className="border-border/60 bg-secondary/40 w-full max-w-xl rounded-xl border px-6 py-8">
							<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
								Medical record number
							</p>
							<p className="text-foreground mt-3 font-mono text-4xl font-semibold tracking-tight">
								{createdPatientResult.mrn}
							</p>
							<p className="text-muted-foreground mt-3 text-xs">Facility-scoped • Permanent</p>
						</div>

						<div className="flex flex-col justify-center gap-3 sm:flex-row">
							<Button
								variant="outline"
								className="border-border/60 bg-background"
								onClick={() => router.push("/patients/register")}
							>
								Register another
							</Button>
							<Button
								className={primaryButtonClassName}
								onClick={() => router.push(`/patients/${createdPatientResult.patientId}`)}
							>
								View patient record
							</Button>
						</div>
					</CardContent>
				</Card>
			</PatientRegistrationShell>
		)
	}

	if (!isStandaloneRegistration && !pendingTriageId) {
		return (
			<PatientRegistrationShell
				step="register"
				title="Complete triage before registration"
				subtitle="Outpatient registration starts from a triage intake so the visit can carry arrival details and baseline assessment data."
			>
				<StatusCard
					message="OPD patient registration requires a completed triage intake. Ask the triage nurse to assess the patient first, then reopen this page from the triage reconciliation queue."
					action={
						<Button
							variant="outline"
							className="border-border/60 bg-background"
							onClick={() => router.push("/patients/register")}
						>
							Back to patient search
						</Button>
					}
				/>
			</PatientRegistrationShell>
		)
	}

	if (regQueueResult) {
		return (
			<PatientRegistrationShell
				step="success"
				title="Medical record number assigned"
				subtitle={`Registration is complete for ${patientName || "this patient"}, and the encounter queue is ready.`}
			>
				<Card className="border-border/60 bg-card mx-auto max-w-3xl shadow-sm">
					<CardContent className="flex flex-col items-center gap-8 px-6 py-12 text-center">
						<div className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
							<Check className="size-7" />
						</div>

						<div className="space-y-3">
							<h3 className="text-foreground text-2xl font-semibold tracking-tight">
								Patient successfully registered
							</h3>
							<p className="text-muted-foreground text-base">
								The new record for {patientName || "this patient"} is ready, and a queue number has
								been assigned for the encounter.
							</p>
						</div>

						<div className="border-border/60 bg-secondary/40 w-full max-w-xl rounded-xl border px-6 py-8">
							<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
								Medical record number
							</p>
							<p className="text-foreground mt-3 font-mono text-4xl font-semibold tracking-tight">
								{regQueueResult.mrn}
							</p>
							<p className="text-muted-foreground mt-3 text-xs">Facility-scoped • Permanent</p>
						</div>

						<div className="border-border/60 bg-background w-full max-w-sm rounded-xl border px-6 py-5">
							<p className="text-muted-foreground text-[0.68rem] font-medium tracking-[0.24em] uppercase">
								Queue number
							</p>
							<Badge className="bg-foreground text-background mt-4 rounded-xl px-6 py-3 font-mono text-3xl font-semibold shadow-sm">
								{regQueueResult.queueNumber}
							</Badge>
							<p className="text-muted-foreground mt-4 text-xs">
								Hand this number to the patient for clinic routing.
							</p>
						</div>

						<div className="flex flex-col justify-center gap-3 sm:flex-row">
							<Button
								variant="outline"
								className="border-border/60 bg-background"
								onClick={() => router.push("/patients/register")}
							>
								Register another
							</Button>
							<Button
								className={primaryButtonClassName}
								onClick={() =>
									router.push(
										`/patients/${regQueueResult.patientId}/encounters/${regQueueResult.encounterId}`
									)
								}
							>
								View encounter
							</Button>
						</div>
					</CardContent>
				</Card>
			</PatientRegistrationShell>
		)
	}

	return (
		<PatientRegistrationShell
			step="register"
			title="Capture the patient details for MRN creation"
			subtitle={
				isStandaloneRegistration
					? "Enter the patient details exactly as provided. The chart will be created and an MRN will be assigned immediately after saving."
					: "Complete the registration details below. The triage intake will be linked automatically and the patient will be queued under the selected clinician."
			}
			notice={
				!isStandaloneRegistration && pendingTriageId ? (
					<Alert className="border-border/60 bg-secondary/40">
						<Stethoscope className="size-4" />
						<AlertTitle>Walk-in triage reconciliation</AlertTitle>
						<AlertDescription>
							A triage intake already exists for this patient. Saving this registration will link
							that intake and continue the OPD encounter flow automatically.
						</AlertDescription>
					</Alert>
				) : undefined
			}
		>
			<form onSubmit={handleSubmit}>
				<Card className="border-border/60 bg-card shadow-sm">
					<CardHeader className="border-border/60 border-b pb-6">
						<div className="flex items-start gap-3">
							<div className="bg-secondary/60 text-muted-foreground flex size-10 items-center justify-center rounded-xl">
								<UserRoundPlus className="size-4" />
							</div>
							<div className="space-y-1">
								<CardTitle className="tracking-tight">New patient details</CardTitle>
								<CardDescription>
									Review each entry carefully before saving so the MRN is created against the
									correct demographic and contact details.
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-8 pt-6">
						<FormSection label="Demographics" icon={UserRound}>
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								<FormField
									htmlFor="firstName"
									label="First name"
									icon={UserRound}
									required
									error={errors.firstName}
								>
									<Input
										id="firstName"
										required
										value={form.firstName}
										className={cn(fieldClassName, errors.firstName && "border-destructive")}
										onChange={e => update("firstName", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="middleName" label="Middle name" icon={UserRound}>
									<Input
										id="middleName"
										value={form.middleName}
										className={fieldClassName}
										onChange={e => update("middleName", e.target.value)}
									/>
								</FormField>

								<FormField
									htmlFor="lastName"
									label="Last name"
									icon={UserRound}
									required
									error={errors.lastName}
								>
									<Input
										id="lastName"
										required
										value={form.lastName}
										className={cn(fieldClassName, errors.lastName && "border-destructive")}
										onChange={e => update("lastName", e.target.value)}
									/>
								</FormField>

								<FormField
									htmlFor="dateOfBirth"
									label="Date of birth"
									icon={CalendarDays}
									required
									error={errors.dateOfBirth}
								>
									<Input
										id="dateOfBirth"
										type="date"
										required
										value={form.dateOfBirth}
										className={cn(fieldClassName, errors.dateOfBirth && "border-destructive")}
										onChange={e => update("dateOfBirth", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="sex" label="Sex" icon={Users} required error={errors.sex}>
									<Select
										value={form.sex || null}
										onValueChange={value => update("sex", String(value))}
									>
										<SelectTrigger
											id="sex"
											className={cn(fieldClassName, errors.sex && "border-destructive")}
											data-placeholder={!form.sex ? "" : undefined}
										>
											{form.sex ? (
												<SelectValue />
											) : (
												<span className="text-muted-foreground">Select sex</span>
											)}
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="male">Male</SelectItem>
											<SelectItem value="female">Female</SelectItem>
											<SelectItem value="other">Other</SelectItem>
										</SelectContent>
									</Select>
								</FormField>
							</div>
						</FormSection>

						<Separator className="bg-border/60" />

						<FormSection label="Contact" icon={Phone}>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField htmlFor="phone" label="Phone" icon={Phone}>
									<Input
										id="phone"
										type="tel"
										value={form.phone}
										className={fieldClassName}
										onChange={e => update("phone", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="email" label="Email" icon={Mail}>
									<Input
										id="email"
										type="email"
										value={form.email}
										className={fieldClassName}
										onChange={e => update("email", e.target.value)}
									/>
								</FormField>

								<FormField
									htmlFor="emergencyContactName"
									label="Emergency contact"
									icon={HeartHandshake}
								>
									<Input
										id="emergencyContactName"
										value={form.emergencyContactName}
										className={fieldClassName}
										onChange={e => update("emergencyContactName", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="emergencyContactPhone" label="Emergency phone" icon={Phone}>
									<Input
										id="emergencyContactPhone"
										type="tel"
										value={form.emergencyContactPhone}
										className={fieldClassName}
										onChange={e => update("emergencyContactPhone", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="nextOfKinName" label="Next of kin" icon={Users}>
									<Input
										id="nextOfKinName"
										value={form.nextOfKinName}
										className={fieldClassName}
										onChange={e => update("nextOfKinName", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="nextOfKinRelationship" label="Relationship" icon={Users}>
									<Input
										id="nextOfKinRelationship"
										value={form.nextOfKinRelationship}
										className={fieldClassName}
										onChange={e => update("nextOfKinRelationship", e.target.value)}
									/>
								</FormField>
							</div>
						</FormSection>

						<Separator className="bg-border/60" />

						<FormSection label="Address" icon={MapPinHouse}>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="md:col-span-2">
									<FormField htmlFor="addressLine1" label="Street address" icon={MapPinHouse}>
										<Input
											id="addressLine1"
											value={form.addressLine1}
											className={fieldClassName}
											onChange={e => update("addressLine1", e.target.value)}
										/>
									</FormField>
								</div>

								<div className="md:col-span-2">
									<FormField htmlFor="addressLine2" label="Address line 2" icon={MapPinHouse}>
										<Input
											id="addressLine2"
											value={form.addressLine2}
											className={fieldClassName}
											onChange={e => update("addressLine2", e.target.value)}
										/>
									</FormField>
								</div>

								<FormField htmlFor="city" label="City" icon={MapPinHouse}>
									<Input
										id="city"
										value={form.city}
										className={fieldClassName}
										onChange={e => update("city", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="province" label="Province" icon={MapPinHouse}>
									<Input
										id="province"
										value={form.province}
										className={fieldClassName}
										onChange={e => update("province", e.target.value)}
									/>
								</FormField>

								<FormField htmlFor="zipCode" label="ZIP code" icon={MapPinHouse}>
									<Input
										id="zipCode"
										value={form.zipCode}
										className={fieldClassName}
										onChange={e => update("zipCode", e.target.value)}
									/>
								</FormField>
							</div>
						</FormSection>

						<Separator className="bg-border/60" />

						<FormSection label="Insurance" icon={ShieldCheck}>
							<div className="grid gap-4 md:max-w-md">
								<FormField
									htmlFor="philhealthMemberId"
									label="PhilHealth number"
									icon={ShieldCheck}
								>
									<Input
										id="philhealthMemberId"
										value={form.philhealthMemberId}
										className={fieldClassName}
										onChange={e => update("philhealthMemberId", e.target.value)}
									/>
								</FormField>
							</div>
						</FormSection>

						{!isStandaloneRegistration && (
							<>
								<Separator className="bg-border/60" />

								<FormSection label="Care Context" icon={Stethoscope}>
									<div className="grid gap-4 md:max-w-md">
										<FormField
											htmlFor="clinicianStaffId"
											label="Attending clinician / clinic"
											icon={Stethoscope}
										>
											<Select
												value={clinicianStaffId || null}
												onValueChange={value => setClinicianStaffId(String(value))}
											>
												<SelectTrigger
													id="clinicianStaffId"
													className={fieldClassName}
													data-placeholder={!clinicianStaffId ? "" : undefined}
												>
													{clinicianStaffId ? (
														<SelectValue />
													) : (
														<span className="text-muted-foreground">Select a clinician</span>
													)}
												</SelectTrigger>
												<SelectContent>
													{clinicianOptions.map(option => (
														<SelectItem key={option.staffProfileId} value={option.staffProfileId}>
															{option.name}
															{option.department ? ` — ${option.department}` : ""}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormField>

										<p className="text-muted-foreground text-sm">
											Required to assign a clinic-specific queue number after registration.
										</p>
									</div>
								</FormSection>
							</>
						)}
					</CardContent>

					<CardFooter className="border-border/60 bg-background flex-col items-stretch gap-3">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Button
								type="button"
								variant="ghost"
								className="justify-start sm:justify-center"
								onClick={() => router.push(backToSearchHref)}
							>
								<ArrowLeft className="size-4" />
								Back to search
							</Button>

							<Button
								type="submit"
								className={primaryButtonClassName}
								disabled={
									!facilityId ||
									(isStandaloneRegistration
										? createPatient.isPending
										: registerPatient.isPending || !clinicianStaffId)
								}
							>
								<BadgeCheck className="size-4" />
								{isSubmitting ? "Saving..." : "Save & assign MRN"}
							</Button>
						</div>

						{submissionError && (
							<p className="text-destructive text-sm">
								Failed to register patient: {submissionError}
							</p>
						)}
					</CardFooter>
				</Card>
			</form>
		</PatientRegistrationShell>
	)
}
