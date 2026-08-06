import {
  clearSessionCookie,
  jsonResponse,
  methodNotAllowed,
  redirectResponse,
  safeReturnTo
} from "../../src/lib/auth.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") return methodNotAllowed(request.method, ["POST"]);

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return jsonResponse({
      error: {
        code: "AUTH_ORIGIN_INVALID",
        message: "The sign-out request came from an unexpected origin."
      }
    }, { status: 403 });
  }

  let returnTo = requestUrl.searchParams.get("return_to") || "/";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      returnTo = String(form.get("return_to") || returnTo);
    } catch {}
  }

  const response = redirectResponse(safeReturnTo(returnTo), 303);
  response.headers.append("Set-Cookie", clearSessionCookie(requestUrl));
  return response;
};

export const config = { path: "/auth/logout" };
