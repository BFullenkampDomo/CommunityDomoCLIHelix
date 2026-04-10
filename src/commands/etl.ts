import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";
import { resolveJsonInput } from "../lib/json-input.js";

export function registerEtlCommands(program: Command, auth: DomoAuth): void {
  const etl = program.command("etl").description("Magic ETL dataflow operations");

  etl
    .command("list")
    .description("List Magic ETL dataflows")
    .option("--limit <n>", "Max results (default 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .action(async (opts) => {
      const res = await auth.fetch(
        `/api/dataprocessing/v1/dataflows?limit=${opts.limit}&offset=${opts.offset}`
      );
      await output(res);
    });

  etl
    .command("get <dataflowId>")
    .description("Get the full definition of a Magic ETL dataflow")
    .action(async (dataflowId: string) => {
      const res = await auth.fetch(`/api/dataprocessing/v1/dataflows/${dataflowId}`);
      await output(res);
    });

  etl
    .command("create")
    .description("Create a Magic ETL dataflow (databaseType forced to MAGIC)")
    .option("--definition <json>", "Full dataflow JSON definition")
    .option("--definition-file <path>", "Path to dataflow JSON file")
    .action(async (opts) => {
      const body = resolveJsonInput(opts.definition, opts.definitionFile) as Record<string, unknown>;
      if (!body.databaseType) body.databaseType = "MAGIC";

      const res = await auth.fetch("/api/dataprocessing/v1/dataflows", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await output(res);
    });

  etl
    .command("update <dataflowId>")
    .description("Update an existing Magic ETL dataflow (PUT replaces entire definition)")
    .option("--definition <json>", "Full updated dataflow JSON definition")
    .option("--definition-file <path>", "Path to dataflow JSON file")
    .action(async (dataflowId: string, opts) => {
      const body = resolveJsonInput(opts.definition, opts.definitionFile);

      const res = await auth.fetch(`/api/dataprocessing/v1/dataflows/${dataflowId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await output(res);
    });

  etl
    .command("run <dataflowId>")
    .description("Trigger a Magic ETL dataflow execution")
    .action(async (dataflowId: string) => {
      const res = await auth.fetch(
        `/api/dataprocessing/v1/dataflows/${dataflowId}/executions`,
        { method: "POST" }
      );
      await output(res);
    });

  etl
    .command("execution-status <dataflowId> <executionId>")
    .description("Check the status of a Magic ETL execution")
    .action(async (dataflowId: string, executionId: string) => {
      const res = await auth.fetch(
        `/api/dataprocessing/v1/dataflows/${dataflowId}/executions/${executionId}`
      );
      await output(res);
    });
}
