import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { DomoCredentials } from "./types.js";

const DEFAULT_RYUU_DIR = join(
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
  "configstore",
  "ryuu"
);

/**
 * Read a specific instance's credentials from ryuu's configstore.
 */
export function readRyuuCredentials(
  instance: string,
  ryuuDir = DEFAULT_RYUU_DIR
): DomoCredentials | null {
  const filePath = join(ryuuDir, `${instance}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    if (!raw.instance || !raw.refreshToken) return null;
    return {
      instance: raw.instance,
      refreshToken: raw.refreshToken,
      devToken: !!raw.devToken,
    };
  } catch {
    return null;
  }
}

/**
 * List all instances that have stored ryuu credentials.
 */
export function listRyuuInstances(ryuuDir = DEFAULT_RYUU_DIR): string[] {
  if (!existsSync(ryuuDir)) return [];

  return readdirSync(ryuuDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

/**
 * Find the most recently modified ryuu credential file.
 * ryuu writes to the file on each login, so mtime is a good "last used" signal.
 */
export function getMostRecentInstance(
  ryuuDir = DEFAULT_RYUU_DIR
): string | null {
  if (!existsSync(ryuuDir)) return null;

  const files = readdirSync(ryuuDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  let newest: { name: string; mtime: number } | null = null;
  for (const f of files) {
    try {
      const { mtimeMs } = statSync(join(ryuuDir, f));
      if (!newest || mtimeMs > newest.mtime) {
        newest = { name: f.replace(/\.json$/, ""), mtime: mtimeMs };
      }
    } catch {
      continue;
    }
  }
  return newest?.name ?? null;
}
