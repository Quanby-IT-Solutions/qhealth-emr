"use client"

import React from "react"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/core/components/ui/table"
import { Badge } from "@/core/components/ui/badge"

function usePermissionSet() {
    const { data: profile } = useMyProfile()
    const permissions = profile?.activeRole?.permissions ?? []
    return new Set(permissions.map((p: { module: string; action: string }) => `${p.module}:${p.action}`))
}

function can(permSet: Set<string>, module: string, action: string) {
    return permSet.has(`${module}:${action}`)
}

export default function ProcedureLoggingPage() {
    const permSet = usePermissionSet()

    if (!can(permSet, "laboratory", "view")) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                You do not have permission to access procedure logging.
            </div>
        )
    }

    const rows = [
        { id: "P-9912", patient: "Sara Petrova", procedure: "Phlebotomy", start: "09:12:04", end: "09:14:33", duration: "2m 29s", sla: "ok" },
        { id: "P-9913", patient: "Diego Hernández", procedure: "ABG draw", start: "09:18:50", end: "09:24:11", duration: "5m 21s", sla: "ok" },
        { id: "P-9914", patient: "James Okonkwo", procedure: "ECG", start: "09:25:00", end: "09:38:47", duration: "13m 47s", sla: "breach" },
        { id: "P-9915", patient: "Mei Lin Chen", procedure: "CT Chest", start: "09:30:12", end: "—", duration: "in progress", sla: "in-progress" },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Ancillary Procedure Logging</h1>
                    <p className="text-muted-foreground text-sm">Start/end barcode scans drive turnaround SLA tracking (ARTA Flow 3)</p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog>
                        <DialogTrigger render={<Button variant="outline">Open scan modal</Button>} />
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Patient Barcode Scan</DialogTitle>
                            </DialogHeader>

                            <div className="p-1">
                                <div className="rounded-md border-2 border-dashed border-border h-36 flex items-center justify-center mb-4">
                                    <div className="text-muted-foreground text-sm">Awaiting scan…</div>
                                </div>

                                <div className="text-xs text-muted-foreground mb-2">OR ENTER MANUALLY</div>
                                <Input placeholder="MRN or barcode" className="mb-3" />

                                <div className="flex items-center gap-3 mb-3">
                                    <Button className="bg-green-600 hover:bg-green-500 text-white" size="sm">
                                        ▶ Mark START
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="mark-end" />
                                        <label htmlFor="mark-end" className="text-sm text-muted-foreground">Mark END</label>
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    Timestamp will be logged with millisecond precision and operator ID.
                                </div>
                            </div>

                            <DialogFooter>
                                <DialogClose render={<Button variant="outline">Close</Button>} />
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">IN PROGRESS</div>
                        <div className="text-2xl font-semibold mt-2">1</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">COMPLETED TODAY</div>
                        <div className="text-2xl font-semibold mt-2">42</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">AVG TAT</div>
                        <div className="text-2xl font-semibold mt-2">8.4m</div>
                        <div className="text-xs text-muted-foreground">Target ≤ 10m</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">SLA BREACHES</div>
                        <div className="text-2xl font-semibold mt-2 text-destructive">3</div>
                    </CardContent>
                </Card>
            </div>

            {/* Procedure log table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Procedure log</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <tr>
                                <TableHead>ID</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Procedure</TableHead>
                                <TableHead>Start</TableHead>
                                <TableHead>End</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>SLA</TableHead>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {rows.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono">{r.id}</TableCell>
                                    <TableCell className="font-medium">{r.patient}</TableCell>
                                    <TableCell>{r.procedure}</TableCell>
                                    <TableCell>{r.start}</TableCell>
                                    <TableCell>{r.end}</TableCell>
                                    <TableCell>{r.duration}</TableCell>
                                    <TableCell>
                                        {r.sla === "ok" && <Badge>OK</Badge>}
                                        {r.sla === "breach" && <Badge variant="destructive">Breach</Badge>}
                                        {r.sla === "in-progress" && <Badge variant="secondary">—</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
