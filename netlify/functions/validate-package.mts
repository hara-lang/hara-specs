import { validatePackageManifest } from "../../src/lib/checker.mjs";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  try {
    const manifest = await request.json();
    const findings = validatePackageManifest(manifest);
    const errors = findings.filter(({ severity }) => severity === "error").length;
    return Response.json({
      status: "completed",
      conforms: errors === 0,
      verdict: errors === 0 ? "yes" : "no",
      findings,
      target: "hara-lang/hara-specs-registry"
    });
  } catch (error) {
    return Response.json({
      status: "execution-error",
      conforms: null,
      error: { code: "INVALID_JSON", message: error instanceof Error ? error.message : "Invalid request." }
    }, { status: 400 });
  }
};

export const config = { path: "/api/packages/validate" };
