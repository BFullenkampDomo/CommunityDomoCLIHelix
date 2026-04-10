import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { CachedSession } from "../auth/types.js";

const CACHE_DIR = join(homedir(), ".cache", "domo-cli");
const CACHE_FILE = join(CACHE_DIR, "session.json");

interface SessionStore {
  [instance: string]: CachedSession;
}

/**
 * Load a cached SID for a given instance if it exists and hasn't expired.
 */
export function loadCachedSession(instance: string): CachedSession | null {
  if (!existsSync(CACHE_FILE)) return null;

  try {
    const store: SessionStore = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    const entry = store[instance];
    if (entry && Date.now() < entry.expiresAt) {
      return entry;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save a session to the file-based cache, keyed by instance.
 */
export function saveCachedSession(instance: string, session: CachedSession): void {
  let store: SessionStore = {};

  if (existsSync(CACHE_FILE)) {
    try {
      store = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    } catch {
      store = {};
    }
  }

  // Prune expired entries while we're here
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (store[key].expiresAt <= now) {
      delete store[key];
    }
  }

  store[instance] = session;

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf-8");
}
