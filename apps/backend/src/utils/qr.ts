import QRCode from "qrcode"

export async function renderPng(text: string): Promise<Buffer> {
	return QRCode.toBuffer(text, { type: "png", errorCorrectionLevel: "M" })
}

export async function renderSvg(text: string): Promise<string> {
	return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M" })
}
