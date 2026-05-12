"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { DietOrderCard } from "@/features/nutrition/components/diet-order-card"
import { FhirNutritionOrderEditor } from "@/features/nutrition/components/fhir-nutrition-order-editor"
import { MalnutritionRiskBadge } from "@/features/nutrition/components/malnutrition-risk-badge"
import { MealPlanEditor } from "@/features/nutrition/components/meal-plan-editor"
import { NutritionAssessmentForm } from "@/features/nutrition/components/nutrition-assessment-form"

import { useNutritionAssessmentsQuery } from "@/features/nutrition/api/nutrition.hooks"

interface NutritionTabProps {
	encounterId: string
	patientId: string
	facilityId: string
}

export function NutritionTab({ encounterId, patientId, facilityId }: NutritionTabProps) {
	const { data: assessments } = useNutritionAssessmentsQuery(encounterId, { limit: 1 })
	const latestAssessment = assessments?.data[0]

	return (
		<div className="space-y-4 p-6">
			{/* Risk summary banner */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Nutrition</h2>
					<p className="text-sm text-muted-foreground">
						Malnutrition screening, meal planning, and diet orders
					</p>
				</div>
				{latestAssessment && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>Malnutrition risk:</span>
						<MalnutritionRiskBadge risk={latestAssessment.malnutritionRisk} />
					</div>
				)}
			</div>

			{/* Sub-tabs */}
			<Tabs defaultValue="assessment">
				<TabsList variant="line">
					<TabsTrigger value="assessment">Assessment</TabsTrigger>
					<TabsTrigger value="meal-plan">Meal Plan</TabsTrigger>
					<TabsTrigger value="diet-orders">Diet Orders</TabsTrigger>
				</TabsList>

				<TabsContent value="assessment" className="mt-4">
					<NutritionAssessmentForm encounterId={encounterId} patientId={patientId} facilityId={facilityId} />
				</TabsContent>

				<TabsContent value="meal-plan" className="mt-4">
					<MealPlanEditor encounterId={encounterId} patientId={patientId} />
				</TabsContent>

				<TabsContent value="diet-orders" className="mt-4">
					{latestAssessment ? (
						<FhirNutritionOrderEditor
							assessmentId={latestAssessment.id}
							encounterId={encounterId}
							patientId={patientId}
						/>
					) : (
						<DietOrderCard encounterId={encounterId} />
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
