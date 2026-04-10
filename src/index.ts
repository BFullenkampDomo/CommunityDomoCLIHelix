#!/usr/bin/env node

import { Command } from "commander";
import { DomoAuth } from "./auth/index.js";
import { registerWhoamiCommand } from "./commands/whoami.js";
import { registerDatasetCommands } from "./commands/dataset.js";
import { registerEtlCommands } from "./commands/etl.js";
import { registerCardCommands } from "./commands/card.js";
import { registerBeastmodeCommands } from "./commands/beastmode.js";
import { registerAppCommands } from "./commands/app.js";
import { registerPageCommands } from "./commands/page.js";
import { registerLayoutCommands } from "./commands/layout.js";
import { registerUserCommands } from "./commands/user.js";
import { registerGroupCommands } from "./commands/group.js";
import { registerPdpCommands } from "./commands/pdp.js";
import { registerCustomAppCommands } from "./commands/custom-app.js";
import { registerAppdbCommands } from "./commands/appdb.js";
import { registerCodeEngineCommands } from "./commands/code-engine.js";

const program = new Command();

program
  .name("domo-helix")
  .version("0.1.0")
  .description("Domo CLI for Claude Code — native-first platform operations")
  .option("--instance <hostname>", "Domo instance hostname (overrides DOMO_INSTANCE)")
  .option("--token <token>", "Developer token (overrides DOMO_TOKEN)");

// Parse global options early so they're available for auth
program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.instance) process.env.DOMO_INSTANCE = opts.instance;
  if (opts.token) process.env.DOMO_TOKEN = opts.token;
});

const auth = new DomoAuth();

// Register all command groups
registerWhoamiCommand(program, auth);
registerDatasetCommands(program, auth);
registerEtlCommands(program, auth);
registerCardCommands(program, auth);
registerBeastmodeCommands(program, auth);
registerAppCommands(program, auth);
registerPageCommands(program, auth);
registerLayoutCommands(program, auth);
registerUserCommands(program, auth);
registerGroupCommands(program, auth);
registerPdpCommands(program, auth);
registerCustomAppCommands(program, auth);
registerAppdbCommands(program, auth);
registerCodeEngineCommands(program, auth);

program.parse();
