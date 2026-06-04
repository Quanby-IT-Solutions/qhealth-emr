"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { useCreateUserMutation, useListRolesQuery } from "@/features/admin/api/admin.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

import { MultiStepWizard } from "./multi-step-wizard"
import { PermissionMatrix } from "./permission-matrix"

const STEPS = ["Profile", "Role", "Permissions"]

// Colocated schemas
const ProfileSchema = z.object({
	name: z.string().min(1, "Full name is required"),
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	employeeNumber: z.string(),
})

const RoleSchema = z.object({
	selectedRoleId: z.string().min(1, "Select a role to continue"),
})

export function CreateUserForm() {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const activeFacilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const { data: rolesData } = useListRolesQuery(activeFacilityId)
	const createUserMutation = useCreateUserMutation()

	const [step, setStep] = useState(0)
	const [showConfirm, setShowConfirm] = useState(false)
	const [createdUserId, setCreatedUserId] = useState<string | null>(null)
	const [submitError, setSubmitError] = useState<string | null>(null)

	// Step 1 form
	const profileForm = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			employeeNumber: "",
		},
		validators: {
			onSubmit: ProfileSchema,
		},
		onSubmit: async () => {
			setStep(1)
		},
	})

	// Step 2 form
	const roleForm = useForm({
		defaultValues: {
			selectedRoleId: "",
		},
		validators: {
			onSubmit: RoleSchema,
		},
		onSubmit: async () => {
			setStep(2)
		},
	})

	async function handleNext() {
		setSubmitError(null)

		if (step === 0) {
			await profileForm.handleSubmit()
			if (!profileForm.state.isValid) return
			setStep(1)
			return
		}

		if (step === 1) {
			if (!roleForm.state.values.selectedRoleId) {
				setSubmitError("Select a role to continue.")
				return
			}
			setStep(2)
			return
		}

		// Final step — submit
		const { name, email, password, employeeNumber } = profileForm.state.values
		const { selectedRoleId } = roleForm.state.values
		try {
			const result = await createUserMutation.mutateAsync({
				name: name.trim(),
				email: email.trim(),
				password,
				employeeNumber: employeeNumber || undefined,
				facilities: [
					{
						facilityId: activeFacilityId,
						roleIds: selectedRoleId ? [selectedRoleId] : [],
						isPrimary: true,
					},
				],
			})
			setCreatedUserId(result.userId)
			setShowConfirm(true)
		} catch (err: unknown) {
			setSubmitError(err instanceof Error ? err.message : "Failed to create user.")
		}
	}

	return (
		<>
			<MultiStepWizard
				steps={STEPS}
				currentStep={step}
				onNext={handleNext}
				onBack={() => {
					setStep(s => Math.max(0, s - 1))
					setSubmitError(null)
				}}
				isNextDisabled={step === 1 && !roleForm.state.values.selectedRoleId}
				isSubmitting={createUserMutation.isPending}
				submitLabel="Create User"
			>
				<div className="space-y-4">
					{submitError && <p className="text-destructive text-sm">{submitError}</p>}

					{step === 0 && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<profileForm.Field
									name="name"
									validators={{ onChange: z.string().min(1, "Required") }}
								>
									{field => (
										<div className="space-y-1.5">
											<Label htmlFor="name">Full Name *</Label>
											<Input
												id="name"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors?.map((e, i) => (
												<p key={i} className="text-destructive text-xs">
													{String(e)}
												</p>
											))}
										</div>
									)}
								</profileForm.Field>

								<profileForm.Field name="employeeNumber">
									{field => (
										<div className="space-y-1.5">
											<Label htmlFor="employeeNumber">Employee Number</Label>
											<Input
												id="employeeNumber"
												value={field.state.value}
												onChange={e => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
											/>
										</div>
									)}
								</profileForm.Field>
							</div>

							<profileForm.Field
								name="email"
								validators={{ onChange: z.string().email("Invalid email") }}
							>
								{field => (
									<div className="space-y-1.5">
										<Label htmlFor="email">Email Address *</Label>
										<Input
											id="email"
											type="email"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors?.map((e, i) => (
											<p key={i} className="text-destructive text-xs">
												{String(e)}
											</p>
										))}
									</div>
								)}
							</profileForm.Field>

							<profileForm.Field
								name="password"
								validators={{ onChange: z.string().min(8, "Minimum 8 characters") }}
							>
								{field => (
									<div className="space-y-1.5">
										<Label htmlFor="password">Initial Password *</Label>
										<Input
											id="password"
											type="password"
											value={field.state.value}
											onChange={e => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											minLength={8}
										/>
										{field.state.meta.errors?.map((e, i) => (
											<p key={i} className="text-destructive text-xs">
												{String(e)}
											</p>
										))}
										<p className="text-muted-foreground text-xs">Minimum 8 characters</p>
									</div>
								)}
							</profileForm.Field>
						</div>
					)}

					{step === 1 && (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Select the role for this user at{" "}
								<span className="text-foreground font-medium">
									{profile?.staffProfiles[0]?.facility?.name ?? "this facility"}
								</span>
								.
							</p>
							<div className="grid gap-2">
								{rolesData?.map(role => (
									<button
										key={role.id}
										type="button"
										onClick={() => roleForm.setFieldValue("selectedRoleId", role.id)}
										className={`rounded-md border px-4 py-3 text-left transition-colors ${
											roleForm.state.values.selectedRoleId === role.id
												? "border-primary bg-primary/5"
												: "border-border hover:bg-muted"
										}`}
									>
										<p className="text-sm font-medium">{role.name}</p>
										{role.description && (
											<p className="text-muted-foreground text-xs">{role.description}</p>
										)}
									</button>
								))}
								{!rolesData?.length && (
									<p className="text-muted-foreground text-sm">No roles found for this facility.</p>
								)}
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-3">
							<p className="text-muted-foreground text-sm">
								Review and adjust permissions for the selected role. Changes here are saved to the
								role and affect all users assigned to it.
							</p>
							<PermissionMatrix />
						</div>
					)}
				</div>
			</MultiStepWizard>

			{/* Activation confirmation modal */}
			<Dialog
				open={showConfirm}
				onOpenChange={open => {
					if (!open) router.push("/admin/users")
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>User Created</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 text-sm">
						<p>
							The account for{" "}
							<span className="font-semibold">{profileForm.state.values.email}</span> has been
							created.
						</p>
						<p className="text-muted-foreground">
							An activation link has been queued. The user can sign in with the temporary password
							you set once the account is active.
						</p>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<Button
							variant="outline"
							onClick={() => {
								setShowConfirm(false)
								router.push("/admin/users/new")
							}}
						>
							Create Another
						</Button>
						<Button onClick={() => router.push(`/admin/users/${createdUserId}`)}>View User</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
