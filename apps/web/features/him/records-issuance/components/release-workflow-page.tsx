"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { ErrorState, SkeletonRows } from "@/features/admin/components/state-views"

import { useMedicalRecordsRequestQuery } from "../api/medical-records.hooks"
import {
	useAttachIdentityProofMutation,
	useAttachPhysicianSignatureMutation,
	useCaptureDpaConsentMutation,
	useMarkRecordsPaymentClearedMutation,
	useReleaseRecordsMutation,
} from "../api/records.hooks"

interface ReleaseWorkflowPageProps {
	requestId: string
}

export function ReleaseWorkflowPage({ requestId }: ReleaseWorkflowPageProps) {
	const router = useRouter()
	const { data: r, isLoading, isError, refetch, error } = useMedicalRecordsRequestQuery(requestId)

	const [signatureUri, setSignatureUri] = useState("")
	const [pdfError, setPdfError] = useState("")
	const [idUri, setIdUri] = useState("")
	const [idType, setIdType] = useState("government_id")
	const [idHash, setIdHash] = useState("")
	const [physSigUri, setPhysSigUri] = useState("")
	const [physSigHash, setPhysSigHash] = useState("")
	const [invoiceId, setInvoiceId] = useState("")
	const [recipient, setRecipient] = useState("")
	const [docTypes, setDocTypes] = useState("discharge_summary")
	const [contentHashes, setContentHashes] = useState("")

	const { mutate: dpaMut, isPending: dpaP, error: dpaE } = useCaptureDpaConsentMutation()
	const { mutate: idMut, isPending: idP, error: idE } = useAttachIdentityProofMutation()
	const { mutate: sigMut, isPending: sigP } = useAttachPhysicianSignatureMutation()
	const { mutate: payMut, isPending: payP } = useMarkRecordsPaymentClearedMutation()
	const { mutate: relMut, isPending: relP, error: relE } = useReleaseRecordsMutation()

	if (isLoading) return <SkeletonRows count={5} className="p-6" />
	if (isError) return <ErrorState error={error} retry={refetch} />
	if (!r) return null

	const dpaDone = r.dpaConsentObtained
	const idDone = r.identityVerified
	const payDone = !!r.paidAt
	const released = r.status === "completed"

	const releaseDisabled =
		!dpaDone ||
		!idDone ||
		!payDone ||
		released ||
		!recipient.trim() ||
		!docTypes.trim() ||
		!contentHashes.trim()

	const onRelease = () =>
		relMut(
			{
				requestId,
				recipient,
				documentTypes: docTypes
					.split(",")
					.map(s => s.trim())
					.filter(Boolean),
				contentHashes: contentHashes
					.split(",")
					.map(s => s.trim())
					.filter(Boolean),
			},
			{
				onSuccess: () => router.push(`/him/records-audit?req=${requestId}`),
			}
		)

	return (
		<div className="max-w-2xl space-y-3 p-4">
			<Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
				← Back
			</Button>
			<h1 className="text-lg font-semibold">Release Workflow</h1>
			<p className="text-muted-foreground text-xs">Request {requestId}</p>

			<Step n={1} title="DPA Consent" done={dpaDone}>
				<div className="space-y-2">
					<Label htmlFor="sig-uri">Signature URI</Label>
					<Input
						id="sig-uri"
						value={signatureUri}
						onChange={e => setSignatureUri(e.target.value)}
						placeholder="https://signed.url/dpa.pdf"
						disabled={dpaDone}
					/>
					<Button
						size="sm"
						disabled={dpaDone || !signatureUri.trim() || dpaP}
						onClick={() => dpaMut({ requestId, signatureUri })}
					>
						{dpaDone ? "Captured" : dpaP ? "Submitting…" : "Capture"}
					</Button>
					{dpaE && <p className="text-destructive text-xs">{(dpaE as Error).message}</p>}
				</div>
			</Step>

			<Step n={2} title="Identity Proof" done={idDone}>
				<div className="space-y-2">
					<Label htmlFor="id-uri">Document URI</Label>
					<Input
						id="id-uri"
						value={idUri}
						onChange={e => setIdUri(e.target.value)}
						placeholder="https://signed.url/id.png"
						disabled={idDone}
					/>
					<Label htmlFor="id-type">Type</Label>
					<Input
						id="id-type"
						value={idType}
						onChange={e => setIdType(e.target.value)}
						disabled={idDone}
					/>
					<Label htmlFor="id-hash">Content hash</Label>
					<Input
						id="id-hash"
						value={idHash}
						onChange={e => setIdHash(e.target.value)}
						placeholder="sha256:…"
						disabled={idDone}
					/>
					<Button
						size="sm"
						disabled={idDone || !idUri.trim() || !idHash.trim() || idP}
						onClick={() =>
							idMut({ requestId, uri: idUri, documentType: idType, contentHash: idHash })
						}
					>
						{idDone ? "Verified" : idP ? "Submitting…" : "Attach"}
					</Button>
					{idE && <p className="text-destructive text-xs">{(idE as Error).message}</p>}
				</div>
			</Step>

			<Step n={3} title="Physician Signature">
				<div className="space-y-2">
					<Label htmlFor="ps-file">Upload Signed PDF (max 10 MB)</Label>
					<Input
						id="ps-file"
						type="file"
						accept="application/pdf"
						onChange={e => {
							setPdfError("")
							const file = e.target.files?.[0]
							if (!file) return
							if (file.type !== "application/pdf") {
								setPdfError("Only PDF files are accepted.")
								e.target.value = ""
								return
							}
							if (file.size > 10 * 1024 * 1024) {
								setPdfError("File exceeds 10 MB limit.")
								e.target.value = ""
								return
							}
							setPhysSigUri(URL.createObjectURL(file))
						}}
					/>
					{pdfError && <p className="text-destructive text-xs">{pdfError}</p>}
					<Label htmlFor="ps-hash">Content hash (sha256)</Label>
					<Input
						id="ps-hash"
						value={physSigHash}
						onChange={e => setPhysSigHash(e.target.value)}
						placeholder="sha256:…"
					/>
					<Button
						size="sm"
						variant="outline"
						disabled={!physSigUri.trim() || !physSigHash.trim() || sigP}
						onClick={() => sigMut({ requestId, uri: physSigUri, contentHash: physSigHash })}
					>
						{sigP ? "Attaching…" : "Attach"}
					</Button>
				</div>
			</Step>

			<Step n={4} title="Payment Cleared" done={payDone}>
				<div className="space-y-2">
					<Label htmlFor="inv-id">Invoice ID</Label>
					<Input
						id="inv-id"
						value={invoiceId}
						onChange={e => setInvoiceId(e.target.value)}
						disabled={payDone}
					/>
					<Button
						size="sm"
						disabled={payDone || !invoiceId.trim() || payP}
						onClick={() => payMut({ requestId, invoiceId })}
					>
						{payDone ? "Cleared" : payP ? "Submitting…" : "Mark cleared"}
					</Button>
				</div>
			</Step>

			<Step n={5} title="Release" done={released}>
				<div className="space-y-2">
					<Label htmlFor="rec">Recipient</Label>
					<Input
						id="rec"
						value={recipient}
						onChange={e => setRecipient(e.target.value)}
						placeholder="Patient or authorized agent"
						disabled={released}
					/>
					<Label htmlFor="doc-types">Document types (comma-separated)</Label>
					<Input
						id="doc-types"
						value={docTypes}
						onChange={e => setDocTypes(e.target.value)}
						disabled={released}
					/>
					<Label htmlFor="hashes">Content hashes (comma-separated)</Label>
					<Input
						id="hashes"
						value={contentHashes}
						onChange={e => setContentHashes(e.target.value)}
						placeholder="sha256:abc…, sha256:def…"
						disabled={released}
					/>
					{releaseDisabled && !released && (
						<Alert>
							<AlertDescription>
								Complete DPA + identity + payment, then fill recipient + content hashes.
							</AlertDescription>
						</Alert>
					)}
					<Button onClick={onRelease} disabled={releaseDisabled || relP}>
						{released ? "Released" : relP ? "Releasing…" : "Release Records"}
					</Button>
					{relE && <p className="text-destructive text-xs">{(relE as Error).message}</p>}
				</div>
			</Step>
		</div>
	)
}

function Step({
	n,
	title,
	done,
	children,
}: {
	n: number
	title: string
	done?: boolean
	children: React.ReactNode
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Badge variant={done ? "default" : "outline"} className="text-[10px]">
						Step {n}
					</Badge>
					<span>{title}</span>
					{done && (
						<Badge variant="default" className="ml-auto text-[10px]">
							✓
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}
