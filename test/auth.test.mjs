import assert from "node:assert/strict";
import test from "node:test";
import {
  assertOAuthCallback,
  AuthError,
  buildGitHubAuthorizeUrl,
  createOAuthAttempt,
  exchangeGitHubCode,
  fetchGitHubUser,
  oauthAttemptCookies,
  parseCookies,
  pkceChallenge,
  readOAuthConfig,
  safeReturnTo,
  SESSION_COOKIE,
  sessionCookie,
  signSession,
  verifySession
} from "../src/lib/auth.mjs";

const sessionSecret = "test-session-secret-that-is-at-least-thirty-two-characters";

test("generates the RFC 7636 S256 PKCE challenge", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  assert.equal(pkceChallenge(verifier), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("accepts only same-origin relative return paths", () => {
  assert.equal(safeReturnTo("/registry?status=ready#top"), "/registry?status=ready#top");
  assert.equal(safeReturnTo("https://example.com/steal"), "/");
  assert.equal(safeReturnTo("//example.com/steal"), "/");
  assert.equal(safeReturnTo("/\\example.com"), "/");
  assert.equal(safeReturnTo("/ok\nLocation:https://example.com"), "/");
});

test("builds a GitHub authorization URL with state and PKCE", () => {
  const url = new URL(buildGitHubAuthorizeUrl({
    clientId: "client-id",
    redirectUri: "https://specs.hara-lang.org/auth/github/callback",
    state: "state-value",
    challenge: "challenge-value"
  }));
  assert.equal(url.origin, "https://github.com");
  assert.equal(url.pathname, "/login/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "client-id");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("code_challenge"), "challenge-value");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), "read:user");
});

test("loads OAuth configuration and derives the callback URL", () => {
  const config = readOAuthConfig({
    HARA_GITHUB_OAUTH_CLIENT_ID: "client-id",
    HARA_GITHUB_OAUTH_CLIENT_SECRET: "client-secret",
    HARA_AUTH_SESSION_SECRET: sessionSecret
  }, "https://specs.hara-lang.org/auth/github");
  assert.equal(config.redirectUri, "https://specs.hara-lang.org/auth/github/callback");
  assert.throws(() => readOAuthConfig({}, "https://specs.hara-lang.org/auth/github"), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "AUTH_NOT_CONFIGURED");
    return true;
  });
});

test("stores OAuth state, verifier, and return path in short-lived secure cookies", () => {
  const attempt = createOAuthAttempt("/publish?from=header");
  const cookies = oauthAttemptCookies(attempt, "https://specs.hara-lang.org/auth/github");
  assert.equal(cookies.length, 3);
  for (const cookie of cookies) {
    assert.match(cookie, /Path=\/auth\/github\/callback/);
    assert.match(cookie, /Max-Age=600/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
  }

  const requestCookie = cookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
  const parsed = parseCookies(requestCookie);
  assert.equal(parsed.hara_oauth_state, attempt.state);
  assert.equal(parsed.hara_oauth_verifier, attempt.verifier);
  assert.equal(parsed.hara_oauth_return, "/publish?from=header");

  const callback = assertOAuthCallback({
    requestUrl: `https://specs.hara-lang.org/auth/github/callback?code=temporary&state=${attempt.state}`,
    cookieHeader: requestCookie
  });
  assert.equal(callback.code, "temporary");
  assert.equal(callback.verifier, attempt.verifier);
  assert.equal(callback.returnTo, "/publish?from=header");
});

test("rejects a callback whose state does not match", () => {
  assert.throws(() => assertOAuthCallback({
    requestUrl: "https://specs.hara-lang.org/auth/github/callback?code=temporary&state=attacker",
    cookieHeader: "hara_oauth_state=expected; hara_oauth_verifier=this-is-a-long-enough-verifier-value-for-the-test"
  }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "OAUTH_STATE_INVALID");
    return true;
  });
});

test("exchanges the callback code without leaking credentials into the URL", async () => {
  const accessToken = await exchangeGitHubCode({
    clientId: "client-id",
    clientSecret: "client-secret",
    code: "temporary-code",
    redirectUri: "https://specs.hara-lang.org/auth/github/callback",
    verifier: "verifier"
  }, async (url, options) => {
    assert.equal(url, "https://github.com/login/oauth/access_token");
    assert.equal(options.method, "POST");
    assert.doesNotMatch(url, /client-secret|temporary-code/);
    const body = new URLSearchParams(options.body);
    assert.equal(body.get("client_secret"), "client-secret");
    assert.equal(body.get("code_verifier"), "verifier");
    return new Response(JSON.stringify({ access_token: "gho_test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  assert.equal(accessToken, "gho_test");
});

test("normalizes the authenticated GitHub user", async () => {
  const user = await fetchGitHubUser("gho_test", async (url, options) => {
    assert.equal(url, "https://api.github.com/user");
    assert.equal(options.headers.Authorization, "Bearer gho_test");
    return new Response(JSON.stringify({ id: 42, login: "hara-user", name: "Hara User" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  });
  assert.deepEqual(user, { id: 42, login: "hara-user", name: "Hara User" });
});

test("signs an expiring HttpOnly session without retaining the OAuth token", () => {
  const now = Date.UTC(2026, 7, 6, 2, 0, 0);
  const token = signSession({ id: 42, login: "hara-user", name: "Hara User" }, sessionSecret, {
    now,
    ttlSeconds: 120
  });
  const user = verifySession(token, sessionSecret, { now: now + 60_000 });
  assert.deepEqual(user, {
    id: "42",
    login: "hara-user",
    name: "Hara User",
    profileUrl: "https://github.com/hara-user"
  });
  assert.equal(verifySession(`${token}tampered`, sessionSecret, { now }), null);
  assert.equal(verifySession(token, sessionSecret, { now: now + 121_000 }), null);

  const cookie = sessionCookie(token, "https://specs.hara-lang.org/auth/github/callback");
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=`));
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /gho_/);
});
