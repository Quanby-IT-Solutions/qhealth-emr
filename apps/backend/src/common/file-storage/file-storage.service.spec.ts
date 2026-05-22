import type { StorageProvider } from "./storage-providers/storage-provider.interface"

const localProvider = {
	upload: jest.fn(),
	getSignedUrl: jest.fn(),
	delete: jest.fn(),
	exists: jest.fn(),
	getMetadata: jest.fn(),
} satisfies jest.Mocked<StorageProvider>

const s3Provider = {
	upload: jest.fn(),
	getSignedUrl: jest.fn(),
	delete: jest.fn(),
	exists: jest.fn(),
	getMetadata: jest.fn(),
} satisfies jest.Mocked<StorageProvider>

describe("FileStorageService", () => {
	afterEach(() => {
		jest.resetModules()
		jest.clearAllMocks()
		jest.dontMock("@/config/env.config")
	})

	it("uploads LCR artifacts to local storage with the expected key and metadata", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "local",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))
		localProvider.upload.mockResolvedValue(
			"/storage/lcr-certificates/birth/facility-1/2026/reg-1.pdf"
		)

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)
		const buffer = Buffer.from("pdf")

		await expect(
			service.uploadLcrArtifact(buffer, {
				facilityId: "facility-1",
				certificateType: "birth",
				registrationId: "reg-1",
				artifactType: "pdf",
				year: 2026,
			})
		).resolves.toBe("/storage/lcr-certificates/birth/facility-1/2026/reg-1.pdf")

		expect(localProvider.upload).toHaveBeenCalledWith(
			buffer,
			"lcr-certificates/birth/facility-1/2026/reg-1.pdf",
			{
				contentType: "application/pdf",
				metadata: {
					facilityId: "facility-1",
					certificateType: "birth",
					registrationId: "reg-1",
					artifactType: "pdf",
					year: "2026",
				},
			}
		)
		expect(s3Provider.upload).not.toHaveBeenCalled()
	})

	it("uses the S3 provider when configured", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "s3",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))
		s3Provider.upload.mockResolvedValue("https://bucket.s3.ap-southeast-1.amazonaws.com/key")

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)

		await service.uploadLcrArtifact(Buffer.from("xml"), {
			facilityId: "facility_1",
			certificateType: "death",
			registrationId: "registration_1",
			artifactType: "xml",
			year: 2026,
		})

		expect(s3Provider.upload).toHaveBeenCalledWith(
			expect.any(Buffer),
			"lcr-certificates/death/facility_1/2026/registration_1.xml",
			expect.objectContaining({ contentType: "application/xml" })
		)
	})

	it("generates a signed URL from a local public URL", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "local",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))
		localProvider.getSignedUrl.mockResolvedValue(
			"/storage/lcr-certificates/birth/facility/2026/reg.pdf"
		)

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)

		await service.getArtifactSignedUrl("/storage/lcr-certificates/birth/facility/2026/reg.pdf", 600)

		expect(localProvider.getSignedUrl).toHaveBeenCalledWith(
			"lcr-certificates/birth/facility/2026/reg.pdf",
			600
		)
	})

	it("deletes artifacts by storage key", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "local",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)

		await service.deleteArtifact("lcr-certificates/death/facility/2026/reg.xml")

		expect(localProvider.delete).toHaveBeenCalledWith(
			"lcr-certificates/death/facility/2026/reg.xml"
		)
	})

	it("checks artifact existence", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "local",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))
		localProvider.exists.mockResolvedValue(true)

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)

		await expect(
			service.artifactExists("https://files.example.test/storage/a/b.pdf")
		).resolves.toBe(true)

		expect(localProvider.exists).toHaveBeenCalledWith("a/b.pdf")
	})

	it("rejects unsafe key segments", async () => {
		jest.doMock("@/config/env.config", () => ({
			env: {
				FILE_STORAGE_TYPE: "local",
				FILE_STORAGE_BASE_URL: "/storage",
			},
		}))

		const { FileStorageService } = await import("./file-storage.service")
		const service = new FileStorageService(localProvider as never, s3Provider as never)

		await expect(
			service.uploadLcrArtifact(Buffer.from("pdf"), {
				facilityId: "../facility",
				certificateType: "birth",
				registrationId: "reg-1",
				artifactType: "pdf",
				year: 2026,
			})
		).rejects.toMatchObject({
			message: "Invalid facilityId for artifact storage",
			status: 400,
		})
	})
})
