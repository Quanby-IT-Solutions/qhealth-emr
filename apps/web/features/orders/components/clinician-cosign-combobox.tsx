"use client"

import { useEffect, useState } from "react"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { useSearchCliniciansQuery } from "@/features/admin/user-management/api/users.hooks"

export interface SelectedClinician {
	staffProfileId: string
	name: string
}

interface ClinicianCoSignComboboxProps {
	facilityId: string
	excludeStaffProfileId: string
	value: SelectedClinician | null
	onChange: (c: SelectedClinician | null) => void
	disabled?: boolean
}

function useDebounce<T>(value: T, ms: number): T {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(value), ms)
		return () => window.clearTimeout(t)
	}, [value, ms])
	return debounced
}

export function ClinicianCoSignCombobox({
	facilityId,
	excludeStaffProfileId,
	value,
	onChange,
	disabled,
}: ClinicianCoSignComboboxProps) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState(value?.name ?? "")
	const debouncedSearch = useDebounce(inputValue.trim(), 300)
	const canSearch = !disabled && !!facilityId

	const { data, isLoading } = useSearchCliniciansQuery({
		facilityId,
		search: debouncedSearch,
		excludeStaffProfileId,
	})

	function handleInputChange(next: string) {
		setInputValue(next)
		onChange(null)
		setOpen(canSearch)
	}

	function handleSelect(item: NonNullable<typeof data>[number]) {
		setInputValue(item.name)
		onChange({ staffProfileId: item.staffProfileId, name: item.name })
		setOpen(false)
	}

	function openIfSearchable() {
		if (canSearch) {
			setOpen(true)
		}
	}

	return (
		<Popover open={open} onOpenChange={o => canSearch && setOpen(o)}>
			<Command shouldFilter={false} className="h-auto w-full overflow-visible bg-transparent p-0">
				<PopoverTrigger nativeButton={false} render={<div className="w-full" />}>
					<CommandInput
						value={inputValue}
						onValueChange={handleInputChange}
						onPointerDown={event => event.stopPropagation()}
						onClick={event => {
							event.stopPropagation()
							openIfSearchable()
						}}
						onFocus={openIfSearchable}
						placeholder="Search by clinician name..."
						disabled={disabled}
					/>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-(--anchor-width) p-0"
					initialFocus={false}
					finalFocus={false}
				>
					<CommandList>
						{isLoading ? (
							<div className="text-muted-foreground px-3 py-4 text-sm">Searching...</div>
						) : (
							<>
								<CommandEmpty>
									{inputValue.trim() ? "No matching clinicians" : "No active co-signers available"}
								</CommandEmpty>
								<CommandGroup>
									{(data ?? []).map(item => (
										<CommandItem
											key={item.staffProfileId}
											value={item.staffProfileId}
											onSelect={() => handleSelect(item)}
											className="items-start py-2"
										>
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="truncate font-medium">{item.name}</span>
												<span className="text-muted-foreground text-xs">
													{[item.primaryRole, item.department].filter(Boolean).join(" · ")}
												</span>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</PopoverContent>
			</Command>
		</Popover>
	)
}
