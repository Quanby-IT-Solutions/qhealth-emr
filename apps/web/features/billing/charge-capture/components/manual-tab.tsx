"use client"

import { useCallback } from "react"

import {
	LineItemEditor,
	type LineItem,
	type LineItemExport,
} from "@/features/billing/components/line-item-editor"

interface ManualCharge {
	id: string
	description: string
	quantity: string
	unitPrice: string
	totalAmount: string
	sourceType: string
}

interface ManualTabProps {
	encounterId: string
	facilityId: string
	charges: ManualCharge[]
	searchResults?: Array<{ id: string; description: string; unitPrice: number }>
	onSearch?: (query: string) => void
	onAdd: (item: LineItemExport) => void
	onRemove: (id: string) => void
	disabled?: boolean
}

function chargeToLineItem(charge: ManualCharge): LineItem {
	return {
		id: charge.id,
		description: charge.description,
		quantity: Number(charge.quantity),
		unitPrice: Number(charge.unitPrice),
		totalAmount: Number(charge.totalAmount),
	}
}

export function ManualTab({
	charges,
	searchResults,
	onSearch,
	onAdd,
	onRemove,
	disabled,
}: ManualTabProps) {
	const manualCharges = charges.filter(c => c.sourceType === "manual")
	const items: LineItem[] = manualCharges.map(chargeToLineItem)

	const handleChange = useCallback(
		(updated: LineItem[]) => {
			const removed = items.filter(i => !updated.find(u => u.id === i.id))
			removed.forEach(r => onRemove(r.id))
		},
		[items, onRemove]
	)

	const handleExport = useCallback(
		(exported: LineItemExport[]) => {
			const newItems = exported.filter(e => !items.find(i => i.description === e.description))
			newItems.forEach(item => onAdd(item))
		},
		[items, onAdd]
	)

	return (
		<LineItemEditor
			items={items}
			onChange={handleChange}
			onExport={handleExport}
			onSearch={onSearch}
			searchResults={searchResults}
			disabled={disabled}
		/>
	)
}
