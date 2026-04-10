import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerUserCommands(program: Command, auth: DomoAuth): void {
  const user = program.command("user").description("User operations");

  user
    .command("list")
    .description("List users in the Domo instance")
    .option("--limit <n>", "Max results (default 50)", "50")
    .option("--offset <n>", "Pagination offset", "0")
    .action(async (opts) => {
      const res = await auth.fetch(`/api/content/v2/users?limit=${opts.limit}&offset=${opts.offset}`);
      await output(res);
    });

  user
    .command("get <userId>")
    .description("Get details for a specific user")
    .action(async (userId: string) => {
      const res = await auth.fetch(`/api/content/v2/users/${userId}`);
      await output(res);
    });
}
