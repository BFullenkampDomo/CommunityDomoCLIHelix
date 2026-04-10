/**
 * Raw credentials as stored in ryuu's configstore or provided via env/config.
 */
export interface DomoCredentials {
  instance: string;
  refreshToken: string;
  devToken: boolean;
}

/**
 * The two header formats Domo APIs accept.
 *
 * - sid:      X-Domo-Authentication header value (from refresh token flow)
 * - devToken: X-Domo-Developer-Token header value (from admin console)
 */
export type AuthHeaders =
  | { "X-Domo-Authentication": string }
  | { "X-Domo-Developer-Token": string };

/**
 * Configuration for the auth module.
 */
export interface AuthConfig {
  /** Domo instance hostname, e.g. "company.domo.com" */
  instance?: string;
  /** Developer token — bypasses refresh flow entirely */
  devToken?: string;
  /** Override path to ryuu configstore directory */
  ryuuConfigDir?: string;
}

/**
 * Cached session: SID + expiry so we don't re-exchange on every call.
 */
export interface CachedSession {
  sid: string;
  expiresAt: number;
}
