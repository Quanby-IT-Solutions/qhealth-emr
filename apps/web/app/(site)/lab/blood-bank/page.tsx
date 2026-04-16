"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { BedsideMatching } from "@/features/lab/components/bedside-matching"
import { CrossMatchForm } from "@/features/lab/components/cross-match-form"

export default function BloodBankPage() {
	return (
		<Tabs defaultValue="cross-match">
			<TabsList className="mb-6">
				<TabsTrigger value="cross-match">Cross-Match Requests</TabsTrigger>
				<TabsTrigger value="bedside">Bedside Verification</TabsTrigger>
			</TabsList>
			<TabsContent value="cross-match">
				<CrossMatchForm />
			</TabsContent>
			<TabsContent value="bedside">
				<BedsideMatching />
			</TabsContent>
		</Tabs>
	)
}
