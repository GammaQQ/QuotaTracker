import { authorizedFetch } from "../utils/http.ts"
import type { OAuthData, WindowData, ExtraUsageData } from "../types.ts"
import { getCredentials, getRefreshableCredentials } from "./credentials.ts"
import { getPlanFromTier } from "../analysis/plans.ts"

type RawUsageResponse = {
	five_hour?: { utilization?: number; resets_at?: string | null }
	seven_day?: { utilization?: number; resets_at?: string | null }
	seven_day_opus?: { utilization?: number; resets_at?: string | null }
	seven_day_sonnet?: { utilization?: number; resets_at?: string | null }
	extra_usage?: {
		is_enabled?: boolean
		utilization?: number
		used_credits?: number
		monthly_limit?: number
	}
}

function parseWindow(raw?: { utilization?: number; resets_at?: string | null }): WindowData | null {
	if (!raw || raw.utilization == null) return null

	let remainingSeconds: number | null = null
	if (raw.resets_at) {
		const resetTime = new Date(raw.resets_at).getTime()
		remainingSeconds = Math.max(0, Math.round((resetTime - Date.now()) / 1000))
	}

	return {
		utilization: raw.utilization / 100,
		resetsAt: raw.resets_at ?? null,
		remainingSeconds,
	}
}

function parseExtraUsage(raw?: RawUsageResponse["extra_usage"]): ExtraUsageData | null {
	if (!raw || !raw.is_enabled) return null
	return {
		isEnabled: raw.is_enabled,
		utilization: (raw.utilization ?? 0) / 100,
		usedCredits: raw.used_credits ?? 0,
		monthlyLimit: raw.monthly_limit ?? 0,
	}
}

/** Fetch usage data from Anthropic OAuth API. */
async function fetchUsageRaw(token: string): Promise<RawUsageResponse> {
	const response = await authorizedFetch(
		"https://api.anthropic.com/api/oauth/usage",
		token,
		{
			headers: {
				"anthropic-beta": "oauth-2025-04-20",
				"Accept": "application/json",
			},
		},
	)

	if (!response.ok) {
		throw new Error(`OAuth API error: ${response.status} ${response.statusText}`)
	}

	return (await response.json()) as RawUsageResponse
}

/** Refresh an expired token using the refresh token. Returns new access token or null. */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
	try {
		const response = await authorizedFetch(
			"https://platform.claude.com/v1/oauth/token",
			null,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
				}),
			},
		)

		if (!response.ok) return null
		const data = (await response.json()) as { access_token?: string }
		return data.access_token ?? null
	} catch {
		return null
	}
}

/** Fetch OAuth usage data with automatic token refresh on 401. */
export async function fetchOAuthData(): Promise<OAuthData | null> {
	const creds = getCredentials()
	if (!creds) return null

	let token = creds.accessToken
	let raw: RawUsageResponse

	try {
		raw = await fetchUsageRaw(token)
	} catch (err) {
		// Try token refresh on auth failure
		if (err instanceof Error && err.message.includes("401")) {
			const refreshable = getRefreshableCredentials()
			if (!refreshable) throw err

			const newToken = await refreshAccessToken(refreshable.refreshToken)
			if (!newToken) throw err

			token = newToken
			raw = await fetchUsageRaw(token)
		} else {
			throw err
		}
	}

	const plan = getPlanFromTier(creds.rateLimitTier)

	const fiveHour = parseWindow(raw.five_hour)
	const sevenDay = parseWindow(raw.seven_day)

	if (!fiveHour || !sevenDay) {
		throw new Error("OAuth API returned incomplete data: missing five_hour or seven_day")
	}

	return {
		plan,
		fiveHour,
		sevenDay,
		sevenDayOpus: parseWindow(raw.seven_day_opus),
		sevenDaySonnet: parseWindow(raw.seven_day_sonnet),
		extraUsage: parseExtraUsage(raw.extra_usage),
	}
}
