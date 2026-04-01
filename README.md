<p align="center">
  <img src="icon.svg" width="128" height="128" alt="QuotaTracker" />
</p>

<h1 align="center">QuotaTracker</h1>

<p align="center">
  <strong>Know exactly how much Claude you have left.</strong><br/>
  Real-time quota monitoring for Claude Pro, Max 5x & Max 20x plans.
</p>

<p align="center">
  <a href="https://github.com/GammaQQ/QuotaTracker/releases"><img src="https://img.shields.io/github/v/release/GammaQQ/QuotaTracker?style=flat-square&color=7c3aed" alt="Release" /></a>
  <img src="https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-green?style=flat-square" alt="Node" />
  <img src="https://img.shields.io/github/license/GammaQQ/QuotaTracker?style=flat-square" alt="License" />
</p>

---

## What is this?

QuotaTracker reads your Claude Code credentials and JSONL logs to give you a **single, unified view** of your API quota — session limits, weekly limits, per-model breakdowns, cost estimates, and burn rate projections.

It ships as:

| | Platform | Stack |
|---|---|---|
| **CLI** | macOS, Linux, Windows (WSL) | Node.js / Bun |
| **Desktop App** | macOS, Linux, Windows | Tauri 2 + React |
| **Native macOS App** | macOS 14+ | SwiftUI |

All UIs consume the same JSON output from the core CLI.

## Features

### Quota Monitoring
- **5-hour session window** — current utilization %, reset countdown, velocity tracking
- **7-day weekly window** — utilization % with reset time
- **Per-model limits** — separate Opus and Sonnet weekly quotas
- **Extra usage tracking** — credits used vs monthly limit for Max plans

### Cost Intelligence
- **Live cost calculation** — per-model pricing from LiteLLM with embedded fallbacks
- **Daily & monthly summaries** — token counts + costs aggregated from local JSONL logs
- **Session blocks** — 5-hour billing windows with burn rate (tokens/min, $/hr)
- **Limit estimation** — reverse-engineers your actual dollar limit from utilization %
- **Projections** — estimated end-of-session cost based on current burn rate

### Analysis Engine
- **Velocity tracking** — utilization change per minute over a rolling window
- **Runway estimation** — time remaining until you hit 100% via linear regression
- **Heatmap** — hourly peak utilization over 28 days
- **Smart recommendations** — suggests when to use Claude Code, switch to Codex, or wait

### Security
- **Credential auto-discovery** — macOS Keychain > file > environment variable > WSL paths
- **Domain whitelist** — HTTP requests locked to `api.anthropic.com`, `console.anthropic.com`, `platform.claude.com`
- **No credential exfil** — redirects blocked, tokens never sent to unauthorized domains
- **OAuth auto-refresh** — expired tokens refreshed transparently

### Cross-Platform
- **macOS** — Keychain integration, native SwiftUI menu bar app
- **Linux** — file-based credentials, Tauri desktop app
- **Windows** — WSL path auto-discovery for Claude Code credentials
- **Desktop** — Tauri 2 app with auto-update via GitHub Releases

---

## Install

### CLI (core)

```bash
# With bun (recommended)
bun install -g quotatracker

# With npm
npm install -g quotatracker

# Or run directly
bunx quotatracker
npx quotatracker
```

### Desktop App (Tauri)

