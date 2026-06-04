"use client"

import { useEffect, useRef, useState } from "react"

export interface DevicePreviewState {
	videoDevices: MediaDeviceInfo[]
	audioDevices: MediaDeviceInfo[]
	videoDeviceId: string | undefined
	audioDeviceId: string | undefined
	setVideoDeviceId: (id: string | undefined) => void
	setAudioDeviceId: (id: string | undefined) => void
	stream: MediaStream | null
	permissionError: string | null
}

export function useDevicePreview(videoEnabled: boolean, audioEnabled: boolean): DevicePreviewState {
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
	const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(undefined)
	const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [permissionError, setPermissionError] = useState<string | null>(null)
	const streamRef = useRef<MediaStream | null>(null)

	useEffect(() => {
		streamRef.current = stream
	}, [stream])

	useEffect(() => {
		return () => {
			streamRef.current?.getTracks().forEach(track => track.stop())
			streamRef.current = null
		}
	}, [])

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.mediaDevices) {
			return
		}

		let cancelled = false

		function syncDevices() {
			void navigator.mediaDevices
				.enumerateDevices()
				.then(devices => {
					if (cancelled) return
					setVideoDevices(devices.filter(d => d.kind === "videoinput"))
					setAudioDevices(devices.filter(d => d.kind === "audioinput"))
				})
				.catch(() => undefined)
		}

		syncDevices()
		navigator.mediaDevices.addEventListener?.("devicechange", syncDevices)

		return () => {
			cancelled = true
			navigator.mediaDevices.removeEventListener?.("devicechange", syncDevices)
		}
	}, [])

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.mediaDevices) {
			return
		}

		let cancelled = false

		if (!videoEnabled && !audioEnabled) {
			streamRef.current?.getTracks().forEach(track => track.stop())
			streamRef.current = null
			Promise.resolve().then(() => {
				if (!cancelled) setStream(null)
			})
			return () => {
				cancelled = true
			}
		}

		const constraints: MediaStreamConstraints = {
			video: videoEnabled ? (videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true) : false,
			audio: audioEnabled ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false,
		}

		navigator.mediaDevices
			.getUserMedia(constraints)
			.then(nextStream => {
				if (cancelled) {
					nextStream.getTracks().forEach(track => track.stop())
					return null
				}
				streamRef.current?.getTracks().forEach(track => track.stop())
				streamRef.current = nextStream
				setStream(nextStream)
				setPermissionError(null)
				return navigator.mediaDevices.enumerateDevices()
			})
			.then(devices => {
				if (cancelled || !devices) return
				setVideoDevices(devices.filter(d => d.kind === "videoinput"))
				setAudioDevices(devices.filter(d => d.kind === "audioinput"))
			})
			.catch((err: unknown) => {
				if (cancelled) return
				const message =
					err instanceof Error ? err.message : "Unable to access camera or microphone."
				setPermissionError(message)
			})

		return () => {
			cancelled = true
		}
	}, [videoEnabled, audioEnabled, videoDeviceId, audioDeviceId])

	return {
		videoDevices,
		audioDevices,
		videoDeviceId,
		audioDeviceId,
		setVideoDeviceId,
		setAudioDeviceId,
		stream,
		permissionError,
	}
}
