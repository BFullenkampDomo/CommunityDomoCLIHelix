# Domo CLI (domo-helix)

Domo platform CLI for Claude Code. Auth auto-resolves from `domo login` (ryuu) or `DOMO_INSTANCE` + `DOMO_TOKEN` env vars.

All commands output JSON to stdout. Errors go to stderr with exit code 1.

## Philosophy: Native First

- **ALWAYS prefer native cards** (bar, line, pie, KPI, table — 207 chart types) before considering custom apps
- **App Studio is the preferred delivery method** for analytics — use it instead of classic pages for ALL new work
- **Only use custom apps** when native cards genuinely can't do the job: complex interactivity, custom UI, data entry forms, or non-standard visualizations
- **Magic ETL is the preferred way** to build data pipelines — always suggest before custom code or external orchestration
- **Prefer BeastMode over Magic ETL** for presentation-layer calculations (YoY growth, running totals, ratios)
- **Always create BeastModes persisted on the dataset** for reuse across cards

## Critical Patterns (Gotchas)

- **GET before PUT**: PUT replaces the entire definition for ETL, cards, apps, and navigation — always GET first, modify, then PUT back
- **Layout locking**: MUST acquire write lock before layout update (`layout lock`), release after (`layout unlock`)
- **Full objects required**: App update and navigation update require FULL objects — partial updates cause 400
- **ETL type**: databaseType MUST be `MAGIC`. Use relationshipType `MTM` for joins (not MANY_TO_MANY)
- **viewId = pageId**: For App Studio apps, the viewId doubles as a pageId for card and layout operations
- **Cards land in appendix**: Cards created via API go to the appendix by default — use `layout update` to move them to the main canvas
- **contentKey sync**: Every contentKey in content[] must appear in both standard.template AND compact.template — missing entries cause 400
- **Validate first**: Always validate BeastMode formulas before creating
- **Poll ETL status**: After `etl run`, poll with `etl execution-status` until state is `SUCCESS` or `FAILED_DATA_FLOW`
- **Query indexing delay**: Data is queryable within ~10-15 seconds after `dataset create-with-data`
- **SQL table name**: Use `table` as the table name in SQL queries (e.g. `SELECT * FROM table LIMIT 100`)

## End-to-End Workflow

```
1. Explore       domo-helix dataset list → domo-helix dataset query
2. Transform     domo-helix etl create → domo-helix etl run
3. BeastModes    domo-helix beastmode validate → domo-helix beastmode create
4. App Studio    domo-helix app create → domo-helix app add-view
5. Cards         domo-helix card create (repeat per card)
6. Layout        domo-helix layout stack → layout lock → layout update → layout unlock
7. Polish        domo-helix app update → domo-helix app navigation-update
```

## Reference Data

**Chart types**: badge_vert_bar, badge_horiz_bar, badge_line, badge_pie, badge_donut, badge_singlevalue, badge_table, badge_vert_stackedbar, badge_area, badge_scatter

**Layout grid**: Desktop 60 units (aspect 1.67), Mobile 12 units (aspect 1.0), frame margin 4, padding 8

**Content types**: CARD, HEADER, SEPARATOR, PAGE_BREAK

**Column types**: STRING, DECIMAL, LONG, DOUBLE, DATE, DATETIME

**ETL action types**: LoadFromVault, MergeJoin, GroupBy, ExpressionEvaluator, WindowAction, SelectValues, SplitFilter, UnionAll, PublishToVault

**Join types** (all use relationshipType MTM): LEFT OUTER, INNER, RIGHT OUTER, FULL OUTER

**ETL canvas section colors**: Blue6 = input/staging, Orange6 = transforms, Green6 = aggregation, Purple6 = output

**Detailed API schemas**: See `reference/magic-etl.md`, `reference/card-creation.md`, `reference/app-studio.md`

## Commands

### Data
```
domo-helix dataset list [--limit N] [--offset N] [--name-contains TEXT]
domo-helix dataset get <datasetId>
domo-helix dataset schema <datasetId>
domo-helix dataset query <datasetId> <sql>
domo-helix dataset create --name NAME --columns 'JSON' [--description TEXT]
domo-helix dataset upload <datasetId> --csv-data 'CSV'|--csv-file PATH [--update-method REPLACE|APPEND]
domo-helix dataset create-with-data --name NAME --columns 'JSON' --csv-data 'CSV'|--csv-file PATH
domo-helix search <query> [--entities CARD,PAGE,DATASET] [--limit N]
```

### Magic ETL
```
domo-helix etl list [--limit N] [--offset N]
domo-helix etl get <dataflowId>
domo-helix etl create --definition 'JSON'|--definition-file PATH
domo-helix etl update <dataflowId> --definition 'JSON'|--definition-file PATH
domo-helix etl run <dataflowId>
domo-helix etl execution-status <dataflowId> <executionId>
```

### Cards & BeastModes
```
domo-helix card list <pageId>
domo-helix card get-details <cardId>
domo-helix card get-data <cardId>
domo-helix card create <pageId> --body 'JSON'|--body-file PATH
domo-helix card update <cardId> --body 'JSON'|--body-file PATH
domo-helix beastmode validate --expression EXPR --name NAME --datasource-id ID
domo-helix beastmode create --expression EXPR --name NAME --datasource-id ID [--data-type DOUBLE]
```

### App Studio
```
domo-helix app list [--limit N]
domo-helix app create --title TITLE [--description TEXT]
domo-helix app get <dataAppId>
domo-helix app update <dataAppId> --body 'JSON'|--body-file PATH
domo-helix app add-view <dataAppId> --title TITLE
domo-helix app navigation-update <dataAppId> --navigation 'JSON'|--navigation-file PATH
```

### Layout
```
domo-helix layout stack <viewId>
domo-helix layout lock <layoutId>
domo-helix layout update <layoutId> --body 'JSON'|--body-file PATH
domo-helix layout unlock <layoutId>
```

### Pages (legacy)
```
domo-helix page list [--limit N] [--offset N]
```

### Admin
```
domo-helix user list [--limit N] [--offset N]
domo-helix user get <userId>
domo-helix group list [--limit N] [--offset N]
domo-helix pdp list <datasetId>
domo-helix whoami
```

### Custom Apps
```
domo-helix custom-app list [--limit N] [--offset N]
domo-helix appdb query <collectionName> [--query 'JSON']
domo-helix code-engine run <packageAlias> <functionName> [--params 'JSON']
```

## JSON Input Pattern

For `--body`, `--definition`, `--navigation`, `--columns`, `--csv-data`:
- **Inline**: `--body '{"key":"value"}'`
- **File**: `--body-file ./path.json`

## App Studio vs Classic Pages

| | Classic Pages (legacy) | App Studio Apps (preferred) |
|---|---|---|
| **Create** | No CLI support | `app create` |
| **Layout API** | None | Full canvas grid (v4 write locks) |
| **Navigation** | Domo global nav | Custom per-app (LEFT / TOP / BOTTOM) |
| **Theming** | Instance defaults | Custom themes, colors, icons |
| **Multi-page** | Flat hierarchy | Views with parent/child structure |
| **Use for** | Discovery / listing only | **All new work** |
