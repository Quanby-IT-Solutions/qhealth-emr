import { Injectable, Logger } from "@nestjs/common"
import { createTransport, type Transporter } from "nodemailer"

import { env } from "@/config/env.config"

export interface MailAttachment {
	filename: string
	content: Buffer | Uint8Array
	contentType?: string
}

export interface SendMailInput {
	to: string
	subject: string
	text: string
	html?: string
	attachments?: MailAttachment[]
}

export interface SendMailResult {
	delivered: boolean
	messageId: string | null
	transport: "smtp" | "log"
}

@Injectable()
export class MailerService {
	private readonly logger = new Logger(MailerService.name)
	private transporter: Transporter | null = null

	isConfigured(): boolean {
		return Boolean(
			env.MAILER_MODE === "smtp" &&
				env.SMTP_HOST?.trim() &&
				env.SMTP_USER?.trim() &&
				env.SMTP_PASS?.trim() &&
				env.SMTP_FROM?.trim()
		)
	}

	private getTransporter(): Transporter {
		if (this.transporter) return this.transporter
		this.transporter = createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT ?? 587,
			secure: env.SMTP_SECURE,
			auth: {
				user: env.SMTP_USER!,
				pass: env.SMTP_PASS!,
			},
		})
		return this.transporter
	}

	async send(input: SendMailInput): Promise<SendMailResult> {
		if (!this.isConfigured()) {
			this.logger.warn(
				`SMTP not configured (MAILER_MODE=${env.MAILER_MODE}). Skipping send to ${input.to}: ${input.subject}`
			)
			return { delivered: false, messageId: null, transport: "log" }
		}

		try {
			const info = await this.getTransporter().sendMail({
				from: env.SMTP_FROM!,
				to: input.to,
				subject: input.subject,
				text: input.text,
				html: input.html,
				attachments: input.attachments?.map(a => ({
					filename: a.filename,
					content: Buffer.from(a.content),
					contentType: a.contentType,
				})),
			})
			return {
				delivered: true,
				messageId: typeof info.messageId === "string" ? info.messageId : null,
				transport: "smtp",
			}
		} catch (error) {
			this.logger.error(
				`SMTP send to ${input.to} failed: ${error instanceof Error ? error.message : error}`
			)
			throw error
		}
	}
}
