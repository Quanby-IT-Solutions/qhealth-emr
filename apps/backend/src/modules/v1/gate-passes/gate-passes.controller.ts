import {
    Controller,
    Get,
    Param,
    Post,
    Body,
    Res,
    Header,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common"
import { Response } from "express"

import { GatePassesService } from "./gate-passes.service"
import { renderPng, renderSvg } from "@/utils/qr"

@Controller("api/v1/gate-passes")
export class GatePassesController {
    constructor(private readonly service: GatePassesService) {}

    @Post()
    async create(@Body() body: { encounterId: string; deliveredVia: "print" | "qr" | "both" }) {
        if (!body?.encounterId) throw new BadRequestException("encounterId is required")
        return this.service.create(body.encounterId, body.deliveredVia ?? "both")
    }

    @Get(":id")
    async get(@Param("id") id: string) {
        return this.service.getById(id)
    }

    @Get(":id/qr.png")
    @Header("Content-Type", "image/png")
    async qrPng(@Param("id") id: string, @Res() res: Response) {
        const row = await this.service.getById(id)
        if (!row?.qrToken) throw new NotFoundException("QR token not found for gate pass")
        const buf = await renderPng(row.qrToken)
        res.send(buf)
    }

    @Get(":id/qr.svg")
    @Header("Content-Type", "image/svg+xml")
    async qrSvg(@Param("id") id: string, @Res() res: Response) {
        const row = await this.service.getById(id)
        if (!row?.qrToken) throw new NotFoundException("QR token not found for gate pass")
        const svg = await renderSvg(row.qrToken)
        res.send(svg)
    }

    @Post(":id/mark-printed")
    async markPrinted(@Param("id") id: string) {
        return this.service.markPrinted(id)
    }
}
