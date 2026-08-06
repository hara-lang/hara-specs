import {
  assertOAuthCallback,
  authErrorResponse,
  clearOAuthCookies,
  exchangeGitHubCode,
  fetchGitHubUser,
  methodNotAllowed,
  readOAuthConfig,
  redirectResponse,
  sessionCookie,
  signSession
} from "../../src/lib/auth.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return methodNotAllowed(request.method, ["GET"]);

  const requestUrl = new URL(request.url);
  let response: Response;

  try {
    const config = readOAuthConfig(process.env, requestUrl);
    const callback = assertOAuthCallback({
      requestUrl,
      cookieHeader: request.headers.get("cookie") || ""
    });
    const accessToken = await exchangeGitHubCode({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code: callback.code,
      redirectUri: config.redirectUri,
      verifier: callback.verifier
    });
    const user = await fetchGitHubUser(accessToken);
    const token = signSession(user, config.sessionSecret);

    response = redirectResponse(callback.returnTo, 303);
    response.headers.append("Set-Cookie", sessionCookie(token, requestUrl));
  } catch (error) {
    response = authErrorResponse(error);
  }

  for (const cookie of clearOAuthCookies(requestUrl)) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
};

export const config = { path: "/auth/github/callback" };
