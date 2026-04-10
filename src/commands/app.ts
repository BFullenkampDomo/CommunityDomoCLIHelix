import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";
import { resolveJsonInput } from "../lib/json-input.js";

export function registerAppCommands(program: Command, auth: DomoAuth): void {
  const app = program.command("app").description("App Studio operations");

  app
    .command("list")
    .description("List App Studio apps in the Domo instance")
    .option("--limit <n>", "Max results (default 50)", "50")
    .action(async (opts) => {
      const res = await auth.fetch(`/api/content/v1/dataapps?limit=${opts.limit}`);
      await output(res);
    });

  app
    .command("create")
    .description("Create a new App Studio app (returns dataAppId and landingViewId)")
    .requiredOption("--title <title>", "App title")
    .option("--description <text>", "App description", "")
    .action(async (opts) => {
      const res = await auth.fetch("/api/content/v1/dataapps", {
        method: "POST",
        body: JSON.stringify({ title: opts.title, description: opts.description }),
      });
      await output(res);
    });

  app
    .command("get <dataAppId>")
    .description("Get the full structure of an App Studio app")
    .action(async (dataAppId: string) => {
      const res = await auth.fetch(`/api/content/v1/dataapps/${dataAppId}?includeHiddenViews=true`);
      await output(res);
    });

  app
    .command("update <dataAppId>")
    .description("Update an App Studio app (full replacement — GET first, partial updates cause 400)")
    .option("--body <json>", "Full app object JSON")
    .option("--body-file <path>", "Path to app JSON file")
    .action(async (dataAppId: string, opts) => {
      const body = resolveJsonInput(opts.body, opts.bodyFile);

      const res = await auth.fetch(`/api/content/v1/dataapps/${dataAppId}?includeHiddenViews=true`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await output(res);
    });

  app
    .command("add-view <dataAppId>")
    .description("Add a new view (page) to an App Studio app")
    .requiredOption("--title <title>", "View/page title")
    .action(async (dataAppId: string, opts) => {
      const meRes = await auth.fetch("/api/content/v2/users/me");
      const me = (await meRes.json()) as { id?: number; userId?: number };
      const userId = me.id ?? me.userId;

      const res = await auth.fetch(`/api/content/v1/dataapps/${dataAppId}/views`, {
        method: "POST",
        body: JSON.stringify({
          owners: [{ id: userId, type: "USER", displayName: null }],
          type: "dataappview",
          title: opts.title,
          pageName: opts.title,
          locked: false,
          mobileEnabled: true,
          sharedViewPage: true,
          virtualPage: false,
        }),
      });
      await output(res);
    });

  app
    .command("navigation-update <dataAppId>")
    .description("Update App Studio app navigation (must send FULL array — GET first)")
    .option("--navigation <json>", "Full navigation array JSON")
    .option("--navigation-file <path>", "Path to navigation JSON file")
    .action(async (dataAppId: string, opts) => {
      const body = resolveJsonInput(opts.navigation, opts.navigationFile);

      const res = await auth.fetch(`/api/content/v1/dataapps/${dataAppId}/navigation/reorder`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await output(res);
    });
}
