describe("InsightGenieService", () => {
	afterEach(() => {
		jest.resetModules()
		jest.dontMock("@/config/env.config")
	})

	it("reports disabled when credentials are missing", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FACE_SCAN_ENABLED: true,
				INSIGHT_GENIE_BASE_URL: "https://api.insightgenie.ai",
				INSIGHT_GENIE_API_KEY: "",
				INSIGHT_GENIE_API_SECRET: "",
			},
		}))
		const { InsightGenieService } = await import("./insight-genie.service")
		const service = new InsightGenieService()
		expect(service.isConfigured()).toBe(false)
		expect(service.isEnabled()).toBe(false)
	})

	it("throws ServiceUnavailableException when generating token without config", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FACE_SCAN_ENABLED: true,
				INSIGHT_GENIE_BASE_URL: "https://api.insightgenie.ai",
				INSIGHT_GENIE_API_KEY: "",
				INSIGHT_GENIE_API_SECRET: "",
			},
		}))
		const { ServiceUnavailableException } = await import("@nestjs/common")
		const { InsightGenieService } = await import("./insight-genie.service")
		const service = new InsightGenieService()
		await expect(service.generateVideoToken({ clientId: "test-session" })).rejects.toThrow(
			ServiceUnavailableException
		)
	})

	it("throws BadGatewayException when auth fails", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FACE_SCAN_ENABLED: true,
				INSIGHT_GENIE_BASE_URL: "https://api.insightgenie.ai",
				INSIGHT_GENIE_API_KEY: "test-key",
				INSIGHT_GENIE_API_SECRET: "test-secret",
			},
		}))
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as jest.Mock
		const { BadGatewayException } = await import("@nestjs/common")
		const { InsightGenieService } = await import("./insight-genie.service")
		const service = new InsightGenieService()
		await expect(service.generateVideoToken({ clientId: "test-session" })).rejects.toThrow(
			BadGatewayException
		)
	})

	it("returns videoIframeUrl on successful token generation", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FACE_SCAN_ENABLED: true,
				INSIGHT_GENIE_BASE_URL: "https://api.insightgenie.ai",
				INSIGHT_GENIE_API_KEY: "test-key",
				INSIGHT_GENIE_API_SECRET: "test-secret",
			},
		}))
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ token: "jwt-token" }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					videoIframeUrl: "https://scan.example.com/iframe?showResults=display",
				}),
			}) as jest.Mock
		const { InsightGenieService } = await import("./insight-genie.service")
		const service = new InsightGenieService()
		const result = await service.generateVideoToken({ clientId: "encounter-1" })
		expect(result.videoIframeUrl).toContain("https://scan.example.com/iframe")
		expect(result.videoIframeUrl).toContain("age=30")
		expect(result.videoIframeUrl).toContain("smoking=false")
		expect(result.videoIframeUrl).toContain("showResults=display")
	})

	it("appends height and weight to iframe URL when provided", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FACE_SCAN_ENABLED: true,
				INSIGHT_GENIE_BASE_URL: "https://api.insightgenie.ai",
				INSIGHT_GENIE_API_KEY: "test-key",
				INSIGHT_GENIE_API_SECRET: "test-secret",
			},
		}))
		global.fetch = jest
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ token: "jwt-token" }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					videoIframeUrl: "https://scan.example.com/iframe?showResults=display",
				}),
			}) as jest.Mock
		const { InsightGenieService } = await import("./insight-genie.service")
		const service = new InsightGenieService()
		const result = await service.generateVideoToken(
			{ clientId: "encounter-1", age: 42, gender: "female" },
			{ age: 42, gender: "female", smoking: true, heightCm: 165, weightKg: 60 }
		)
		expect(result.videoIframeUrl).toContain("height=165")
		expect(result.videoIframeUrl).toContain("weight=60")
		expect(result.videoIframeUrl).toContain("age=42")
		expect(result.videoIframeUrl).toContain("sex=female")
		expect(result.videoIframeUrl).toContain("smoking=true")
	})
})
