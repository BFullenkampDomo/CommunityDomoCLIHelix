# Helix CLI — Domo CLI for Claude Code

A native-first CLI that gives AI agents full control of the [Domo](https://www.domo.com) BI platform. Build analytics experiences end-to-end — from raw data to polished App Studio dashboards — using shell commands instead of MCP tools.

**Why CLI instead of MCP?** MCP loads every tool schema into the LLM context window on every message. With 30+ tools, that's ~6,000-12,000 tokens per turn. The CLI approach replaces all of that with a single CLAUDE.md file (~2,000 tokens, cached once), achieving a **3-6x reduction in per-message context cost**. Claude Code invokes CLI commands via the Bash tool — no protocol overhead, no schema bloat.

Built as a companion to [CommunityDomoMCPHelix](https://github.com/BFullenkampDomo/CommunityDomoMCPHelix) for performance comparison.

---

## Quick Start

**From source:**

```bash
git clone https://github.com/BFullenkampDomo/CommunityDomoCLIHelix.git
cd CommunityDomoCLIHelix
npm install && npm run build
npm link   # makes 'domo-helix' available globally
```

**Prerequisites:**
- Node.js 18+
- An active `domo login` session (via the [Domo CLI](https://www.npmjs.com/package/ryuu)) **or** `DOMO_INSTANCE` + `DOMO_TOKEN` environment variables

**Verify:**

```bash
domo-helix whoami
```

---

## Authentication

Helix CLI resolves credentials automatically in this order:

| Priority | Source | How |
|----------|--------|-----|
| 1 | CLI flags | `--instance` + `--token` on any command |
| 2 | Environment | `DOMO_INSTANCE` + `DOMO_TOKEN` env vars |
| 3 | Ryuu CLI | Reads `~/.config/configstore/ryuu/{instance}.json` from your last `domo login` |
| 4 | Auto-detect | Picks the most recently used instance if multiple logins exist |

**Session caching:** SIDs are cached to `~/.cache/domo-cli/session.json` with a 55-minute TTL. Unlike the MCP server (which caches in memory for the process lifetime), the CLI persists sessions to disk so repeated invocations don't re-authenticate.

---

## Philosophy: Native First

Domo has two ways to build analytics:

| | Native (preferred) | Custom Apps (supplement) |
|---|---|---|
| **What** | Cards, BeastModes, App Studio pages | React/JS apps in iframes |
| **When** | Bar charts, KPIs, tables, trend lines — anything Domo's 207 chart types can handle | Complex interactivity, custom UI, data entry forms |
| **Command** | `domo-helix card create`, `domo-helix app create` | `domo-helix custom-app list` |

All command descriptions and CLAUDE.md encode this preference. An AI agent using this CLI will always reach for native Domo capabilities first.

---

## Commands (36)

### Data Layer

| Command | Description |
|---------|-------------|
| `domo-helix dataset list` | Search datasets by name (--name-contains filter) |
| `domo-helix dataset get <id>` | Full metadata — schema, row count, owner |
| `domo-helix dataset schema <id>` | Column names, types, and AI metadata |
| `domo-helix dataset query <id> <sql>` | Run SQL against any dataset (`FROM table`) |
| `domo-helix dataset create` | Create an empty dataset with a defined schema |
| `domo-helix dataset upload <id>` | Upload CSV data (handles stream API flow) |
| `domo-helix dataset create-with-data` | Create + populate in one operation |
| `domo-helix search <query>` | Cross-entity keyword search |

### Magic ETL

| Command | Description |
|---------|-------------|
| `domo-helix etl list` | List all dataflows |
| `domo-helix etl get <id>` | Full dataflow definition (actions, DAG) |
| `domo-helix etl create` | Create a dataflow with full DAG definition |
| `domo-helix etl update <id>` | Update a dataflow (PUT replaces entire definition) |
| `domo-helix etl run <id>` | Trigger execution |
| `domo-helix etl execution-status <id> <execId>` | Poll execution state |

### Analytics — Cards & BeastModes

| Command | Description |
|---------|-------------|
| `domo-helix card list <pageId>` | List all cards on a page/view |
| `domo-helix card get-details <id>` | Column definitions, dataset binding |
| `domo-helix card get-data <id>` | Rendered data with chart role mappings |
| `domo-helix card create <pageId>` | Create a native card on a page |
| `domo-helix card update <id>` | Update a card definition (full replacement) |
| `domo-helix beastmode validate` | Pre-flight formula validation |
| `domo-helix beastmode create` | Create a persisted calculated field |

### Analytics — App Studio

| Command | Description |
|---------|-------------|
| `domo-helix app list` | List all App Studio apps |
| `domo-helix app create` | Create a new app with default landing view |
| `domo-helix app get <id>` | Full app structure (views, navigation, theme) |
| `domo-helix app update <id>` | Update app config (full replacement) |
| `domo-helix app add-view <id>` | Add a page/view to an app |
| `domo-helix app navigation-update <id>` | Reorder, rename, set icons for nav |
| `domo-helix layout stack <viewId>` | Full page structure with layout grid |
| `domo-helix layout lock <layoutId>` | Acquire write lock (required before edits) |
| `domo-helix layout update <layoutId>` | Position cards on canvas grid |
| `domo-helix layout unlock <layoutId>` | Release write lock |
| `domo-helix page list` | List classic pages (legacy) |

### Administration

| Command | Description |
|---------|-------------|
| `domo-helix user list` | List users |
| `domo-helix user get <id>` | User details |
| `domo-helix group list` | List groups |
| `domo-helix pdp list <datasetId>` | PDP policies for a dataset |
| `domo-helix whoami` | Current authenticated user |

### Custom App Platform

| Command | Description |
|---------|-------------|
| `domo-helix custom-app list` | List published custom apps |
| `domo-helix appdb query <collection>` | Query an AppDB collection |
| `domo-helix code-engine run <pkg> <fn>` | Invoke a Code Engine function |

---

## MCP vs CLI Comparison

| | MCP (CommunityDomoMCPHelix) | CLI (CommunityDomoCLIHelix) |
|---|---|---|
| **Context cost** | ~6-12K tokens/message (all tool schemas) | ~2K tokens once (CLAUDE.md cached) |
| **Invocation** | MCP tool call (JSON-RPC) | Bash command |
| **Process model** | Long-running server (stdio) | One process per command |
| **Session caching** | In-memory (lost on restart) | File-based (~/.cache/domo-cli/) |
| **Dependencies** | @modelcontextprotocol/sdk (~49MB node_modules) | commander (~80KB) |
| **Discovery** | Auto (tool schemas in context) | CLAUDE.md + `--help` |
| **Protocol overhead** | JSON-RPC framing | None |

---

## End-to-End Workflow

```
1. Explore       domo-helix dataset list → domo-helix dataset query
2. Transform     domo-helix etl create → domo-helix etl run
3. BeastModes    domo-helix beastmode validate → domo-helix beastmode create
4. App Studio    domo-helix app create → domo-helix app add-view
5. Cards         domo-helix card create (repeat per card)
6. Layout        domo-helix layout stack → lock → update → unlock
7. Polish        domo-helix app update → domo-helix app navigation-update
```

---

## Architecture

```
Claude Code
     |
  Bash tool (shell commands)
     |
  domo-helix CLI (Node.js / TypeScript / Commander.js)
     |
  +--+----+
  |       |
Auth    Commands
  |       |
  |  +----+--------+-----------+-----------+
  |  | Data        | Analytics |  Admin    | Custom App
  |  | datasets    | cards     | users     | appdb
  |  | etl         | beastmode | groups    | code engine
  |  | search      | app studio| pdp       |
  |  |             | layout    |           |
  |  +----+--------+-----------+-----------+
  |       |
  +--+----+
     |
  Domo REST APIs
  (X-Domo-Authentication: {SID})
```

**Auth resolution:** CLI flags → env vars → ryuu configstore → auto-detect most recent.
**SID caching:** File-based, 55-minute TTL, auto-refresh, multi-instance support.

---

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm start            # Run directly (same as node dist/index.js)
```

### Project Structure

```
src/
  index.ts                  CLI entry point (Commander.js program)
  auth/
    domo-auth.ts            Unified auth class (resolve, cache, fetch)
    ryuu-store.ts           Read ryuu CLI credentials
    token-exchange.ts       Refresh token → access token → SID
    types.ts                Type definitions
  commands/
    dataset.ts              Dataset CRUD, upload, search
    etl.ts                  Magic ETL dataflows
    card.ts                 Native card operations
    beastmode.ts            Calculated fields
    app.ts                  App Studio apps
    page.ts                 Classic pages (legacy)
    layout.ts               Page layout grid
    user.ts                 User management
    group.ts                Group management
    pdp.ts                  Data permissions
    custom-app.ts           Custom app platform
    appdb.ts                AppDB queries
    code-engine.ts          Code Engine functions
    whoami.ts               Auth verification
  lib/
    output.ts               JSON output formatting
    json-input.ts           JSON/CSV input resolution
    session-cache.ts        File-based SID caching
```

---

## Related Projects

- [CommunityDomoMCPHelix](https://github.com/BFullenkampDomo/CommunityDomoMCPHelix) — The MCP server version (for comparison)
- [domo-ai-vibe-rules](https://github.com/stahura/domo-ai-vibe-rules) — Community AI skills and rules for Domo
- [Ryuu CLI](https://www.npmjs.com/package/ryuu) — Official Domo developer CLI (`domo login`, `domo publish`)

---

## License

MIT
