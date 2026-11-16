/**
 * Single source of truth for app identity values.
 *
 * Consumed by the web manifest (`app/manifest.ts`), the root layout
 * metadata/viewport (`app/layout.tsx`), and — indirectly via text extraction —
 * the Node ESM PWA icon generator (`scripts/generate-pwa-icons.mjs`), which
 * cannot import TypeScript directly without a build step.
 */

/**
 * Full application name shown in the manifest and install prompts.
 */
export const APP_NAME = "Quanby"

/**
 * Short application name used where space is constrained (home screen label).
 */
export const APP_SHORT_NAME = "Quanby"

/**
 * Human-readable description of the app for the manifest and metadata.
 */
export const APP_DESCRIPTION = "Quanby Solutions, Inc. clinical records system"

/**
 * Fixed brand theme color for the manifest and generated icon backgrounds (indigo).
 */
export const APP_THEME_COLOR = "#4f46e5"

/**
 * Manifest background color shown behind the splash screen.
 */
export const APP_BACKGROUND_COLOR = "#ffffff"

/**
 * `<meta name="theme-color">` value for light color scheme.
 */
export const VIEWPORT_THEME_COLOR_LIGHT = "#ffffff"

/**
 * `<meta name="theme-color">` value for dark color scheme.
 */
export const VIEWPORT_THEME_COLOR_DARK = "#0a0a0a"