Download the latest release for your platform from [GitHub Releases](https://github.com/GammaQQ/QuotaTracker/releases).

### Native macOS App

Build from source:

```bash
cd macos/QuotaTracker
swift build -c release
```

Requires the `quotatracker` CLI binary in one of:
- `~/.local/bin/quotatracker`
- `/usr/local/bin/quotatracker`

---

## Usage

### CLI

```bash
# JSON output (for piping / UIs)
quotatracker

# Human-readable formatted output
quotatracker --pretty
```

### Example Output

```jsonc
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "version": "0.1.0",
  "oauth": {
    "plan": { "tier": "default_claude_max_5x", "displayName": "Max 5x" },
    "fiveHour": { "utilization": 0.42, "remainingSeconds": 12345 },
    "sevenDay": { "utilization": 0.18, "remainingSeconds": 456789 },
    "sevenDayOpus": { "utilization": 0.31 },
    "sevenDaySonnet": { "utilization": 0.12 }
  },
  "usage": {
    "daily": [{ "date": "2026-04-01", "totalTokens": 847293, "totalCost": 8.47 }],
    "activeBlock": { "burnRate": { "tokensPerMinute": 2841, "costPerHour": 1.23 } }
  },
  "analysis": {
    "recommendation": { "bestTool": "Claude Code", "sessionHeadroomPercent": 58 },
    "estimates": { "session": { "estimatedLimitCost": 42.50 } }
  }
}
```

### Credential Sources (checked in order)

| Priority | Source | Notes |
|---|---|---|
| 1 | macOS Keychain | Where Claude Code stores credentials |
| 2 | `~/.claude/.credentials.json` | File-based fallback |
| 3 | `CLAUDE_CODE_OAUTH_TOKEN` env | Manual override |
| 4 | WSL paths | Windows cross-platform support |

---

## Architecture

```
quotatracker (CLI Core)                    Consumers
┌──────────────────────────────┐     ┌──────────────────┐
│  OAuth Client                │     │  Desktop (Tauri)  │
│  ├─ Token auto-refresh       │     │  React + Recharts │
│  └─ Usage windows            │     └────────┬─────────┘
│                              │              │
│  JSONL Parser                │◄─── JSON ────┤
│  ├─ Cost calculation         │     stdout   │
│  ├─ Session blocks           │              │
│  └─ Model breakdowns        │     ┌────────┴─────────┐
│                              │     │  macOS (SwiftUI)  │
│  Analysis Engine             │     │  Menu bar app     │
│  ├─ Velocity & runway        │     └──────────────────┘
│  ├─ Heatmap (28d)            │
│  ├─ Limit estimates          │
│  └─ Recommendations          │
└──────────────────────────────┘
```

The core CLI outputs a single JSON blob to stdout. Both desktop UIs spawn the binary and parse its output — no network server, no IPC, just Unix pipes.

---

## Development

```bash
# Install dependencies
bun install

# Run CLI directly
bun run start

# Run with pretty output
bun run start -- --pretty

# Build distributable
bun run build

# Type check
bun run typecheck

# Run tests
bun run test
```

### Desktop App (Tauri)

```bash
cd desktop
pnpm install
pnpm tauri dev
```

### macOS App (SwiftUI)

```bash
cd macos/QuotaTracker
swift build
swift run
```

---

## Supported Plans

| Plan | Tier ID | Tracked |
|---|---|---|
| Pro | `default_claude_ai` | Session + Weekly |
| Max 5x | `default_claude_max_5x` | Session + Weekly + Extra Usage |
| Max 20x | `default_claude_max_20x` | Session + Weekly + Extra Usage |

---

## Token Pricing

Costs are calculated using live pricing from [LiteLLM](https://github.com/BerriAI/litellm) with embedded fallbacks:

| Model | Input | Output | Cache Write | Cache Read |
|---|---|---|---|---|
| Claude Sonnet 4 | $3.00/M | $15.00/M | $3.75/M | $0.30/M |
| Claude Opus 4 | $5.00/M | $25.00/M | $6.25/M | $0.50/M |
| Claude Haiku 4.5 | $1.00/M | $5.00/M | $1.25/M | $0.10/M |

---

## Data Storage

QuotaTracker stores analysis state in `~/.claude/.state/`:

| File | Purpose | Retention |
|---|---|---|
| `history.json` | Utilization samples for velocity calculation | 24 hours, 2000 max |
| `heatmap.json` | Hourly peak utilization | 28 days |
| `estimate-snapshots.json` | Limit cost estimate history | 28 days, 2000 max |

All data is derived from your local JSONL logs and the OAuth API. Nothing is sent to external services.

---

## License

MIT
