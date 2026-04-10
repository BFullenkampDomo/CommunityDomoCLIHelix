import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerCustomAppCommands(program: Command, auth: DomoAuth): void {
  const customApp = program.command("custom-app").description("Custom app platform operations");

  customApp
    .command("list")
    .description("List published custom apps")
    .option("--limit <n>", "Max results (default 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .action(async (opts) => {
      const res = await auth.fetch(`/api/content/v1/custom-apps?limit=${opts.limit}&offset=${opts.offset}`);
      await output(res);
    });
}
