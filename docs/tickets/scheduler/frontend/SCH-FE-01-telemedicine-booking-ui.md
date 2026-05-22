# [SCH-FE-01] Scheduler Telemedicine — Appointment Booking UI

**Role:** Scheduler
**Layer:** Frontend (React/Next.js)
**Category:** UI Components & Forms
**Priority:** P0 (Blocking)
**Story Refs:** User Flow M2
**Flow Refs:** Section M — Scheduling & Appointments

## Description

Create UI components to enable schedulers to book telemedicine appointments through the existing appointment booking interface. Add appointment type selection (in-person vs telemedicine) and conditional telemedicine-specific fields (physician selection, platform, duration).

## Context

**Current State:**

- Appointment booking form exists for in-person appointments
- No telemedicine option in UI
- Schedulers have backend permissions (after SCH-BE-01, SCH-BE-02)

**Enhancement:**

- Add appointment type selector
- Show telemedicine fields conditionally
- Require physician selection for telemedicine
- Support multiple video platforms (LiveKit, Zoom, Teams)

## Files to Create/Modify

### 1. Update Appointment Booking Form

**Path:** `apps/web/features/scheduling/components/appointment-booking-form.tsx`

### 2. Create Telemedicine Fields Component

**Path:** `apps/web/features/scheduling/components/telemedicine-appointment-fields.tsx` (NEW)

### 3. Update Appointment List View

**Path:** `apps/web/features/scheduling/components/appointment-list.tsx`

### 4. Add Permission Hook

**Path:** `apps/web/core/hooks/use-permissions.ts`

## Implementation

### 1. Appointment Booking Form Enhancement

```tsx
// apps/web/features/scheduling/components/appointment-booking-form.tsx

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { usePermissions } from "@/core/hooks/use-permissions"
import { useCreateAppointmentMutation } from "@/features/scheduling/api/appointments.hooks"

import { TelemedicineAppointmentFields } from "./telemedicine-appointment-fields"

const appointmentSchema = z.object({
	patientId: z.string().min(1, "Patient is required"),
	appointmentType: z.enum(["in-person", "telemedicine"]),
	clinicId: z.string().optional(),
	providerId: z.string().optional(),
	scheduledDate: z.string(),
	scheduledTime: z.string(),
	// Telemedicine-specific fields
	clinicianStaffId: z.string().optional(),
	platform: z.enum(["livekit", "zoom", "teams"]).optional(),
	durationMinutes: z.number().min(15).max(180).optional(),
	notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export function AppointmentBookingForm() {
	const { canCreateTelemedicine } = usePermissions()
	const createAppointment = useCreateAppointmentMutation()

	const form = useForm<AppointmentFormData>({
		resolver: zodResolver(appointmentSchema),
		defaultValues: {
			appointmentType: "in-person",
			platform: "livekit",
			durationMinutes: 30,
		},
	})

	const appointmentType = form.watch("appointmentType")
	const isTelemedicine = appointmentType === "telemedicine"

	const onSubmit = async (data: AppointmentFormData) => {
		try {
			if (isTelemedicine) {
				// Validate telemedicine-specific fields
				if (!data.clinicianStaffId) {
					form.setError("clinicianStaffId", {
						message: "Physician is required for telemedicine appointments",
					})
					return
				}

				// Call telemedicine appointment API
				await createAppointment.mutateAsync({
					facilityId: "current-facility-id", // Get from context
					patientId: data.patientId,
					clinicianStaffId: data.clinicianStaffId,
					scheduledDate: data.scheduledDate,
					scheduledTime: data.scheduledTime,
					platform: data.platform ?? "livekit",
					durationMinutes: data.durationMinutes ?? 30,
					notes: data.notes,
				})
			} else {
				// Call regular appointment API
				await createAppointment.mutateAsync({
					patientId: data.patientId,
					clinicId: data.clinicId,
					providerId: data.providerId,
					scheduledDate: data.scheduledDate,
					scheduledTime: data.scheduledTime,
					notes: data.notes,
				})
			}

			// Success handling
			form.reset()
			// Show success toast
		} catch (error) {
			// Error handling
			console.error("Failed to create appointment:", error)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Patient Selection */}
				<FormField
					control={form.control}
					name="patientId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Patient *</FormLabel>
							<FormControl>
								<Input placeholder="Search patient..." {...field} />
							</FormControl>
						</FormItem>
					)}
				/>

				{/* Appointment Type Selection */}
				<FormField
					control={form.control}
					name="appointmentType"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Appointment Type *</FormLabel>
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="in-person">In-Person</SelectItem>
									{canCreateTelemedicine && (
										<SelectItem value="telemedicine">Telemedicine</SelectItem>
									)}
								</SelectContent>
							</Select>
							<FormDescription>
								{isTelemedicine
									? "Virtual consultation via video call"
									: "Face-to-face consultation at clinic"}
							</FormDescription>
						</FormItem>
					)}
				/>

				{/* Conditional: Telemedicine Fields */}
				{isTelemedicine && <TelemedicineAppointmentFields form={form} />}

				{/* Conditional: In-Person Fields */}
				{!isTelemedicine && (
					<>
						<FormField
							control={form.control}
							name="clinicId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Clinic</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select clinic" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>{/* Populate from API */}</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="providerId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Provider</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select provider" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>{/* Populate from API */}</SelectContent>
									</Select>
								</FormItem>
							)}
						/>
					</>
				)}

				{/* Date & Time (Common) */}
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="scheduledDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Date *</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="scheduledTime"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Time *</FormLabel>
								<FormControl>
									<Input type="time" {...field} />
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				{/* Notes (Common) */}
				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Input placeholder="Additional notes..." {...field} />
							</FormControl>
						</FormItem>
					)}
				/>

				{/* Submit Button */}
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => form.reset()}>
						Cancel
					</Button>
					<Button type="submit" disabled={createAppointment.isPending}>
						{createAppointment.isPending ? "Booking..." : "Book Appointment"}
					</Button>
				</div>
			</form>
		</Form>
	)
}
```

