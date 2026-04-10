import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerPageCommands(program: Command, auth: DomoAuth): void {
  const page = program.command("page").description("Classic Domo page operations (legacy)");

  page
    .command("list")
    .description("List classic Domo pages (for App Studio apps, use 'app list' instead)")
    .option("--limit <n>", "Max results (default 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .action(async (opts) => {
      const res = await auth.fetch(`/api/content/v2/pages?limit=${opts.limit}&offset=${opts.offset}`);
      await output(res);
    });
}
