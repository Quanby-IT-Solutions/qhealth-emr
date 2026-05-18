"use client"

import { useEffect, useState } from "react"
import type { InferContractRouterOutputs } from "@orpc/contract"

import { type v1Contract } from "@repo/contracts"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/core/components/ui/popover"
import { useFormularyItemsQuery } from "@/features/formulary/api/formulary.hooks"

type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
type FormularyItem = V1Outputs["formulary"]["item"]["get"]
type FormularySearchItem = FormularyItem & { brandName?: string | null }

interface DrugSearchComboboxProps {
	id?: string
	facilityId: string
	value: string
	onSelect: (item: FormularyItem | null) => void
	onRawInput: (value: string) => void
	placeholder: string
	disabled?: boolean
	autoFocus?: boolean
}

function useDebounce<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)

	useEffect(() => {
		const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
		return () => window.clearTimeout(timeoutId)
	}, [value, delayMs])

	return debounced
}

export function DrugSearchCombobox({
	id,
	facilityId,
	value,
	onSelect,
	onRawInput,
	placeholder,
	disabled = false,
	autoFocus = false,
}: DrugSearchComboboxProps) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState(value)

	const trimmedValue = inputValue.trim()
	const debouncedValue = useDebounce(trimmedValue, 300)
	const searchEnabled = !!facilityId && debouncedValue.length >= 2

	const { data, isLoading } = useFormularyItemsQuery({
		facilityId: searchEnabled ? facilityId : "",
		search: searchEnabled ? debouncedValue : undefined,
		isActive: true,
		limit: 20,
	})

	const items = (data?.data ?? []) as FormularySearchItem[]

	useEffect(() => {
		setInputValue(value)
	}, [value])

	useEffect(() => {
		if (disabled) {
			setOpen(false)
		}
	}, [disabled])

	function handleInputChange(nextValue: string) {
		setInputValue(nextValue)
		onSelect(null)
		onRawInput(nextValue)
		setOpen(!!facilityId && nextValue.trim().length >= 2)
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen && !disabled && !!facilityId && inputValue.trim().length >= 2)
	}

	function handleSelect(item: FormularyItem) {
		setInputValue(item.genericName)
		onSelect(item)
		setOpen(false)
	}

	function openIfSearchable() {
		if (!disabled && facilityId && inputValue.trim().length >= 2) {
			setOpen(true)
		}
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<Command shouldFilter={false} className="h-auto w-full overflow-visible bg-transparent p-0">
				<PopoverTrigger nativeButton={false} render={<div className="w-full" />}>
					<CommandInput
						id={id}
						value={inputValue}
						onValueChange={handleInputChange}
						onPointerDown={event => event.stopPropagation()}
						onClick={event => {
							event.stopPropagation()
							openIfSearchable()
						}}
						onFocus={openIfSearchable}
						placeholder={placeholder}
						disabled={disabled}
						autoFocus={autoFocus}
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
								<CommandEmpty>No drug matches</CommandEmpty>
								<CommandGroup>
									{items.map(item => (
										<CommandItem
											key={item.id}
											value={item.id}
											onSelect={() => handleSelect(item)}
											className="items-start py-2"
										>
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="truncate font-medium">{item.genericName}</span>
												{item.brandName ? (
													<span className="text-muted-foreground text-xs">{item.brandName}</span>
												) : null}
												<span className="text-muted-foreground text-xs">
													{[item.doseForm, item.strength, item.route].filter(Boolean).join(" / ")}
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
