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
import {
	useDrugGenericsQuery,
	useFormularyItemsQuery,
} from "@/features/formulary/api/formulary.hooks"

type V1Outputs = InferContractRouterOutputs<typeof v1Contract>
type FormularyItem = V1Outputs["formulary"]["item"]["get"]
type DrugGeneric = V1Outputs["formulary"]["drugGeneric"]["list"]["data"][number]
type FormularySearchItem = FormularyItem & { brandName?: string | null }

export type DrugSearchSelection = {
	id: string
	formularyItemId?: string
	drugGenericId: string
	genericName: string
	brandName?: string | null
	doseForm?: string
	strength?: string
	route?: string
	isFormulary: boolean
}

interface DrugSearchComboboxProps {
	id?: string
	facilityId: string
	value: string
	onSelect: (item: DrugSearchSelection | null) => void
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
	const searchEnabled = !!facilityId && (open || debouncedValue.length >= 2)

	const { data, isLoading } = useFormularyItemsQuery({
		facilityId: searchEnabled ? facilityId : "",
		search: debouncedValue || undefined,
		isActive: true,
		limit: 20,
	})
	const { data: genericData, isLoading: genericsLoading } = useDrugGenericsQuery({
		search: debouncedValue || undefined,
		isActive: true,
		limit: 20,
	})

	const formularyItems = (searchEnabled ? data?.data ?? [] : []) as FormularySearchItem[]
	const genericItems = (searchEnabled ? genericData?.data ?? [] : []) as DrugGeneric[]
	const items = buildSearchSelections(formularyItems, genericItems)
	const isSearching = isLoading || genericsLoading

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
		setOpen(!!facilityId)
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen && !disabled && !!facilityId)
	}

	function handleSelect(item: DrugSearchSelection) {
		setInputValue(item.genericName)
		onSelect(item)
		setOpen(false)
	}

	function openIfSearchable() {
		if (!disabled && facilityId) {
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
						{isSearching ? (
							<div className="text-muted-foreground px-3 py-4 text-sm">Searching...</div>
						) : (
							<>
								<CommandEmpty>
									<div className="px-3 py-4 text-left text-sm">
										<p>No orderable generic found.</p>
										<p className="text-muted-foreground mt-1 text-xs">
											Search a specific generic drug name, such as amoxicillin, or check the
											drug catalog. Allergy classes like penicillin are not orderable unless
											they exist as active generics.
										</p>
									</div>
								</CommandEmpty>
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
													{item.isFormulary
														? [item.doseForm, item.strength, item.route].filter(Boolean).join(" / ")
														: "Non-formulary at this facility"}
												</span>
											</div>
											{item.isFormulary ? null : (
												<span className="text-muted-foreground shrink-0 text-xs">Generic</span>
											)}
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

function buildSearchSelections(
	formularyItems: FormularySearchItem[],
	genericItems: DrugGeneric[]
): DrugSearchSelection[] {
	const genericNamesWithFormulary = new Set(
		formularyItems.map(item => item.genericName.trim().toLowerCase())
	)

	return [
		...formularyItems.map(item => ({
			id: item.id,
			formularyItemId: item.id,
			drugGenericId: item.drugGenericId,
			genericName: item.genericName,
			brandName: item.brandName,
			doseForm: item.doseForm,
			strength: item.strength,
			route: item.route,
			isFormulary: true,
		})),
		...genericItems
			.filter(generic => !genericNamesWithFormulary.has(generic.genericName.trim().toLowerCase()))
			.map(generic => ({
				id: generic.id,
				drugGenericId: generic.id,
				genericName: generic.genericName,
				brandName: null,
				isFormulary: false,
			})),
	]
}
