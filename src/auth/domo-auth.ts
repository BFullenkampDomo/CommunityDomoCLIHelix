import type { AuthConfig, AuthHeaders, CachedSession, DomoCredentials } from "./types.js";
import { readRyuuCredentials, getMostRecentInstance, listRyuuInstances } from "./ryuu-store.js";
import { exchangeRefreshForSID } from "./token-exchange.js";
import { loadCachedSession, saveCachedSession } from "../lib/session-cache.js";

/**
 * Unified Domo authentication.
 *
 * Resolution order:
 *   1. Explicit config (instance + devToken passed directly)
 *   2. Environment variable DOMO_TOKEN + DOMO_INSTANCE
 *   3. ryuu configstore (piggyback on `domo login`)
 *
 * For the refresh token path, SIDs are cached to disk and auto-refreshed.
 */
export class DomoAuth {
  private config: AuthConfig;
  private sessionCache: CachedSession | null = null;
  private resolvedInstance: string | null = null;
  private resolvedCredentials: DomoCredentials | null = null;

  constructor(config: AuthConfig = {}) {
    this.config = config;
  }

  /**
   * Get the authenticated instance hostname.
   */
  async getInstance(): Promise<string> {
    if (this.resolvedInstance) return this.resolvedInstance;
    await this.resolve();
    return this.resolvedInstance!;
  }

  /**
   * Get auth headers for a Domo API request.
   * Handles caching, refresh, and dev token vs SID paths.
   */
  async getHeaders(): Promise<AuthHeaders> {
    await this.resolve();

    // Dev token path: no exchange, use directly
    if (this.config.devToken) {
      return { "X-Domo-Developer-Token": this.config.devToken };
    }

    if (this.resolvedCredentials?.devToken) {
      // ryuu stores all token strings in refreshToken; devToken is a boolean flag
      return { "X-Domo-Developer-Token": this.resolvedCredentials.refreshToken };
    }

    // Refresh token path: check in-memory cache first
    if (this.sessionCache && Date.now() < this.sessionCache.expiresAt) {
      return { "X-Domo-Authentication": this.sessionCache.sid };
    }

    // Check file-based cache
    const instance = this.resolvedInstance!;
    const fileCached = loadCachedSession(instance);
    if (fileCached) {
      this.sessionCache = fileCached;
      return { "X-Domo-Authentication": fileCached.sid };
    }

    // Exchange refresh token for SID
    const creds = this.resolvedCredentials!;
    this.sessionCache = await exchangeRefreshForSID(
      creds.instance,
      creds.refreshToken
    );

    // Persist to disk for subsequent CLI invocations
    saveCachedSession(instance, this.sessionCache);

    return { "X-Domo-Authentication": this.sessionCache.sid };
  }

  /**
   * Make an authenticated fetch request to a Domo instance API.
   */
  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const instance = await this.getInstance();
    const headers = await this.getHeaders();
    const url = path.startsWith("http")
      ? path
      : `https://${instance}${path.startsWith("/") ? "" : "/"}${path}`;

    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }

  /**
   * List all available Domo instances from ryuu configstore.
   */
  listInstances(): string[] {
    return listRyuuInstances(this.config.ryuuConfigDir);
  }

  /**
   * Resolve credentials from config, env, or ryuu store.
   * Called lazily on first getHeaders() / getInstance().
   */
  private async resolve(): Promise<void> {
    if (this.resolvedInstance) return;

    // 1. Explicit dev token in config
    if (this.config.devToken && this.config.instance) {
      this.resolvedInstance = this.config.instance;
      return;
    }

    // 2. Environment variables
    const envToken = process.env.DOMO_TOKEN;
    const envInstance = process.env.DOMO_INSTANCE;
    if (envToken && envInstance) {
      this.config.devToken = envToken;
      this.resolvedInstance = envInstance;
      return;
    }

    // 3. ryuu configstore
    const instance =
      this.config.instance ??
      envInstance ??
      getMostRecentInstance(this.config.ryuuConfigDir);

    if (!instance) {
      const available = this.listInstances();
      if (available.length > 0) {
        throw new Error(
          `No instance specified. Available instances from 'domo login': ${available.join(", ")}. ` +
            `Set DOMO_INSTANCE or pass instance in config.`
        );
      }
      throw new Error(
        "No Domo credentials found. Run 'domo login' first, or set DOMO_INSTANCE and DOMO_TOKEN environment variables."
      );
    }

    const creds = readRyuuCredentials(instance, this.config.ryuuConfigDir);
    if (!creds) {
      throw new Error(
        `No credentials found for instance '${instance}'. Run 'domo login -i ${instance}' to authenticate.`
      );
    }

    this.resolvedInstance = creds.instance;
    this.resolvedCredentials = creds;
  }
}
