// Minimal ambient declaration for Multer file uploads.
// We don't depend on `@types/multer`; only the fields used by our handlers
// (memoryStorage shape) are typed here.

declare global {
	namespace Express {
		namespace Multer {
			interface File {
				fieldname: string
				originalname: string
				encoding: string
				mimetype: string
				size: number
				buffer: Buffer
			}
		}
	}
}

export {}
