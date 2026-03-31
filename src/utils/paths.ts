import { existsSync, readdirSync } from "node:fs"
import { homedir, platform } from "node:os"
import { join } from "node:path"
import { execSync } from "node:child_process"

/** Discover all valid Claude Code data directories (native + WSL on Windows). */
export function getClaudeDataPaths(): string[] {
	const home = homedir()
	const paths: string[] = []

	// Custom override via env
	const envDir = process.env["CLAUDE_CONFIG_DIR"]
	if (envDir) {
		for (const p of envDir.split(",")) {
			const trimmed = p.trim()
			if (trimmed) paths.push(join(trimmed, "projects"))
		}
	}

	// Native paths
	addClaudePaths(home, paths)

	// WSL paths (Windows only)
	if (platform() === "win32") {
		for (const wslHome of discoverWSLHomes()) {
			addClaudePaths(wslHome, paths)
		}
	}

	return [...new Set(paths)]
}

/** Add XDG and legacy claude paths from a home directory. */
function addClaudePaths(home: string, paths: string[]): void {
	const xdgPath = join(home, ".config", "claude", "projects")
	if (existsSync(xdgPath)) paths.push(xdgPath)

	const legacyPath = join(home, ".claude", "projects")
	if (existsSync(legacyPath)) paths.push(legacyPath)
}

/** Discover WSL user home directories accessible from Windows via \\wsl$\. */
function discoverWSLHomes(): string[] {
	const homes: string[] = []
	try {
		// List installed WSL distros
		const output = execSync("wsl --list --quiet", {
			timeout: 5000,
			stdio: ["pipe", "pipe", "pipe"],
			encoding: "utf-8",
		}).replace(/\0/g, "") // wsl --list outputs UTF-16 with null bytes

		const distros = output.split("\n").map((s) => s.trim()).filter(Boolean)

		for (const distro of distros) {
			// Try \\wsl$\<distro>\home\<user> and \\wsl.localhost\<distro>\home\<user>
			for (const prefix of [`\\\\wsl$\\${distro}`, `\\\\wsl.localhost\\${distro}`]) {
				const homePath = join(prefix, "home")
				try {
					if (!existsSync(homePath)) continue
					const users = readdirSync(homePath)
					for (const user of users) {
						const userHome = join(homePath, user)
						// Only add if there's actually a .claude dir
						if (existsSync(join(userHome, ".claude")) || existsSync(join(userHome, ".config", "claude"))) {
							homes.push(userHome)
						}
					}
				} catch {
					// Access denied or not available
				}
			}
		}
	} catch {
		// WSL not installed or not available
	}
	return homes
}

/** Get all credential file paths (native + WSL on Windows). */
export function getCredentialPaths(): string[] {
	const paths = [join(homedir(), ".claude", ".credentials.json")]

	if (platform() === "win32") {
		for (const wslHome of discoverWSLHomes()) {
			paths.push(join(wslHome, ".claude", ".credentials.json"))
		}
	}

	return paths
}

/** Return the state directory for quotatracker data (history, heatmap). */
export function getStateDir(): string {
	return join(homedir(), ".claude", ".state")
}

/** Return the path to credentials file. */
export function getCredentialsPath(): string {
	return join(homedir(), ".claude", ".credentials.json")
}
