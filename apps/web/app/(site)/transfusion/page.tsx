"use client"

import React, { useState } from "react"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import { Scan, User, Droplet, FileText, CheckCircle2 } from "lucide-react"

function usePermissionSet() {
    const { data: profile } = useMyProfile()
    const permissions = profile?.activeRole?.permissions ?? []
    return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
    return permSet.has(`${module}:${action}`)
}

export default function TransfusionPage() {
    const permSet = usePermissionSet()

    const [scanned, setScanned] = useState({
        wristband: false,
        bloodProduct: false,
        cpoe: false,
    })

    const allDone = scanned.wristband && scanned.bloodProduct && scanned.cpoe
    const completedCount = Object.values(scanned).filter(Boolean).length

    const statusBorderClass = allDone ? "border-green-500" : "border-orange-400"
    const statusTextClass = allDone ? "text-green-100" : "text-orange-100"
    const statusMessage = allDone
        ? "All three scans verified — Ready to start transfusion."
        : `Awaiting all three scans — ${completedCount} of 3 completed.`

    const toggleScan = (key: keyof typeof scanned) => {
        setScanned(prev => ({ ...prev, [key]: !prev[key] }))
    }

    if (!can(permSet, "laboratory", "view")) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                You do not have permission to access transfusion verification.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Bedside Transfusion Verification</h1>
                <p className="text-muted-foreground text-sm">
                    Scan patient, product, and CPOE order — system enforces 3-way match
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT SIDE */}
                <div className="md:col-span-2 space-y-4">

                    {/* Patient Card */}
                    <Card className="p-4 mb-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-muted">
                                <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <div className="font-medium">Yusuf Mansour</div>
                                <div className="text-sm text-muted-foreground">
                                    MRN 551003 · 62M · Surg-2 · Bed 8 · Blood group A+
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Scan Cards */}
                    <div className="space-y-3">
                    
                        {/* Patient Wristband */}
                        <Card
                            className={`p-4 transition-all duration-150 cursor-pointer select-none
                                border-2
                                hover:shadow-md hover:scale-[1.01]
                                active:scale-[0.99] active:shadow-inner
                                ${scanned.wristband
                                    ? "border-solid"
                                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
                                }`}
                            onClick={() => toggleScan("wristband")}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border-2 bg-background transition-colors
                                    ${scanned.wristband ? "border-green-500" : "border-muted-foreground/30"}`}>
                                    {scanned.wristband
                                        ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        : <Scan className="w-6 h-6 text-muted-foreground" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">Patient wristband</div>
                                    <div className="text-xs text-muted-foreground">
                                        {scanned.wristband ? "Scanned successfully" : "Tap to scan barcode on patient ID band"}
                                    </div>
                                </div>
                                {!scanned.wristband && (
                                    <div className="text-xs text-muted-foreground/50 font-mono tracking-wide uppercase">
                                        Tap
                                    </div>
                                )}
                            </div>
                        </Card>
                    
                        {/* Blood Product */}
                        <Card
                            className={`p-4 transition-all duration-150 cursor-pointer select-none
                                border-2
                                hover:shadow-md hover:scale-[1.01]
                                active:scale-[0.99] active:shadow-inner
                                ${scanned.bloodProduct
                                    ? "border-solid"
                                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
                                }`}
                            onClick={() => toggleScan("bloodProduct")}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border-2 bg-background transition-colors
                                    ${scanned.bloodProduct ? "border-green-500" : "border-muted-foreground/30"}`}>
                                    {scanned.bloodProduct
                                        ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        : <Droplet className="w-6 h-6 text-red-500" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">Blood product unit</div>
                                    <div className="text-xs text-muted-foreground">
                                        {scanned.bloodProduct ? "Scanned successfully" : "Tap to scan ISBT-128 label on bag"}
                                    </div>
                                </div>
                                {!scanned.bloodProduct && (
                                    <div className="text-xs text-muted-foreground/50 font-mono tracking-wide uppercase">
                                        Tap
                                    </div>
                                )}
                            </div>
                        </Card>
                    
                        {/* CPOE */}
                        <Card
                            className={`p-4 transition-all duration-150 cursor-pointer select-none
                                border-2
                                hover:shadow-md hover:scale-[1.01]
                                active:scale-[0.99] active:shadow-inner
                                ${scanned.cpoe
                                    ? "border-solid"
                                    : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
                                }`}
                            onClick={() => toggleScan("cpoe")}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border-2 bg-background transition-colors
                                    ${scanned.cpoe ? "border-green-500" : "border-muted-foreground/30"}`}>
                                    {scanned.cpoe
                                        ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        : <FileText className="w-6 h-6 text-muted-foreground" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm">CPOE order</div>
                                    <div className="text-xs text-muted-foreground">
                                        {scanned.cpoe ? "Scanned successfully" : "Tap to scan order barcode on chart/printout"}
                                    </div>
                                </div>
                                {!scanned.cpoe && (
                                    <div className="text-xs text-muted-foreground/50 font-mono tracking-wide uppercase">
                                        Tap
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Status */}
                        <div className={`bg-muted rounded-lg p-4 flex items-center justify-between border-2 transition-colors duration-300 ${statusBorderClass} ${statusTextClass}`}>
                            <div className="text-sm">
                                {statusMessage}
                            </div>
                            <Button
                                disabled={!allDone}
                                className={`transition-all duration-200 font-medium px-5 py-2 rounded-md
                                    ${allDone
                                        ? "bg-green-600 hover:bg-green-500 active:scale-95 text-white shadow-md hover:shadow-green-500/30 cursor-pointer"
                                        : "bg-muted-foreground/10 text-muted-foreground/40 border border-muted-foreground/20 cursor-not-allowed"
                                    }`}
                            >
                                Start transfusion
                            </Button>
                        </div>

                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Documentation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">

                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">
                                    Witness
                                </label>
                                <Input placeholder="Second nurse name" />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Input placeholder="BP" />
                                <Input placeholder="HR" />
                                <Input placeholder="Temp" />
                            </div>

                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">
                                    Reactions
                                </label>
                                <Textarea placeholder="None observed..." />
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}