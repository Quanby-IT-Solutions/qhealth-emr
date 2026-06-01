describe("ElevenLabsService", () => {
	afterEach(() => {
		jest.resetModules()
		jest.dontMock("@/config/env.config")
	})

	it("reports unconfigured and throws ServiceUnavailableException without API key", async () => {
		jest.doMock("@/config/env.config", () => ({ env: { ELEVENLABS_API_KEY: "" } }))
		const { ServiceUnavailableException } = await import("@nestjs/common")
		const { ElevenLabsService } = await import("./elevenlabs.service")
		const service = new ElevenLabsService()
		expect(service.isConfigured()).toBe(false)
		await expect(service.transcribeAudio(Buffer.from(""), "audio/webm")).rejects.toThrow(
			ServiceUnavailableException
		)
	})

	it("throws BadGatewayException (no key leak) when ElevenLabs returns an error", async () => {
		jest.doMock("@/config/env.config", () => ({ env: { ELEVENLABS_API_KEY: "test-key-secret" } }))
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as jest.Mock
		const { BadGatewayException } = await import("@nestjs/common")
		const { ElevenLabsService } = await import("./elevenlabs.service")
		const service = new ElevenLabsService()
		await expect(service.transcribeAudio(Buffer.from("audio"), "audio/webm")).rejects.toThrow(
			BadGatewayException
		)
		try {
			await service.transcribeAudio(Buffer.from("audio"), "audio/webm")
		} catch (e: unknown) {
			if (e instanceof BadGatewayException) {
				expect(JSON.stringify(e.getResponse())).not.toContain("test-key-secret")
			}
		}
	})

	it("throws BadGatewayException when fetch rejects", async () => {
		jest.doMock("@/config/env.config", () => ({ env: { ELEVENLABS_API_KEY: "test-key-secret" } }))
		global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as jest.Mock
		const { BadGatewayException } = await import("@nestjs/common")
		const { ElevenLabsService } = await import("./elevenlabs.service")
		const service = new ElevenLabsService()
		await expect(service.transcribeAudio(Buffer.from("audio"), "audio/webm")).rejects.toThrow(
			BadGatewayException
		)
		try {
			await service.transcribeAudio(Buffer.from("audio"), "audio/webm")
		} catch (e: unknown) {
			if (e instanceof BadGatewayException) {
				const body = JSON.stringify(e.getResponse())
				expect(body).not.toContain("test-key-secret")
				expect(body).not.toContain("network down")
			}
		}
	})

	it("throws BadGatewayException when upstream returns malformed JSON", async () => {
		jest.doMock("@/config/env.config", () => ({ env: { ELEVENLABS_API_KEY: "test-key" } }))
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => {
				throw new Error("bad json")
			},
		}) as jest.Mock
		const { BadGatewayException } = await import("@nestjs/common")
		const { ElevenLabsService } = await import("./elevenlabs.service")
		const service = new ElevenLabsService()
		await expect(service.transcribeAudio(Buffer.from("audio"), "audio/webm")).rejects.toThrow(
			BadGatewayException
		)
	})

	it("returns { text } on successful transcription", async () => {
		jest.doMock("@/config/env.config", () => ({ env: { ELEVENLABS_API_KEY: "test-key" } }))
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ text: "Patient reports fever." }),
		}) as jest.Mock
		const { ElevenLabsService } = await import("./elevenlabs.service")
		const service = new ElevenLabsService()
		const result = await service.transcribeAudio(Buffer.from("audio"), "audio/webm")
		expect(result).toEqual({ text: "Patient reports fever." })
	})
})
