# Domo CLI — Claude Code Notes

All tool reference, commands, gotchas, and schemas are in [AGENTS.md](./AGENTS.md).
Claude Code reads both this file and AGENTS.md automatically.

## Claude-Specific Notes

- Use the Bash tool to invoke `domo-helix` commands. All output is JSON to stdout.
- Detailed API schemas are in the `reference/` directory: `reference/card-creation.md`, `reference/magic-etl.md`, `reference/app-studio.md`.
- When creating cards, read the Card Creation Body Schema section in AGENTS.md first — the JSON structure has many required fields that cause 400 errors if missing.
- For App Studio layout operations, always acquire a write lock first (`domo-helix layout lock`) and release after (`domo-helix layout unlock`).
- GET before PUT — PUT replaces entire definitions for ETL, cards, apps, and navigation.
