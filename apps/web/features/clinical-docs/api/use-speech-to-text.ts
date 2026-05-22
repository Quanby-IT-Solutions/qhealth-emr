"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/clinical-docs`
const CHUNK_INTERVAL_MS = 1500

interface UseSpeechToTextOptions {
	onTranscript: (sectionKey: string, text: string) => void
	onLiveTranscript?: (sectionKey: string, text: string) => void
}

interface UseSpeechToTextReturn {
	recordingKey: string | null
	isTranscribing: boolean
	error: string | null
	startRecording: (sectionKey: string) => Promise<void>
	stopRecording: () => void
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
	const numChannels = 1
	const bitsPerSample = 16
	const bytesPerSample = bitsPerSample / 8
	const blockAlign = numChannels * bytesPerSample
	const byteRate = sampleRate * blockAlign
	const dataSize = samples.length * bytesPerSample
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)

	function writeString(offset: number, str: string) {
		for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
	}

	writeString(0, "RIFF")
	view.setUint32(4, 36 + dataSize, true)
	writeString(8, "WAVE")
	writeString(12, "fmt ")
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, numChannels, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, byteRate, true)
	view.setUint16(32, blockAlign, true)
	view.setUint16(34, bitsPerSample, true)
	writeString(36, "data")
	view.setUint32(40, dataSize, true)

	let offset = 44
	for (let i = 0; i < samples.length; i++) {
		const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
		offset += 2
	}

	return new Blob([buffer], { type: "audio/wav" })
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
	let total = 0
	for (const c of chunks) total += c.length
	const out = new Float32Array(total)
	let offset = 0
	for (const c of chunks) {
		out.set(c, offset)
		offset += c.length
	}
	return out
}

export function useSpeechToText({
	onTranscript,
	onLiveTranscript,
}: UseSpeechToTextOptions): UseSpeechToTextReturn {
	const [recordingKey, setRecordingKey] = useState<string | null>(null)
	const [isTranscribing, setIsTranscribing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const streamRef = useRef<MediaStream | null>(null)
	const audioCtxRef = useRef<AudioContext | null>(null)
	const processorRef = useRef<ScriptProcessorNode | null>(null)
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
	const pcmChunksRef = useRef<Float32Array[]>([])
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const activeKeyRef = useRef<string | null>(null)
	const inflightRef = useRef<boolean>(false)
	const stoppingRef = useRef<boolean>(false)
	const sampleRateRef = useRef<number>(16000)

	const cleanup = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
		try {
			processorRef.current?.disconnect()
		} catch {
			/* ignore */
		}
		try {
			sourceRef.current?.disconnect()
		} catch {
			/* ignore */
		}
		processorRef.current = null
		sourceRef.current = null
		const ctx = audioCtxRef.current
		audioCtxRef.current = null
		if (ctx && ctx.state !== "closed") {
			void ctx.close().catch(() => {})
		}
		streamRef.current?.getTracks().forEach(t => t.stop())
		streamRef.current = null
		pcmChunksRef.current = []
	}, [])

	const transcribeCurrent = useCallback(async (isFinal: boolean): Promise<string | null> => {
		if (inflightRef.current && !isFinal) return null
		const samples = concatFloat32(pcmChunksRef.current)
		if (samples.length === 0) return null
		inflightRef.current = true
		try {
			const wav = encodeWav(samples, sampleRateRef.current)
			const formData = new FormData()
			formData.append("audio", wav, "audio.wav")
			const res = await fetch(`${API_BASE}/speech-to-text`, {
				method: "POST",
				credentials: "include",
				body: formData,
			})
			if (!res.ok) throw new Error(res.statusText)
			const data = (await res.json()) as { text: string }
			return data.text ?? ""
		} finally {
			inflightRef.current = false
		}
	}, [])

	const startRecording = useCallback(
		async (sectionKey: string) => {
			setError(null)
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
				streamRef.current = stream
				activeKeyRef.current = sectionKey
				pcmChunksRef.current = []
				stoppingRef.current = false

				const AudioCtx =
					window.AudioContext ||
					(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
				const ctx = new AudioCtx()
				audioCtxRef.current = ctx
				sampleRateRef.current = ctx.sampleRate

				const source = ctx.createMediaStreamSource(stream)
				sourceRef.current = source
				const processor = ctx.createScriptProcessor(4096, 1, 1)
				processorRef.current = processor

				processor.onaudioprocess = e => {
					const input = e.inputBuffer.getChannelData(0)
					pcmChunksRef.current.push(new Float32Array(input))
				}

				source.connect(processor)
				processor.connect(ctx.destination)

				setRecordingKey(sectionKey)

				intervalRef.current = setInterval(() => {
					const key = activeKeyRef.current
					if (!key || stoppingRef.current) return
					void transcribeCurrent(false)
						.then(text => {
							if (stoppingRef.current) return
							if (text !== null && onLiveTranscript) {
								onLiveTranscript(key, text)
							}
						})
						.catch(() => {
							/* swallow during streaming; surface only on stop */
						})
				}, CHUNK_INTERVAL_MS)
			} catch {
				setError("Microphone permission denied. Please allow access and try again.")
				cleanup()
			}
		},
		[cleanup, onLiveTranscript, transcribeCurrent]
	)

	const stopRecording = useCallback(() => {
		const key = activeKeyRef.current
		if (!key) return
		stoppingRef.current = true
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
		setIsTranscribing(true)
		try {
			processorRef.current?.disconnect()
			sourceRef.current?.disconnect()
		} catch {
			/* ignore */
		}

		void (async () => {
			try {
				const text = await transcribeCurrent(true)
				if (text && key) {
					onTranscript(key, text)
				}
				if (onLiveTranscript && key) {
					onLiveTranscript(key, "")
				}
			} catch {
				setError("Transcription failed. Please try again.")
			} finally {
				setIsTranscribing(false)
				setRecordingKey(null)
				cleanup()
				activeKeyRef.current = null
			}
		})()
	}, [cleanup, onLiveTranscript, onTranscript, transcribeCurrent])

	useEffect(() => {
		return () => {
			cleanup()
		}
	}, [cleanup])

	return { recordingKey, isTranscribing, error, startRecording, stopRecording }
}
