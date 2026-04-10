import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerBeastmodeCommands(program: Command, auth: DomoAuth): void {
  const beastmode = program.command("beastmode").description("BeastMode calculated field operations");

  beastmode
    .command("validate")
    .description("Validate a BeastMode formula before creating it")
    .requiredOption("--expression <expr>", "The BeastMode expression (e.g. SUM(`Revenue`))")
    .requiredOption("--name <name>", "Display name for the calculated field")
    .requiredOption("--datasource-id <id>", "The dataset UUID to validate against")
    .action(async (opts) => {
      // Fetch dataset schema
      const schemaRes = await auth.fetch(`/api/data/v3/datasources/${opts.datasourceId}/schema`);
      if (!schemaRes.ok) {
        console.error(JSON.stringify({ error: true, status: schemaRes.status, message: `Error fetching schema: ${await schemaRes.text()}` }, null, 2));
        process.exit(1);
      }
      const schemaData = (await schemaRes.json()) as { schemaContract?: { schema?: { columns?: Array<{ name: string; type: string }> } } };
      const rawColumns = schemaData.schemaContract?.schema?.columns ?? [];

      const typeMap: Record<string, string> = {
        STRING: "string", LONG: "numeric", DOUBLE: "numeric", DECIMAL: "numeric",
        DATE: "date", DATETIME: "datetime",
      };

      const columns = rawColumns.map((col) => ({
        id: col.name, name: col.name,
        type: typeMap[col.type] ?? col.type?.toLowerCase() ?? "string",
        isCalculation: false, isAggregatable: true, isEncrypted: false,
        hidden: false, order: 0, sourceId: opts.datasourceId, isControlled: false, label: col.name,
      }));

      const meRes = await auth.fetch("/api/content/v2/users/me");
      const me = (await meRes.json()) as { id?: number; userId?: number; displayName?: string };

      const res = await auth.fetch("/api/query/v1/functions/validateFormulas", {
        method: "POST",
        body: JSON.stringify({
          dataSourceId: opts.datasourceId,
          columns,
          formulas: {
            validate_target: {
              id: "validate_target", name: opts.name, formula: opts.expression,
              status: "valid", dataType: "STRING", persistedOnDataSource: false,
              isAggregatable: true, bignumber: false,
              owner: { id: String(me.id ?? me.userId), name: me.displayName ?? "", type: "USER", group: false },
              nonAggregatedColumns: [], legacyId: 0, variable: false,
              referenceCount: 0, usedByOtherCards: false, formulaDependencies: [],
            },
          },
        }),
      });
      await output(res);
    });

  beastmode
    .command("create")
    .description("Create a BeastMode calculated field on a dataset")
    .requiredOption("--expression <expr>", "The BeastMode expression (use backticks around column names)")
    .requiredOption("--name <name>", "Display name for the calculated field")
    .requiredOption("--datasource-id <id>", "The dataset UUID")
    .option("--data-type <type>", "Result data type: LONG, DOUBLE, DECIMAL, STRING, DATE, DATETIME", "DOUBLE")
    .action(async (opts) => {
      const meRes = await auth.fetch("/api/content/v2/users/me");
      const me = (await meRes.json()) as { id?: number; userId?: number };

      const res = await auth.fetch("/api/query/v1/functions/template?strict=false", {
        method: "POST",
        body: JSON.stringify({
          expression: opts.expression,
          id: 0,
          name: opts.name,
          owner: Number(me.id ?? me.userId),
          status: "VALID",
          persistedOnDataSource: true,
          locked: false,
          dataType: opts.dataType,
          containsAggregation: opts.expression.match(/SUM|AVG|COUNT|MIN|MAX|MEDIAN/i) !== null,
          links: [{ resource: { id: opts.datasourceId, type: "DATA_SOURCE" }, visible: true }],
        }),
      });
      await output(res);
    });
}
