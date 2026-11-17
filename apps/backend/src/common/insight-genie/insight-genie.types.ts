export interface FaceScanRequest {
	clientId: string
	age?: number
	gender?: string
	showResults?: string
	noDesign?: boolean
	faceOutline?: boolean
	buttonBgColor?: string
	buttonTextColor?: string
	isVoiceAnalysisOn?: boolean
	forceFrontCamera?: boolean
	diabetesHypertensionParameters?: {
		height?: number
		weight?: number
	}
	language?: string
	showDisclaimer?: boolean
}

export interface FaceScanResponse {
	success: boolean
	videoIframeUrl: string
}

export interface InsightGenieAuthResponse {
	token: string
}
