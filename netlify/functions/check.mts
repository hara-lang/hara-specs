import { runReferenceCheck } from "../../src/lib/checker.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) {
    return Response.json({ error: "The reference endpoint accepts payloads up to 1 MB." }, { status: 413 });
  }

  try {
    const payload = await request.json();
    const report = runReferenceCheck({ ...payload, execution: "server" });
    return Response.json(report, { status: report.status === "completed" ? 200 : 422 });
  } catch (error) {
    return Response.json({
      status: "execution-error",
      conforms: null,
      verdict: null,
      error: {
        code: "INVALID_REQUEST",
        message: error instanceof Error ? error.message : "The request body could not be read."
      }
    }, { status: 400 });
  }
};

export const config = { path: "/api/check" };
