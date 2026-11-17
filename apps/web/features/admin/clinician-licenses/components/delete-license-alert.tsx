"use client"

import { Trash2 } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"

interface DeleteLicenseAlertProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	license: {
		licenseType: string
		licenseNumber: string
	} | null
	onConfirm: () => void
	isPending?: boolean
}

export function DeleteLicenseAlert({
	open,
	onOpenChange,
	license,
	onConfirm,
	isPending = false,
}: DeleteLicenseAlertProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogMedia className="bg-destructive/10 text-destructive">
						<Trash2 className="size-5" />
					</AlertDialogMedia>
					<AlertDialogTitle>Delete license record?</AlertDialogTitle>
					<AlertDialogDescription>
						{license
							? `${license.licenseType} ${license.licenseNumber} will be removed from license records.`
							: "This license record will be removed."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={event => {
							event.preventDefault()
							onConfirm()
						}}
						disabled={isPending}
					>
						{isPending ? "Deleting..." : "Delete License"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
