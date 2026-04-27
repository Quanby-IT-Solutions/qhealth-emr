"use client"

import React from "react"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Textarea } from "@/core/components/ui/textarea"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { Maximize2, ZoomIn, ExternalLink, MonitorPlay, ImageOff } from "lucide-react"

function usePermissionSet() {
    const { data: profile } = useMyProfile()
    const permissions = profile?.activeRole?.permissions ?? []
    return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
    return permSet.has(`${module}:${action}`)
}

export default function RadiologyPage() {
    const permSet = usePermissionSet()

    if (!(can(permSet, "radiology", "view") || can(permSet, "laboratory", "view"))) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                You do not have permission to access radiology services.
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Radiology Report</h1>
                    <p className="text-muted-foreground text-sm">Chest CT — Mei Lin Chen · Acct# R-8842-1109</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">Save draft</Button>
                    <Button>Sign & release</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT: PACS Viewer */}
                <div className="md:col-span-2">
                    <Card className="overflow-hidden">
                        {/* PACS Toolbar */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
                            <div className="flex items-center gap-2.5">
                                <MonitorPlay className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">PACS Viewer · Embedded</span>
                                <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-500 border border-green-500/20 rounded-full px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    Connected
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="w-8 h-8">
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8">
                                    <Maximize2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open external
                                </Button>
                            </div>
                        </div>

                        {/* Viewer Area — empty state */}
                        <div className="bg-black">
                            {/* 2x2 grid matching the screenshot layout */}
                            <div className="grid grid-cols-2 divide-x divide-zinc-800">
                                {/* Top-left */}
                                <div className="relative h-64 border-b border-zinc-800 flex items-center justify-center">
                                    <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-mono tracking-widest">SLICE 8</div>
                                    <EmptySlice />
                                </div>
                                {/* Top-right */}
                                <div className="relative h-64 border-b border-zinc-800 flex items-center justify-center">
                                    <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-mono tracking-widest">SLICE 16</div>
                                    <EmptySlice />
                                </div>
                                {/* Bottom-left */}
                                <div className="relative h-64 flex items-center justify-center">
                                    <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-mono tracking-widest">SLICE 24</div>
                                    <EmptySlice />
                                    <div className="absolute bottom-2 left-3 text-[10px] text-zinc-400 font-mono">
                                        CHEN, MEI LIN · 67F · CT CHEST W/CONTRAST
                                    </div>
                                </div>
                                {/* Bottom-right */}
                                <div className="relative h-64 flex items-center justify-center">
                                    <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-mono tracking-widest">SLICE 32</div>
                                    <EmptySlice />
                                </div>
                            </div>

                            {/* Bottom bar */}
                            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800">
                                <span className="text-[11px] text-zinc-500 font-mono">4 series · 248 images · Acquired 09:02</span>
                                <span className="text-[11px] text-zinc-500 font-mono">Study UID: 1.2.840.113619.2.5.1762583153.4421</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: Report panels */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Clinical History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                67F with persistent dry cough × 6 weeks, weight loss, history of breast carcinoma. Rule out metastatic disease.
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Findings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea className="h-32" defaultValue={"Bilateral pulmonary nodules, largest 1.4 cm in right upper lobe\nNo pleural effusion. Heart size normal.\nMediastinal lymph node enlargement, station 4R measuring 1.8 cm.\nNo bony lesions."} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Impression</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea className="h-24" defaultValue={"1. Multiple pulmonary nodules suspicious for metastatic disease.\n2. Mediastinal adenopathy. Recommend PET-CT correlation."} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Attachments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-background rounded px-3 py-2">
                                    <div className="text-sm">CT_chest_report_v2.pdf</div>
                                    <div className="text-xs text-muted-foreground">2.4 MB</div>
                                </div>
                                <div className="flex items-center justify-between bg-background rounded px-3 py-2">
                                    <div className="text-sm">Prior_imaging_comparison.pdf</div>
                                    <div className="text-xs text-muted-foreground">2.4 MB</div>
                                </div>
                                <div className="mt-2 rounded border-dashed border-2 border-border p-3 text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/40 transition-colors">
                                    + Attach file
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function EmptySlice() {
    return (
        <div className="flex flex-col items-center justify-center gap-2 select-none">
            <ImageOff className="w-6 h-6 text-zinc-700" />
            <span className="text-[11px] text-zinc-600 font-mono tracking-wide">NO IMAGE LOADED</span>
        </div>
    )
}