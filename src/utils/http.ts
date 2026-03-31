const ALLOWED_DOMAINS = new Set([
	"api.anthropic.com",
	"console.anthropic.com",
	"platform.claude.com",
])

const VERSION = "0.1.0"

/**
 * Make an HTTP request only to allowed Anthropic domains.
 * Prevents token exfiltration to third-party servers.
 */
export async function authorizedFetch(
	url: string,
	token: string | null,
	options: RequestInit = {},
): Promise<Response> {
	const domain = new URL(url).hostname
	if (!ALLOWED_DOMAINS.has(domain)) {
		throw new Error(`Request blocked: ${domain} is not an allowed domain`)
	}

	const headers = new Headers(options.headers)
	if (token) {
		headers.set("Authorization", `Bearer ${token}`)
	}
	if (!headers.has("User-Agent")) {
		headers.set("User-Agent", `quotatracker/${VERSION}`)
	}

	const response = await fetch(url, {
		...options,
		headers,
		redirect: "error", // block redirects to prevent token leakage
	})

	return response
}
