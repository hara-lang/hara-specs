const SOURCE_ARCHIVE = "https://codeload.github.com/hara-lang/hara-specs/tar.gz/dc269add5de05d06ddf215ca9f1d2d2b0c49f135";

export default async (request: Request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" }
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: SOURCE_ARCHIVE,
      "Cache-Control": "no-store",
      "X-Hara-Migration-Bridge": "temporary"
    }
  });
};

export const config = {
  path: "/api/internal/migration-source"
};
