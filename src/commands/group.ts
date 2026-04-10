import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerGroupCommands(program: Command, auth: DomoAuth): void {
  const group = program.command("group").description("Group operations");

  group
    .command("list")
    .description("List groups in the Domo instance")
    .option("--limit <n>", "Max results (default 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .action(async (opts) => {
      const res = await auth.fetch(`/api/content/v2/groups?limit=${opts.limit}&offset=${opts.offset}&includeDeleted=false`);
      await output(res);
    });
}
