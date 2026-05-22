import { describe, expect, it } from "vitest"

import { expandDotPhrase } from "./dot-phrases"

describe("expandDotPhrase", () => {
	it("expands .hpi followed by a trailing space", () => {
		expect(expandDotPhrase(".hpi ")).toBe("History of Present Illness:\n")
	})

	it("expands .hpi followed by a trailing newline", () => {
		expect(expandDotPhrase(".hpi\n")).toBe("History of Present Illness:\n")
	})

	it("expands .hpi followed by trailing punctuation", () => {
		expect(expandDotPhrase(".hpi.")).toBe("History of Present Illness:\n")
		expect(expandDotPhrase(".hpi,")).toBe("History of Present Illness:\n")
		expect(expandDotPhrase(".hpi:")).toBe("History of Present Illness:\n")
	})

	it("preserves text appearing before the trailing dot-phrase", () => {
		expect(expandDotPhrase("Patient stable. .hpi ")).toBe(
			"Patient stable. History of Present Illness:\n"
		)
	})

	it("does not expand when the phrase is embedded inside a larger word", () => {
		expect(expandDotPhrase("something.hpi ")).toBeNull()
		expect(expandDotPhrase("abc.hpi ")).toBeNull()
	})

	it("does not expand when the trigger character is not at the end of the input", () => {
		expect(expandDotPhrase(".hpi text after")).toBeNull()
	})

	it("does not expand without a trigger character", () => {
		expect(expandDotPhrase(".hpi")).toBeNull()
	})
})
