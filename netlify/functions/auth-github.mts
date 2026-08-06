import {
  authErrorResponse,
  buildGitHubAuthorizeUrl,
  createOAuthAttempt,
  methodNotAllowed,
  oauthAttemptCookies,
  readOAuthConfig,
  redirectResponse
} from "../../src/lib/auth.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") return methodNotAllowed(request.method, ["GET"]);

  try {
    const requestUrl = new URL(request.url);
    const config = readOAuthConfig(process.env, requestUrl);
    const attempt = createOAuthAttempt(requestUrl.searchParams.get("return_to") || "/");
    const authorizeUrl = buildGitHubAuthorizeUrl({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state: attempt.state,
      challenge: attempt.challenge
    });
    const response = redirectResponse(authorizeUrl);
    for (const cookie of oauthAttemptCookies(attempt, requestUrl)) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
};

export const config = { path: "/auth/github" };
