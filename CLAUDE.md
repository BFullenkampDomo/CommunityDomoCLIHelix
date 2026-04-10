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

## Card Creation Body Schema

The `card create` command requires a specific JSON body structure. All fields shown are required unless noted.

```json
{
  "definition": {
    "subscriptions": {
      "big_number": { "name": "big_number", "columns": [/* first VALUE col */], "filters": [] },
      "main": { "name": "main", "columns": [/* column mappings */], "filters": [],
                "orderBy": [], "groupBy": [/* auto from ITEM+SERIES */],
                "fiscal": false, "projection": false, "distinct": false }
    },
    "formulas": { "dsUpdated": [], "dsDeleted": [], "card": [] },
    "annotations": { "new": [], "modified": [], "deleted": [] },
    "conditionalFormats": { "card": [], "datasource": [] },
    "controls": [],
    "segments": { "active": [], "create": [], "update": [], "delete": [] },
    "charts": { "main": { "component": "main", "chartType": "<type>", "overrides": {}, "goal": null } },
    "dynamicTitle": { "text": [{"text": "<title>", "type": "TEXT"}] },
    "chartVersion": "12", "inputTable": false, "noDateRange": false, "title": "<title>"
  },
  "dataProvider": { "dataSourceId": "<DATASET_UUID>" },
  "variables": true,
  "columns": false
}
```

### Column Mappings

For dataset columns: `{"column": "Revenue", "mapping": "VALUE", "aggregation": "SUM"}`
For BeastModes: `{"formulaId": "calculation_abc123", "mapping": "VALUE"}` (use `formulaId` NOT `column`)
Mapping types: `ITEM` (x-axis/category), `VALUE` (y-axis/measure), `SERIES` (color/legend)
Aggregation: `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, `UNIQUE`

**groupBy**: Auto-built from ITEM and SERIES columns: `[{"column": "Name"}, {"column": "Category"}]`. Missing groupBy causes incorrect charts.

### big_number Rules

- For most chart types: populate with the first VALUE column including aggregation, alias, and format
- Format example: `{"type": "abbreviated", "format": "#A"}`
- For `badge_singlevalue` only: use empty columns `[]` (the card itself displays the number)

### Card Creation Gotchas

- **badge_line returns 400** — use `badge_two_trendline` or `badge_area` instead
- **conditionalFormats and segments must be OBJECTS** `{"card":[],"datasource":[]}` — NOT arrays
- **variables must be `true`**, columns must be `false`
- **Use `dataProvider.dataSourceId`** — NOT `dsId`
- **Both subscriptions required** — `big_number` AND `main` must be present
- **CREATE uses `PUT`** with `pageId` query param; UPDATE uses `PUT` with `cardId` in path
- **Override values are all strings** — including booleans and numbers

### Chart Types (Verified Working)

**Bars**: badge_vert_bar, badge_horiz_bar, badge_vert_stackedbar, badge_horiz_stackedbar, badge_vert_100stackedbar, badge_horiz_100stackedbar, badge_vert_grouped, badge_horiz_grouped
**Trends**: badge_two_trendline (NOT badge_line), badge_area, badge_stacked_area, badge_curved_area, badge_spark_line
**Pie/Donut**: badge_pie, badge_donut, badge_nautilus
**Single Value**: badge_singlevalue, badge_gauge, badge_gauge_fill, badge_filled_gauge
**Tables**: badge_table, badge_pivot_table, badge_flex_table, badge_heat_map_table
**Combo**: badge_line_bar (line+bar), badge_symbol_bar
**Scatter/Bubble**: badge_scatter, badge_bubble
**Other**: badge_funnel, badge_treemap, badge_radar, badge_waterfall, badge_stream, badge_word_cloud, badge_waffle
**Multi-Value**: badge_multi_value_cols, badge_pop_multi_value

See `reference/card-creation.md` for all 207 chart types with override schemas.

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

**Chart types**: See Card Creation Body Schema section above for complete verified list. NOTE: badge_line returns 400 — use badge_two_trendline or badge_area instead.

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