### 2. Telemedicine Fields Component

```tsx
// apps/web/features/scheduling/components/telemedicine-appointment-fields.tsx

import { Clock, Users, Video } from "lucide-react"
import { UseFormReturn } from "react-hook-form"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { usePhysiciansQuery } from "@/features/scheduling/api/physicians.hooks"

interface TelemedicineAppointmentFieldsProps {
	form: UseFormReturn<any>
}

export function TelemedicineAppointmentFields({ form }: TelemedicineAppointmentFieldsProps) {
	const { data: physicians, isLoading } = usePhysiciansQuery()

	return (
		<div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
			<div className="flex items-center gap-2">
				<Video className="size-5 text-blue-600 dark:text-blue-400" />
				<h3 className="font-semibold text-blue-900 dark:text-blue-100">Telemedicine Details</h3>
			</div>

			<Alert>
				<Users className="size-4" />
				<AlertDescription>
					You must assign a physician to conduct the virtual consultation.
				</AlertDescription>
			</Alert>

			{/* Physician Selection */}
			<FormField
				control={form.control}
				name="clinicianStaffId"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Physician *</FormLabel>
						<Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder={isLoading ? "Loading..." : "Select physician"} />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{physicians?.map(physician => (
									<SelectItem key={physician.id} value={physician.id}>
										<div className="flex flex-col">
											<span className="font-medium">{physician.name}</span>
											<span className="text-muted-foreground text-xs">
												{physician.specialty} • {physician.department}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormDescription>
							The physician who will conduct the virtual consultation
						</FormDescription>
					</FormItem>
				)}
			/>

			{/* Platform Selection */}
			<FormField
				control={form.control}
				name="platform"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Video Platform</FormLabel>
						<Select onValueChange={field.onChange} defaultValue={field.value}>
							<FormControl>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value="livekit">
									<div className="flex items-center gap-2">
										<Video className="size-4" />
										<span>LiveKit (Built-in)</span>
									</div>
								</SelectItem>
								<SelectItem value="zoom">
									<div className="flex items-center gap-2">
										<Video className="size-4" />
										<span>Zoom</span>
									</div>
								</SelectItem>
								<SelectItem value="teams">
									<div className="flex items-center gap-2">
										<Video className="size-4" />
										<span>Microsoft Teams</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<FormDescription>LiveKit is recommended for best integration</FormDescription>
					</FormItem>
				)}
			/>

			{/* Duration */}
			<FormField
				control={form.control}
				name="durationMinutes"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Duration (minutes)</FormLabel>
						<Select
							onValueChange={value => field.onChange(parseInt(value))}
							defaultValue={field.value?.toString()}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value="15">15 minutes</SelectItem>
								<SelectItem value="30">30 minutes</SelectItem>
								<SelectItem value="45">45 minutes</SelectItem>
								<SelectItem value="60">1 hour</SelectItem>
								<SelectItem value="90">1.5 hours</SelectItem>
								<SelectItem value="120">2 hours</SelectItem>
							</SelectContent>
						</Select>
						<FormDescription>
							<Clock className="mr-1 inline size-3" />
							Estimated consultation duration
						</FormDescription>
					</FormItem>
				)}
			/>
		</div>
	)
}
```

### 3. Update Appointment List View

