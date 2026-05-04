import { index, primaryKey } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"

// ============================================================================
// BETTER AUTH TABLES — Keep aligned with enabled Better Auth plugins
// ============================================================================

export const users = createTable("users", t => ({
	id: t.text("id").primaryKey(),
	name: t.text("name").notNull(),
	email: t.text("email").notNull().unique(),
	emailVerified: t.boolean("email_verified").default(false).notNull(),
	image: t.text("image"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	twoFactorEnabled: t.boolean("two_factor_enabled").default(false).notNull(),
}))

export const sessions = createTable("sessions", t => ({
	id: t.text("id").primaryKey(),
	token: t.text("token").notNull().unique(),
	userId: t
		.text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: t.timestamp("expires_at").notNull(),
	ipAddress: t.text("ip_address"),
	userAgent: t.text("user_agent"),
	createdAt: t.timestamp("created_at").notNull().defaultNow(),
	updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
}))

export const accounts = createTable(
	"accounts",
	t => ({
		id: t.text("id"),
		accountId: t.text("account_id").notNull(),
		providerId: t.text("provider_id").notNull(),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: t.text("access_token"),
		refreshToken: t.text("refresh_token"),
		idToken: t.text("id_token"),
		accessTokenExpiresAt: t.timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: t.timestamp("refresh_token_expires_at"),
		scope: t.text("scope"),
		password: t.text("password"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		primaryKey({ columns: [t.providerId, t.accountId] }),
		index("account_user_id_idx").on(t.userId),
	]
)

export const verifications = createTable(
	"verifications",
	t => ({
		id: t.text("id"),
		identifier: t.text("identifier").notNull(),
		value: t.text("value").notNull(),
		expiresAt: t.timestamp("expires_at").notNull(),
		createdAt: t.timestamp("created_at").defaultNow(),
		updatedAt: t.timestamp("updated_at").defaultNow(),
	}),
	t => [primaryKey({ columns: [t.identifier, t.value] })]
)

export const twoFactors = createTable(
	"two_factors",
	t => ({
		id: t.text("id").primaryKey(),
		secret: t.text("secret").notNull(),
		backupCodes: t.text("backup_codes").notNull(),
		userId: t
			.text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	}),
	t => [index("two_factors_secret_idx").on(t.secret), index("two_factors_user_id_idx").on(t.userId)]
)

// Account lockout tracking for failed sign-in attempts (ADM-BE-02)
export const authLockout = createTable(
	"auth_lockout",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		identifier: t.text("identifier").notNull().unique(),
		failedAttempts: t.integer("failed_attempts").notNull().default(0),
		lastFailedAt: t.timestamp("last_failed_at"),
		lockedUntil: t.timestamp("locked_until"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	})
)
