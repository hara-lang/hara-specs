export function createOpenApiDocument({ origin = "https://specs.hara-lang.io" } = {}) {
  const problemResponse = { description: "API problem", content: { "application/json": { schema: { $ref: "#/components/schemas/ProblemEnvelope" } } } };
  const json = (schema) => ({ "application/json": { schema } });
  return {
    openapi: "3.1.0",
    info: {
      title: "Hara Specifications API",
      version: "1.0.0",
      summary: "Discover executable specifications and validate project.edn.",
      description: "The API reads the Git-authoritative specifications registry at an exact commit. Project validation uses the single project.edn authoring contract; locks and package indexes are generated outputs."
    },
    servers: [{ url: origin }],
    externalDocs: { description: "Hara specifications service source", url: "https://github.com/hara-lang/hara-specs" },
    tags: [
      { name: "Discovery", description: "Service metadata, health, and capabilities." },
      { name: "Specifications", description: "Read the exact pinned specifications catalogue." },
      { name: "Conformance", description: "Run document and project conformance checks." }
    ],
    paths: {
      "/api/v1": { get: { tags: ["Discovery"], operationId: "discoverApi", summary: "Discover the current API", responses: { "200": { description: "Service descriptor", content: json({ type: "object" }) } } } },
      "/api/v1/health": { get: { tags: ["Discovery"], operationId: "getHealth", summary: "Read service and registry readiness", responses: { "200": { description: "Ready", content: json({ type: "object" }) }, "503": problemResponse } } },
      "/api/v1/capabilities": { get: { tags: ["Discovery"], operationId: "getCapabilities", summary: "Read supported operations and authority dependencies", responses: { "200": { description: "Capabilities", content: json({ type: "object" }) } } } },
      "/api/v1/specs": { get: { tags: ["Specifications"], operationId: "listSpecifications", summary: "Search and page through specifications", parameters: [
        { name: "q", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "layer", in: "query", schema: { type: "string" } }, { name: "owner", in: "query", schema: { type: "string" } }, { name: "classification", in: "query", schema: { type: "string" } }, { name: "materialization", in: "query", schema: { type: "string" } }, { name: "executable", in: "query", schema: { type: "boolean" } }, { name: "sort", in: "query", schema: { type: "string", enum: ["title", "id", "layer", "version"] } }, { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } }, { name: "cursor", in: "query", schema: { type: "string" } }
      ], responses: { "200": { description: "Specification page", content: json({ type: "object" }) }, "400": problemResponse } } },
      "/api/v1/specs/{identifier}": { get: { tags: ["Specifications"], operationId: "getSpecification", summary: "Read one specification by slug, identifier, coordinate, or alias", parameters: [{ $ref: "#/components/parameters/SpecificationIdentifier" }], responses: { "200": { description: "Specification", content: json({ type: "object" }) }, "404": problemResponse } } },
      "/api/v1/specs/{identifier}/source": { get: { tags: ["Specifications"], operationId: "getSpecificationSource", summary: "Read normative source bytes from the exact registry revision", parameters: [{ $ref: "#/components/parameters/SpecificationIdentifier" }, { name: "redirect", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Normative source" }, "307": { description: "Immutable source redirect" }, "404": problemResponse, "502": problemResponse } } },
      "/api/v1/specs/{identifier}/documentation": { get: { tags: ["Specifications"], operationId: "getSpecificationDocumentation", summary: "Read documentation bytes from the exact registry revision", parameters: [{ $ref: "#/components/parameters/SpecificationIdentifier" }, { name: "redirect", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Documentation" }, "307": { description: "Immutable documentation redirect" }, "404": problemResponse, "502": problemResponse } } },
      "/api/v1/checks": { post: { tags: ["Conformance"], operationId: "createCheck", summary: "Inspect a document against a specification", requestBody: { required: true, content: json({ $ref: "#/components/schemas/CheckRequest" }) }, responses: { "200": { description: "Completed conformity decision", content: json({ $ref: "#/components/schemas/CheckEnvelope" }) }, "400": problemResponse, "413": problemResponse, "415": problemResponse, "422": problemResponse } } },
      "/api/v1/packages/validate": { post: { tags: ["Conformance"], operationId: "validateProjectManifest", summary: "Validate contributor-authored project.edn", requestBody: { required: true, content: { "application/edn": { schema: { type: "string", description: "Complete project.edn bytes." } } } }, responses: { "200": { description: "Validation report", content: json({ $ref: "#/components/schemas/ProjectValidationEnvelope" }) }, "400": problemResponse, "413": problemResponse, "415": problemResponse } } }
    },
    components: {
      parameters: { SpecificationIdentifier: { name: "identifier", in: "path", required: true, schema: { type: "string" }, description: "URL-safe slug, qualified identifier, owner/name coordinate, or alias." } },
      schemas: {
        Problem: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, details: {} } },
        ProblemEnvelope: { type: "object", required: ["apiVersion", "error"], properties: { apiVersion: { const: "1" }, error: { $ref: "#/components/schemas/Problem" } } },
        SourceLocation: { type: "object", required: ["repository", "ref", "path"], properties: { repository: { type: "string" }, ref: { type: "string" }, path: { type: "string" } }, additionalProperties: true },
        Specification: { type: "object", required: ["id", "slug", "coordinate", "title", "version", "status", "source"], properties: { id: { type: "string" }, slug: { type: "string" }, coordinate: { type: "string", pattern: "^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$" }, title: { type: "string" }, summary: { type: "string" }, type: { type: "string" }, version: { type: "string" }, status: { type: "string" }, layer: { type: "string" }, owner: { type: "string" }, classification: { type: "string" }, requirements: { type: "integer" }, formats: { type: "array", items: { type: "string" } }, executable: { type: "boolean" }, materialization: { type: "string" }, source: { $ref: "#/components/schemas/SourceLocation" }, documentation: { $ref: "#/components/schemas/SourceLocation" } }, additionalProperties: true },
        CheckRequest: { type: "object", required: ["document"], properties: { document: { oneOf: [{ type: "string" }, { type: "object" }, { type: "array" }] }, mediaType: { type: "string", default: "application/edn" }, spec: { type: "string", default: "hara/package@0.1.0" }, profile: { type: "string", default: "core" } } },
        CheckReport: { type: "object", required: ["status", "conforms", "verdict"], properties: { status: { type: "string" }, conforms: { type: ["boolean", "null"] }, verdict: { type: ["string", "null"] }, complete: { type: "boolean" }, summary: { type: "object" }, findings: { type: "array", items: { type: "object" } }, error: { type: "object" }, engine: { type: "object" } }, additionalProperties: true },
        CheckEnvelope: { type: "object", required: ["apiVersion", "data"], properties: { apiVersion: { const: "1" }, data: { $ref: "#/components/schemas/CheckReport" }, links: { type: "object" } } },
        ProjectValidationEnvelope: { type: "object", required: ["apiVersion", "data"], properties: { apiVersion: { const: "1" }, data: { allOf: [{ $ref: "#/components/schemas/CheckReport" }, { type: "object", properties: { target: { type: "object" } } }] }, links: { type: "object" } } }
      }
    },
    "x-hara-authorities": {
      registry: { repository: "hara-lang/hara-specs-registry", mutation: "protected Git changes" },
      identity: { registry: "hara-lang/hara-identity", service: "https://id.hara-lang.org" },
      packages: { service: "https://packages.hara-lang.org", manifest: "project.edn" }
    }
  };
}
