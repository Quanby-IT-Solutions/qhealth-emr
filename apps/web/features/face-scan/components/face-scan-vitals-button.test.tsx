import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FaceScanVitalsButton } from "./face-scan-vitals-button"

const useFaceScanStatusQueryMock = vi.fn()
const useFaceScanDemographicsFromEncounterMock = vi.fn()
const useFaceScanDemographicsFromPatientMock = vi.fn()

vi.mock("@hugeicons/react", () => ({
	HugeiconsIcon: () => <span data-testid="camera-icon" />,
}))

vi.mock("@/features/face-scan/hooks/face-scan.hooks", () => ({
	useFaceScanStatusQuery: () => useFaceScanStatusQueryMock(),
}))

vi.mock("@/features/face-scan/hooks/use-face-scan-demographics", () => ({
	useFaceScanDemographicsFromEncounter: (encounterId: string | undefined) =>
		useFaceScanDemographicsFromEncounterMock(encounterId),
	useFaceScanDemographicsFromPatient: (patientId: string | undefined) =>
		useFaceScanDemographicsFromPatientMock(patientId),
}))

vi.mock("@/features/face-scan/components/face-scan-dialog", () => ({
	FaceScanDialog: () => null,
}))

vi.mock("@/features/face-scan/components/face-scan-phone-qr-dialog", () => ({
	FaceScanPhoneQrDialog: () => null,
}))

describe("FaceScanVitalsButton", () => {
	beforeEach(() => {
		useFaceScanStatusQueryMock.mockReturnValue({ data: { enabled: true } })
		useFaceScanDemographicsFromEncounterMock.mockReturnValue({})
		useFaceScanDemographicsFromPatientMock.mockReturnValue({})
	})

	it("does not fetch encounter demographics when explicit demographics are supplied", () => {
		render(
			<FaceScanVitalsButton
				facilityId="facility-1"
				encounterId="encounter-1"
				age={42}
				gender="female"
				onComplete={vi.fn()}
			/>
		)

		expect(screen.getByRole("button", { name: /scan vitals with camera/i })).toBeInTheDocument()
		expect(useFaceScanDemographicsFromEncounterMock).toHaveBeenCalledWith(undefined)
	})
})
