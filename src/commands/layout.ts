import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";
import { resolveJsonInput } from "../lib/json-input.js";

export function registerLayoutCommands(program: Command, auth: DomoAuth): void {
  const layout = program.command("layout").description("Page layout operations");

  layout
    .command("stack <viewId>")
    .description("Get full page structure: layout grid, card placements, display settings")
    .action(async (viewId: string) => {
      const res = await auth.fetch(`/api/content/v3/stacks/${viewId}`);
      await output(res);
    });

  layout
    .command("lock <layoutId>")
    .description("Acquire write lock on a page layout (required before any layout update)")
    .action(async (layoutId: string) => {
      const res = await auth.fetch(`/api/content/v4/pages/layouts/${layoutId}/writelock`, {
        method: "PUT",
        body: "{}",
      });
      await output(res);
    });

  layout
    .command("update <layoutId>")
    .description("Update a page layout (must lock first, unlock after)")
    .option("--body <json>", "Full layout object JSON")
    .option("--body-file <path>", "Path to layout JSON file")
    .action(async (layoutId: string, opts) => {
      const body = resolveJsonInput(opts.body, opts.bodyFile);

      const res = await auth.fetch(`/api/content/v4/pages/layouts/${layoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify(body),
      });
      await output(res);
    });

  layout
    .command("unlock <layoutId>")
    .description("Release write lock on a page layout")
    .action(async (layoutId: string) => {
      const res = await auth.fetch(`/api/content/v4/pages/layouts/${layoutId}/writelock`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error(JSON.stringify({ error: true, status: res.status, message: await res.text() }, null, 2));
        process.exit(1);
      }
      console.log(JSON.stringify({ success: true, message: "Lock released successfully." }, null, 2));
    });
}