```tsx
// apps/web/features/scheduling/components/appointment-list.tsx

import { MapPin, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

export function AppointmentList() {
	const { data } = useAppointmentsQuery()

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Patient</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Physician/Provider</TableHead>
					<TableHead>Date/Time</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data?.appointments.map(apt => (
					<TableRow key={apt.id}>
						<TableCell className="font-medium">{apt.patientName}</TableCell>
						<TableCell>
							{apt.type === "telemedicine" ? (
								<Badge variant="secondary" className="gap-1">
									<Video className="size-3" />
									Telemedicine
								</Badge>
							) : (
								<Badge variant="outline" className="gap-1">
									<MapPin className="size-3" />
									In-Person
								</Badge>
							)}
						</TableCell>
						<TableCell>{apt.providerName}</TableCell>
						<TableCell>
							{apt.scheduledDate} at {apt.scheduledTime}
						</TableCell>
						<TableCell>
							<Badge variant={apt.status === "scheduled" ? "default" : "secondary"}>
								{apt.status}
							</Badge>
						</TableCell>
						<TableCell>{/* Action buttons */}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
```

### 4. Permission Hook

```tsx
// apps/web/core/hooks/use-permissions.ts

import { useSession } from "@/services/better-auth/auth-client"

export function usePermissions() {
	const { data: session } = useSession()

	const permissions = session?.user?.permissions ?? []

	return {
		// Telemedicine permissions
		canViewTelemedicine: permissions.includes("telemedicine:view"),
		canCreateTelemedicine: permissions.includes("telemedicine:create"),
		canEditTelemedicine: permissions.includes("telemedicine:edit"),
		canSignPrescriptions: permissions.includes("telemedicine:sign"),

		// Scheduling permissions
		canViewScheduling: permissions.includes("scheduling:view"),
		canCreateScheduling: permissions.includes("scheduling:create"),
		canEditScheduling: permissions.includes("scheduling:edit"),
	}
}
```

## API Integration

### Query Hook for Physicians

```tsx
// apps/web/features/scheduling/api/physicians.hooks.ts

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function usePhysiciansQuery() {
	return useQuery(
		orpc.scheduling.listPhysicians.queryOptions({
			staleTime: 5 * 60 * 1000, // 5 minutes
		})
	)
}
```

## Acceptance Criteria

- [ ] Appointment type selector added to booking form
- [ ] Telemedicine option only visible if user has `telemedicine:create` permission
- [ ] Telemedicine fields component created and integrated
- [ ] Physician dropdown populated from API
- [ ] Platform selector with LiveKit, Zoom, Teams options
- [ ] Duration selector with common time slots
- [ ] Form validation requires physician for telemedicine appointments
- [ ] Appointment list shows type badge (telemedicine vs in-person)
- [ ] Permission hook implemented and used
- [ ] Responsive design works on mobile/tablet
- [ ] Loading states handled gracefully
- [ ] Error messages are clear and actionable
- [ ] Success toast shown after booking
- [ ] Form resets after successful submission

## Dependencies

**Requires:**

- SCH-BE-01 (Backend permissions)
- SCH-BE-02 (Backend validation)
- Shadcn UI components installed
- TanStack Query configured
- oRPC client configured

**Blocks:**

- SCH-FE-02 (E2E testing)

## Testing

### Component Tests

```tsx
// apps/web/features/scheduling/components/telemedicine-appointment-fields.test.tsx

describe("TelemedicineAppointmentFields", () => {
	it("requires physician selection", async () => {
		render(<TelemedicineAppointmentFields form={mockForm} />)

		const submitButton = screen.getByRole("button", { name: /book/i })
		await userEvent.click(submitButton)

		expect(screen.getByText(/physician is required/i)).toBeInTheDocument()
	})

	it("shows only active physicians in dropdown", async () => {
		const { container } = render(<TelemedicineAppointmentFields form={mockForm} />)

		const select = container.querySelector('[name="clinicianStaffId"]')
		await userEvent.click(select)

		const options = screen.getAllByRole("option")
		expect(options).toHaveLength(mockActivePhysicians.length)
	})

	it("defaults to LiveKit platform", () => {
		render(<TelemedicineAppointmentFields form={mockForm} />)

		expect(mockForm.getValues("platform")).toBe("livekit")
	})
})
```

## UI/UX Considerations

- Use blue color scheme for telemedicine to distinguish from in-person
- Show video icon consistently for telemedicine appointments
- Provide helpful descriptions for each field
- Alert users that physician assignment is required
- Show physician specialty and department in dropdown
- Default to 30-minute duration (most common)
- Recommend LiveKit for best integration

## Accessibility

- All form fields have proper labels
- Error messages are announced to screen readers
- Keyboard navigation works throughout form
- Color is not the only indicator of appointment type
- Focus management after form submission
