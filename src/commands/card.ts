import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";
import { resolveJsonInput } from "../lib/json-input.js";

export function registerCardCommands(program: Command, auth: DomoAuth): void {
  const card = program.command("card").description("Native card operations");

  card
    .command("list <pageId>")
    .description("List all cards on a page (works for App Studio views and classic pages)")
    .action(async (pageId: string) => {
      const res = await auth.fetch(`/api/content/v1/pages/${pageId}/cards`);
      await output(res);
    });

  card
    .command("get-details <cardId>")
    .description("Get a card's column definitions, dataset binding, and BeastMode references")
    .action(async (cardId: string) => {
      const res = await auth.fetch(`/api/content/v1/cards/${cardId}/details`);
      await output(res);
    });

  card
    .command("get-data <cardId>")
    .description("Get a card's rendered data with chart role mappings and row data")
    .action(async (cardId: string) => {
      const res = await auth.fetch(`/api/content/v1/cards/${cardId}/data`);
      await output(res);
    });

  card
    .command("create <pageId>")
    .description("Create a native Domo card on a page (use viewId as pageId for App Studio)")
    .option("--body <json>", "Full card body JSON")
    .option("--body-file <path>", "Path to card body JSON file")
    .action(async (pageId: string, opts) => {
      const body = resolveJsonInput(opts.body, opts.bodyFile);

      const res = await auth.fetch(`/api/content/v3/cards/kpi?pageId=${pageId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await output(res);
    });

  card
    .command("update <cardId>")
    .description("Update an existing card's definition (full replacement — GET first)")
    .option("--body <json>", "Full updated card body JSON")
    .option("--body-file <path>", "Path to card body JSON file")
    .action(async (cardId: string, opts) => {
      const body = resolveJsonInput(opts.body, opts.bodyFile);

      const res = await auth.fetch(`/api/content/v3/cards/kpi/${cardId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await output(res);
    });
}
