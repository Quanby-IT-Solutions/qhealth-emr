import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { OrderGroupRow } from "./order-group-row"

function medOrder(overrides: Partial<Parameters<typeof OrderGroupRow>[0]["parent"]> = {}) {
	return {
		id: "med-1",
		genericName: "Furosemide",
		brandName: null,
		dose: "500",
		doseUnit: "mg",
		doseForm: "vial",
		route: "intravenous",
		frequency: "q6h",
		durationDays: 30,
		isPrn: false,
		isControlledSubstance: true,
		priority: null,
		pdeaSchedule: "S-2",
		pdeaTrancheNumber: 1,
		pdeaTrancheTotal: 2,
		status: "pending_verification",
		orderingStaffName: "Dr. Miguel Santos",
		createdAt: "2026-05-29T03:30:00.000Z",
		...overrides,
	}
}

describe("OrderGroupRow", () => {
	it("labels the parent row as the first tranche in a tranched controlled order", async () => {
		const user = userEvent.setup()

		render(
			<table>
				<tbody>
					<OrderGroupRow
						parent={medOrder()}
						tranches={[
							medOrder({
								id: "med-2",
								pdeaTrancheNumber: 2,
								durationDays: 5,
							}),
						]}
						statusBadge={() => "secondary"}
						formatDate={() => "May 29, 2026"}
					/>
				</tbody>
			</table>
		)

		expect(screen.getByText("Tranche #1 of 2")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: /expand tranches/i }))

		expect(screen.getByText("Tranche #2")).toBeInTheDocument()
		expect(screen.getByText("of 2")).toBeInTheDocument()
	})
})
