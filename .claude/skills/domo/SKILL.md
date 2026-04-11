---
name: domo-helix
description: Domo BI platform operations — datasets, ETL pipelines, cards, App Studio dashboards, BeastModes, and admin via CLI
tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# Domo CLI Skill (domo-helix)

This skill provides full control of the Domo BI platform through the `domo-helix` CLI.
All commands output JSON to stdout. Errors go to stderr with exit code 1.

## Quick Start

```bash
domo-helix whoami              # Verify authentication
domo-helix dataset list        # List datasets
domo-helix search "revenue"   # Search across entities
```

## When to Use This Skill

- Building analytics dashboards in Domo App Studio
- Creating and managing datasets, ETL pipelines, and cards
- Querying Domo data via SQL
- Managing BeastMode calculated fields
- Administering users, groups, and PDP policies

## Key Workflow

1. **Explore** — `dataset list` / `dataset query` / `search`
2. **Transform** — `etl create` / `etl run` / `etl execution-status`
3. **Calculate** — `beastmode validate` / `beastmode create`
4. **Build** — `app create` / `app add-view` / `card create`
5. **Layout** — `layout stack` / `layout lock` / `layout update` / `layout unlock`
6. **Polish** — `app update` / `app navigation-update`

## Important

- See AGENTS.md for the full command reference, gotchas, and card creation schema.
- See `reference/` for detailed API schemas (card-creation.md, magic-etl.md, app-studio.md).
- Always prefer native cards (207 chart types) before considering custom apps.
- GET before PUT — PUT replaces entire definitions.
