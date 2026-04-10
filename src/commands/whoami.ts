import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerWhoamiCommand(program: Command, auth: DomoAuth): void {
  program
    .command("whoami")
    .description("Get the currently authenticated user's information")
    .action(async () => {
      const res = await auth.fetch("/api/content/v2/users/me");
      await output(res);
    });
}
