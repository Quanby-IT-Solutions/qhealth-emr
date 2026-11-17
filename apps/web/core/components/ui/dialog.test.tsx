import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Dialog, DialogContent, DialogTitle } from "./dialog"

describe("DialogContent", () => {
	it("caps default dialogs to the viewport and allows vertical scrolling", () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>Scrollable dialog</DialogTitle>
					<div>Long dialog body</div>
				</DialogContent>
			</Dialog>
		)

		const content = document.querySelector('[data-slot="dialog-content"]')

		expect(content).toHaveClass("max-h-[calc(100svh-1rem)]")
		expect(content).toHaveClass("overflow-y-auto")
		expect(content).toHaveClass("overscroll-contain")
	})
})
