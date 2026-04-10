import type { Command } from "commander";
import type { DomoAuth } from "../auth/index.js";
import { output } from "../lib/output.js";

export function registerCodeEngineCommands(program: Command, auth: DomoAuth): void {
  const codeEngine = program.command("code-engine").description("Code Engine operations");

  codeEngine
    .command("run <packageAlias> <functionName>")
    .description("Invoke a Code Engine function")
    .option("--params <json>", "JSON parameters to pass to the function", "{}")
    .action(async (packageAlias: string, functionName: string, opts) => {
      const parsedParams = JSON.parse(opts.params);
      const res = await auth.fetch(
        `/api/codeengine/v2/packages/${packageAlias}/functions/${functionName}`,
        { method: "POST", body: JSON.stringify(parsedParams) }
      );
      await output(res);
    });
}
