import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerPdpCommands(program: Command, auth: DomoAuth): void {
  const pdp = program.command("pdp").description("Personalized Data Permissions operations");

  pdp
    .command("list <datasetId>")
    .description("List PDP policies for a dataset")
    .action(async (datasetId: string) => {
      const res = await auth.fetch(`/api/data/v1/datasources/${datasetId}/pdp/policies`);
      await output(res);
    });
}
