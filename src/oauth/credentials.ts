import { readFileSync } from "node:fs"
import { getCredentialPaths } from "../utils/paths.ts"
import { readFromKeychain } from "../utils/keychain.ts"

export type CredentialResult = {
	accessToken: string
	refreshToken: string | null
	rateLimitTier: string
	source: "file" | "keychain" | "env"
}

type CredentialData = {
	claudeAiOauth?: {
		accessToken?: string
		refreshToken?: string
		rateLimitTier?: string
	}
}

/** Read raw credential data — Keychain first (where Claude Code stores them), file as fallback. */
function readCredentialData(): { data: CredentialData; source: "file" | "keychain" } | null {
	// 1. macOS Keychain (primary — Claude Code stores credentials here)
	const keychainData = readFromKeychain("Claude Code-credentials") as CredentialData | null
	if (keychainData?.claudeAiOauth?.accessToken) {
		return { data: keychainData, source: "keychain" }
	}

	// 2. File-based fallback — native path + WSL paths on Windows
	for (const credPath of getCredentialPaths()) {
		try {
			const raw = readFileSync(credPath, "utf-8")
			const data = JSON.parse(raw) as CredentialData
			if (data?.claudeAiOauth?.accessToken) {
				return { data, source: "file" }
			}
		} catch {
			// File not found or invalid JSON — try next
		}
	}

	return null
}

/** Extract credentials from raw data. */
function extractCredentials(data: CredentialData, source: "file" | "keychain"): CredentialResult | null {
	const oauth = data.claudeAiOauth
	if (!oauth?.accessToken) return null

	return {
		accessToken: oauth.accessToken,
		refreshToken: oauth.refreshToken ?? null,
		rateLimitTier: oauth.rateLimitTier ?? "",
		source,
	}
}

/** Get OAuth credentials from file, keychain, or environment variable. */
export function getCredentials(): CredentialResult | null {
	const result = readCredentialData()
	if (result) {
		const creds = extractCredentials(result.data, result.source)
		if (creds) return creds
	}

	// Environment variable fallback (all platforms)
	const envToken = process.env["CLAUDE_CODE_OAUTH_TOKEN"]
	if (envToken) {
		return {
			accessToken: envToken,
			refreshToken: null,
			rateLimitTier: "",
			source: "env",
		}
	}

	return null
}

/** Attempt to refresh an expired OAuth token. Returns new token or null. */
export function getRefreshableCredentials(): { refreshToken: string; rateLimitTier: string } | null {
	const result = readCredentialData()
	if (!result) return null

	const oauth = result.data.claudeAiOauth
	if (!oauth?.refreshToken) return null

	return {
		refreshToken: oauth.refreshToken,
		rateLimitTier: oauth.rateLimitTier ?? "",
	}
}
