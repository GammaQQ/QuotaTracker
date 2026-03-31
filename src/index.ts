#!/usr/bin/env node

import { gather } from "./gather.ts"

const args = process.argv.slice(2)
const pretty = args.includes("--pretty")

try {
	const output = await gather()
	const json = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output)
	process.stdout.write(json + "\n")
} catch (err) {
	process.stderr.write(`quotatracker: fatal error: ${err}\n`)
	process.exit(1)
}
