import type { CachedSession } from "./types.js";

const OAUTH_CLIENT_ID = "domo:internal:devstudio";

/** SID cache: valid for 55 minutes (tokens last ~60, buffer 5). */
const SID_TTL_MS = 55 * 60 * 1000;

/**
 * Exchange a refresh token for an access token.
 *
 * POST /api/oauth2/token
 * Content-Type: application/x-www-form-urlencoded
 *
 * client_id=domo:internal:devstudio
 * grant_type=refresh_token
 * refresh_token={refreshToken}
 */
async function getAccessToken(
  instance: string,
  refreshToken: string
): Promise<string> {
  const url = `https://${instance}/api/oauth2/token`;
  const body = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to exchange refresh token (${res.status}): ${text}. ` +
        `Try running 'domo login' to re-authenticate.`
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Exchange an access token for a session ID.
 *
 * GET /api/oauth2/sid
 * Authorization: Bearer {accessToken}
 */
async function getSID(
  instance: string,
  accessToken: string
): Promise<string> {
  const url = `https://${instance}/api/oauth2/sid`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to get SID (${res.status}): ${text}. ` +
        `Try running 'domo login' to re-authenticate.`
    );
  }

  const data = (await res.json()) as { sid: string };
  return data.sid;
}

/**
 * Full exchange: refresh token → access token → SID.
 * Returns a CachedSession with the SID and an expiry timestamp.
 */
export async function exchangeRefreshForSID(
  instance: string,
  refreshToken: string
): Promise<CachedSession> {
  const accessToken = await getAccessToken(instance, refreshToken);
  const sid = await getSID(instance, accessToken);
  return {
    sid,
    expiresAt: Date.now() + SID_TTL_MS,
  };
}
