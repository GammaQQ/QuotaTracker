import { execSync } from "node:child_process"
import { platform } from "node:os"

/**
 * Read credential JSON from OS credential store.
 * macOS: Keychain, Windows: Credential Manager, Linux: secret-tool (libsecret)
 */
export function readFromKeychain(service: string): unknown | null {
	const os = platform()

	// Only macOS stores Claude Code credentials in Keychain.
	// Windows and Linux use ~/.claude/.credentials.json (handled in credentials.ts file fallback).
	if (os !== "darwin") return null

	try {
		const raw = execSync(
			`/usr/bin/security find-generic-password -s "${service}" -w`,
			{ timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
		).toString().trim()
		if (!raw) return null
		return JSON.parse(raw)
	} catch {
		return null
	}
}
