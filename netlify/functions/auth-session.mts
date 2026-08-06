import {
  jsonResponse,
  methodNotAllowed,
  parseCookies,
  readSessionSecret,
  SESSION_COOKIE,
  verifySession
} from "../../src/lib/auth.mjs";

export default async (request: Request) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    return methodNotAllowed(request.method, ["GET", "HEAD"]);
  }

  let configured = true;
  let user = null;
  try {
    const secret = readSessionSecret(process.env);
    const cookies = parseCookies(request.headers.get("cookie") || "");
    user = verifySession(cookies[SESSION_COOKIE], secret);
  } catch {
    configured = false;
  }

  return jsonResponse({
    authenticated: Boolean(user),
    configured,
    user
  }, {
    method: request.method,
    headers: { Vary: "Cookie" }
  });
};

export const config = { path: "/api/auth/session" };
