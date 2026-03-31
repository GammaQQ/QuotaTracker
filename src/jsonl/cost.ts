/** Token cost calculation using LiteLLM pricing data. */

const LITELLM_PRICING_URL =
	"https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"

export type PricingData = Map<string, ModelPricing>

type ModelPricing = {
	inputCostPerToken: number
	outputCostPerToken: number
	cacheCreationCostPerToken: number
	cacheReadCostPerToken: number
}

// Embedded fallback pricing for when LiteLLM is unreachable
const FALLBACK_PRICING: Record<string, ModelPricing> = {
	"claude-sonnet-4-20250514": {
		inputCostPerToken: 3 / 1_000_000,
		outputCostPerToken: 15 / 1_000_000,
		cacheCreationCostPerToken: 3.75 / 1_000_000,
		cacheReadCostPerToken: 0.3 / 1_000_000,
	},
	"claude-sonnet-4-6": {
		inputCostPerToken: 3 / 1_000_000,
		outputCostPerToken: 15 / 1_000_000,
		cacheCreationCostPerToken: 3.75 / 1_000_000,
		cacheReadCostPerToken: 0.3 / 1_000_000,
	},
	"claude-opus-4-20250514": {
		inputCostPerToken: 5 / 1_000_000,
		outputCostPerToken: 25 / 1_000_000,
		cacheCreationCostPerToken: 6.25 / 1_000_000,
		cacheReadCostPerToken: 0.5 / 1_000_000,
	},
	"claude-opus-4-6": {
		inputCostPerToken: 5 / 1_000_000,
		outputCostPerToken: 25 / 1_000_000,
		cacheCreationCostPerToken: 6.25 / 1_000_000,
		cacheReadCostPerToken: 0.5 / 1_000_000,
	},
	"claude-haiku-4-5-20251001": {
		inputCostPerToken: 1 / 1_000_000,
		outputCostPerToken: 5 / 1_000_000,
		cacheCreationCostPerToken: 1.25 / 1_000_000,
		cacheReadCostPerToken: 0.1 / 1_000_000,
	},
}

let cachedPricing: PricingData | null = null

/** Fetch pricing data from LiteLLM with fallback to embedded prices. */
export async function loadPricing(): Promise<PricingData> {
	if (cachedPricing) return cachedPricing

	const pricing: PricingData = new Map()

	// Load fallback first
	for (const [model, data] of Object.entries(FALLBACK_PRICING)) {
		pricing.set(model, data)
	}

	try {
		const response = await fetch(LITELLM_PRICING_URL, { signal: AbortSignal.timeout(5000) })
		if (response.ok) {
			const data = (await response.json()) as Record<string, Record<string, unknown>>
			for (const [model, info] of Object.entries(data)) {
				if (!model.startsWith("claude")) continue
				const inputCost = info["input_cost_per_token"]
				const outputCost = info["output_cost_per_token"]
				if (typeof inputCost !== "number" || typeof outputCost !== "number") continue

				pricing.set(model, {
					inputCostPerToken: inputCost,
					outputCostPerToken: outputCost,
					cacheCreationCostPerToken: (info["cache_creation_input_token_cost"] as number) ?? inputCost * 1.25,
					cacheReadCostPerToken: (info["cache_read_input_token_cost"] as number) ?? inputCost * 0.1,
				})
			}
		}
	} catch {
		// Use fallback pricing
	}

	cachedPricing = pricing
	return pricing
}

/** Find the best pricing match for a model name. */
function findPricing(model: string, pricing: PricingData): ModelPricing | null {
	// Exact match
	if (pricing.has(model)) return pricing.get(model)!

	// Try with claude/ prefix (LiteLLM format)
	const prefixed = `claude/${model}`
	if (pricing.has(prefixed)) return pricing.get(prefixed)!

	// Try partial match (e.g. "claude-sonnet-4" matches "claude-sonnet-4-20250514")
	// Also normalize family names: "claude-opus-4-6" → "claude-opus-4"
	const baseModel = model.replace(/-\d{8}$/, "").replace(/-\d+$/, "")
	for (const [key, value] of pricing) {
		const baseKey = key.replace(/-\d{8}$/, "").replace(/-\d+$/, "")
		if (baseKey === baseModel) return value
		if (key.startsWith(model) || model.startsWith(key)) return value
	}

	// Generic fallback by family name
	if (model.includes("opus")) return pricing.get("claude-opus-4-6") ?? GENERIC_OPUS
	if (model.includes("sonnet")) return pricing.get("claude-sonnet-4-6") ?? GENERIC_SONNET
	if (model.includes("haiku")) return pricing.get("claude-haiku-4-5-20251001") ?? GENERIC_HAIKU

	// Unknown model — use sonnet pricing as safe middle ground
	return GENERIC_SONNET
}

const GENERIC_OPUS: ModelPricing = {
	inputCostPerToken: 5 / 1_000_000,
	outputCostPerToken: 25 / 1_000_000,
	cacheCreationCostPerToken: 6.25 / 1_000_000,
	cacheReadCostPerToken: 0.5 / 1_000_000,
}

const GENERIC_SONNET: ModelPricing = {
	inputCostPerToken: 3 / 1_000_000,
	outputCostPerToken: 15 / 1_000_000,
	cacheCreationCostPerToken: 3.75 / 1_000_000,
	cacheReadCostPerToken: 0.3 / 1_000_000,
}

const GENERIC_HAIKU: ModelPricing = {
	inputCostPerToken: 1 / 1_000_000,
	outputCostPerToken: 5 / 1_000_000,
	cacheCreationCostPerToken: 1.25 / 1_000_000,
	cacheReadCostPerToken: 0.1 / 1_000_000,
}

/** Calculate cost for a single entry. */
export function calculateEntryCost(
	model: string,
	inputTokens: number,
	outputTokens: number,
	cacheCreationTokens: number,
	cacheReadTokens: number,
	pricing: PricingData,
): number {
	const p = findPricing(model, pricing)!

	const nonCachedInput = Math.max(0, inputTokens - cacheReadTokens)
	return (
		nonCachedInput * p.inputCostPerToken +
		cacheReadTokens * p.cacheReadCostPerToken +
		cacheCreationTokens * p.cacheCreationCostPerToken +
		outputTokens * p.outputCostPerToken
	)
}
