import { BadRequestException } from "@nestjs/common"

import { assertTelemedicineVideoLink } from "./telemedicine-video-link"

describe("assertTelemedicineVideoLink", () => {
	it("accepts HTTPS Zoom and Teams meeting domains", () => {
		expect(() =>
			assertTelemedicineVideoLink("https://us02web.zoom.us/j/123456789", "zoom")
		).not.toThrow()
		expect(() =>
			assertTelemedicineVideoLink("https://teams.microsoft.com/l/meetup-join/example", "teams")
		).not.toThrow()
	})

	it("accepts HTTPS links for LiveKit without external host restrictions", () => {
		expect(() =>
			assertTelemedicineVideoLink("https://telemedicine.example.test/rooms/demo", "livekit")
		).not.toThrow()
	})

	it("rejects non-HTTPS links", () => {
		expect(() => assertTelemedicineVideoLink("http://us02web.zoom.us/j/123", "zoom")).toThrow(
			BadRequestException
		)
	})

	it("rejects a valid HTTPS URL when the host does not match the selected platform", () => {
		expect(() =>
			assertTelemedicineVideoLink("https://teams.microsoft.com/l/meetup-join/example", "zoom")
		).toThrow(BadRequestException)
	})
})
