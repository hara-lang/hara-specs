# HAL metaspec

Status: **draft**  
Version: **0.1.0**

The authoritative document is [`hal-metaspec.edn`](hal-metaspec.edn). It is the
self-describing contract for authoring, linting, verifying, and repairing Hara
metaspec documents.

This directory defines metaspecs themselves. It does not define the shape of a
language specification or an artifact specification; those specialized
metaspecs live beside the document families they govern.

The executable cases in
[`conformance/metaspec.edn`](conformance/metaspec.edn) verify self-description,
required sections, qualified extension keys, identifier uniqueness, reference
resolution, and structured repair actions.
