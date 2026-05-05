import {
	detectProcedureLabels,
	evaluateProcedureCoverage,
	resolveProcedureLabel,
} from "./surgical-procedure-utils"

describe("surgical-procedure-utils", () => {
	it("detects unique procedure labels from a multiline operative record field", () => {
		expect(
			detectProcedureLabels(
				"1. Laparoscopic cholecystectomy\n2. Adhesiolysis\nLaparoscopic cholecystectomy"
			)
		).toEqual(["Laparoscopic cholecystectomy", "Adhesiolysis"])
	})

	it("resolves a suggested mapping label back to the canonical operative record label", () => {
		expect(
			resolveProcedureLabel(
				"adhesiolysis",
				"1. Laparoscopic cholecystectomy\n2. Adhesiolysis"
			)
		).toBe("Adhesiolysis")
	})

	it("marks a procedure incomplete until it has a primary RVS code", () => {
		const readiness = evaluateProcedureCoverage({
			procedurePerformed: "Laparoscopic cholecystectomy\nAdhesiolysis",
			operationRecordSigned: true,
			assignments: [
				{
					procedureLabel: "Laparoscopic cholecystectomy",
					assignmentType: "primary",
					status: "suggested",
				},
				{
					procedureLabel: "Adhesiolysis",
					assignmentType: "adjunct",
					status: "suggested",
				},
			],
		})

		expect(readiness.isReady).toBe(false)
		expect(readiness.missingProcedureLabels).toEqual(["Adhesiolysis"])
		expect(readiness.procedures).toEqual([
			expect.objectContaining({
				label: "Laparoscopic cholecystectomy",
				primaryCodeCount: 1,
				adjunctCodeCount: 0,
				isReady: true,
			}),
			expect.objectContaining({
				label: "Adhesiolysis",
				primaryCodeCount: 0,
				adjunctCodeCount: 1,
				isReady: false,
			}),
		])
	})
})
