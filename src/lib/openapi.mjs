export function createOpenApiDocument({ origin = "https://specs.hara-lang.io" } = {}) {
  const problemResponse = {
    description: "API problem",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ProblemEnvelope" }
      }
    }
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Hara Specifications API",
      version: "1.0.0",
      summary: "Discover executable specifications and run deterministic conformity checks.",
      description: "The API reads the Git-authoritative hara-lang/hara-specs-registry at an exact commit. It exposes specification metadata and source representations, document checking, and package-manifest validation. Canonical registry writes remain gated on external publisher identity and authorization.",
      license: { name: "Repository licence" }
    },
    servers: [{ url: origin }],
    externalDocs: {
      description: "Hara specifications service source",
      url: "https://github.com/hara-lang/hara-specs"
    },
    tags: [
      { name: "Discovery", description: "Service metadata, health, and capabilities." },
      { name: "Specifications", description: "Read the exact, pinned specifications catalogue." },
      { name: "Conformance", description: "Run document and package conformity checks." }
    ],
    paths: {
      "/api/v1": {
        get: {
          tags: ["Discovery"],
          operationId: "discoverApi",
          summary: "Discover the current API",
          responses: {
            "200": {
              description: "Service descriptor",
              content: { "application/json": { schema: { $ref: "#/components/schemas/DiscoveryEnvelope" } } }
            }
          }
        }
      },
      "/api/v1/health": {
        get: {
          tags: ["Discovery"],
          operationId: "getHealth",
          summary: "Read service and registry readiness",
          responses: {
            "200": {
              description: "Ready",
              content: { "application/json": { schema: { $ref: "#/components/schemas/HealthEnvelope" } } }
            },
            "503": problemResponse
          }
        }
      },
      "/api/v1/capabilities": {
        get: {
          tags: ["Discovery"],
          operationId: "getCapabilities",
          summary: "Read supported operations, limits, and authority dependencies",
          responses: {
            "200": {
              description: "Capabilities",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CapabilitiesEnvelope" } } }
            }
          }
        }
      },
      "/api/v1/specs": {
        get: {
          tags: ["Specifications"],
          operationId: "listSpecifications",
          summary: "Search and page through specifications",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Full-text query across identifiers, titles, summaries, owners, and formats." },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "layer", in: "query", schema: { type: "string" } },
            { name: "owner", in: "query", schema: { type: "string" } },
            { name: "classification", in: "query", schema: { type: "string" } },
            { name: "materialization", in: "query", schema: { type: "string" } },
            { name: "executable", in: "query", schema: { type: "boolean" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["title", "id", "layer", "version"], default: "title" } },
            { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            { name: "cursor", in: "query", schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Specification page",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SpecificationListEnvelope" } } }
            },
            "400": problemResponse
          }
        }
      },
      "/api/v1/specs/{identifier}": {
        get: {
          tags: ["Specifications"],
          operationId: "getSpecification",
          summary: "Read one specification by slug, identifier, package name, or alias",
          parameters: [{ $ref: "#/components/parameters/SpecificationIdentifier" }],
          responses: {
            "200": {
              description: "Specification",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SpecificationEnvelope" } } }
            },
            "404": problemResponse
          }
        }
      },
      "/api/v1/specs/{identifier}/source": {
        get: {
          tags: ["Specifications"],
          operationId: "getSpecificationSource",
          summary: "Read the normative source bytes from the exact registry revision",
          parameters: [
            { $ref: "#/components/parameters/SpecificationIdentifier" },
            { name: "redirect", in: "query", schema: { type: "boolean", default: false }, description: "Return a 307 redirect to the immutable raw GitHub URL instead of proxying bytes." }
          ],
          responses: {
            "200": { description: "Normative source representation" },
            "307": { description: "Immutable source redirect" },
            "404": problemResponse,
            "502": problemResponse
          }
        }
      },
      "/api/v1/specs/{identifier}/documentation": {
        get: {
          tags: ["Specifications"],
          operationId: "getSpecificationDocumentation",
          summary: "Read the documentation bytes from the exact registry revision",
          parameters: [
            { $ref: "#/components/parameters/SpecificationIdentifier" },
            { name: "redirect", in: "query", schema: { type: "boolean", default: false } }
          ],
          responses: {
            "200": { description: "Documentation representation" },
            "307": { description: "Immutable documentation redirect" },
            "404": problemResponse,
            "502": problemResponse
          }
        }
      },
      "/api/v1/checks": {
        post: {
          tags: ["Conformance"],
          operationId: "createCheck",
          summary: "Inspect a document against a specification",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CheckRequest" } } }
          },
          responses: {
            "200": {
              description: "Completed conformity decision",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CheckEnvelope" } } }
            },
            "400": problemResponse,
            "413": problemResponse,
            "415": problemResponse,
            "422": {
              description: "The check could not complete",
              content: { "application/json": { schema: { $ref: "#/components/schemas/CheckEnvelope" } } }
            }
          }
        }
      },
      "/api/v1/packages/validate": {
        post: {
          tags: ["Conformance"],
          operationId: "validatePackageManifest",
          summary: "Validate a specification-package manifest",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PackageManifest" } } }
          },
          responses: {
            "200": {
              description: "Validation report; a no verdict is still a successful API response",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PackageValidationEnvelope" } } }
            },
            "400": problemResponse,
            "413": problemResponse,
            "415": problemResponse
          }
        }
      }
    },
    components: {
      parameters: {
        SpecificationIdentifier: {
          name: "identifier",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Prefer the URL-safe specification slug. Package names and qualified IDs must be URL encoded."
        }
      },
      schemas: {
        Problem: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: {}
          }
        },
        ProblemEnvelope: {
          type: "object",
          required: ["apiVersion", "error"],
          properties: {
            apiVersion: { const: "1" },
            error: { $ref: "#/components/schemas/Problem" }
          }
        },
        Registry: {
          type: "object",
          required: ["repository", "ref", "summary"],
          properties: {
            repository: { type: "string", const: "hara-lang/hara-specs-registry" },
            requestedRef: { type: ["string", "null"] },
            ref: { type: "string", pattern: "^[0-9a-f]{40}$" },
            indexPath: { type: "string" },
            resolved: { type: "boolean" },
            summary: { type: "object", additionalProperties: true }
          }
        },
        Specification: {
          type: "object",
          required: ["id", "slug", "packageName", "title", "version", "status", "source"],
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            packageName: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            type: { type: "string" },
            version: { type: "string" },
            status: { type: "string" },
            layer: { type: "string" },
            owner: { type: "string" },
            classification: { type: "string" },
            requirements: { type: "integer", minimum: 0 },
            formats: { type: "array", items: { type: "string" } },
            executable: { type: "boolean" },
            materialization: { type: "string" },
            source: { $ref: "#/components/schemas/SourceLocation" },
            documentation: { $ref: "#/components/schemas/SourceLocation" }
          },
          additionalProperties: true
        },
        SourceLocation: {
          type: "object",
          required: ["repository", "ref", "path"],
          properties: {
            repository: { type: "string" },
            ref: { type: "string" },
            path: { type: "string" },
            requestedRef: { type: "string" }
          },
          additionalProperties: true
        },
        Page: {
          type: "object",
          required: ["limit", "offset", "returned", "total"],
          properties: {
            limit: { type: "integer" },
            offset: { type: "integer" },
            returned: { type: "integer" },
            total: { type: "integer" },
            nextCursor: { type: ["string", "null"] },
            previousCursor: { type: ["string", "null"] }
          }
        },
        SpecificationListEnvelope: {
          type: "object",
          required: ["apiVersion", "data", "meta", "links"],
          properties: {
            apiVersion: { const: "1" },
            data: { type: "array", items: { $ref: "#/components/schemas/Specification" } },
            meta: {
              type: "object",
              properties: {
                registry: { $ref: "#/components/schemas/Registry" },
                page: { $ref: "#/components/schemas/Page" },
                filters: { type: "object", additionalProperties: true }
              }
            },
            links: { type: "object", additionalProperties: { type: ["string", "null"] } }
          }
        },
        SpecificationEnvelope: {
          type: "object",
          required: ["apiVersion", "data", "meta", "links"],
          properties: {
            apiVersion: { const: "1" },
            data: { $ref: "#/components/schemas/Specification" },
            meta: { type: "object", properties: { registry: { $ref: "#/components/schemas/Registry" } } },
            links: { type: "object", additionalProperties: { type: "string" } }
          }
        },
        CheckRequest: {
          type: "object",
          required: ["document"],
          properties: {
            document: { oneOf: [{ type: "string" }, { type: "object" }, { type: "array" }] },
            mediaType: { type: "string", default: "application/json" },
            spec: { type: "string", default: "@hara/spec-package@0.1.0" },
            profile: { type: "string", default: "core" }
          }
        },
        CheckReport: {
          type: "object",
          required: ["status", "conforms", "verdict"],
          properties: {
            status: { type: "string", enum: ["completed", "execution-error"] },
            conforms: { type: ["boolean", "null"] },
            verdict: { type: ["string", "null"], enum: ["yes", "no", null] },
            complete: { type: "boolean" },
            summary: { type: "object", additionalProperties: true },
            findings: { type: "array", items: { type: "object", additionalProperties: true } },
            error: { type: "object", additionalProperties: true },
            engine: { type: "object", additionalProperties: true }
          },
          additionalProperties: true
        },
        CheckEnvelope: {
          type: "object",
          required: ["apiVersion", "data"],
          properties: {
            apiVersion: { const: "1" },
            data: { $ref: "#/components/schemas/CheckReport" },
            links: { type: "object", additionalProperties: { type: "string" } }
          }
        },
        PackageManifest: {
          type: "object",
          required: ["name", "version", "kind", "entry", "accepts"],
          properties: {
            name: { type: "string", pattern: "^@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$" },
            version: { type: "string" },
            kind: { type: "string", enum: ["hara/spec", "hara/profile", "hara/rules", "hara/adapter", "hara/dataset"] },
            entry: { type: "string" },
            accepts: { type: "array", minItems: 1, items: { type: "string" } },
            description: { type: "string" },
            license: { type: "string" },
            capabilities: { type: "array", items: { type: "string" } }
          },
          additionalProperties: true
        },
        PackageValidationEnvelope: {
          type: "object",
          required: ["apiVersion", "data"],
          properties: {
            apiVersion: { const: "1" },
            data: {
              type: "object",
              required: ["status", "conforms", "verdict", "findings", "target"],
              properties: {
                status: { const: "completed" },
                conforms: { type: "boolean" },
                verdict: { type: "string", enum: ["yes", "no"] },
                summary: { type: "object", additionalProperties: true },
                findings: { type: "array", items: { type: "object", additionalProperties: true } },
                target: { $ref: "#/components/schemas/Registry" }
              }
            }
          }
        },
        DiscoveryEnvelope: { type: "object", additionalProperties: true },
        HealthEnvelope: { type: "object", additionalProperties: true },
        CapabilitiesEnvelope: { type: "object", additionalProperties: true }
      }
    },
    "x-hara-authorities": {
      specifications: {
        service: "hara-lang/hara-specs",
        registry: "hara-lang/hara-specs-registry"
      },
      identity: {
        serviceUrl: "https://id.hara-lang.org",
        registry: "hara-lang/hara-identity",
        relationship: "publisher enrollment, namespace authorization, and revocation",
        status: "external"
      }
    }
  };
}
