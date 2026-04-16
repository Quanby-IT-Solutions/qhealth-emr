"use client"

import * as React from "react"

/**
 * Returns true after the component has mounted (client-side only).
 * Useful for deferring rendering of components that cause hydration mismatches
 * (e.g., Base UI Tooltip which generates non-deterministic IDs).
 */
export function useHasMounted() {
	const [hasMounted, setHasMounted] = React.useState(false)

	React.useEffect(() => {
		setHasMounted(true)
	}, [])

	return hasMounted
}
