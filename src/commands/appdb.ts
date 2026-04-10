import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerAppdbCommands(program: Command, auth: DomoAuth): void {
  const appdb = program.command("appdb").description("AppDB document database operations");

  appdb
    .command("query <collectionName>")
    .description("Query an AppDB collection")
    .option("--query <json>", "JSON query filter (e.g. '{\"status\":\"active\"}')", "{}")
    .action(async (collectionName: string, opts) => {
      const parsedQuery = JSON.parse(opts.query);
      const res = await auth.fetch(
        `/api/datastores/v1/collections/${collectionName}/documents/query`,
        { method: "POST", body: JSON.stringify(parsedQuery) }
      );
      await output(res);
    });
}
