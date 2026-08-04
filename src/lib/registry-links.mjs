const encodePath = (value) => String(value || "").split("/").map(encodeURIComponent).join("/");

export function sourceLocation(spec, registrySource) {
  return spec.source || {
    repository: registrySource.repository,
    ref: registrySource.ref,
    path: spec.sourcePath
  };
}

export function documentationLocation(spec, registrySource) {
  return spec.documentation || {
    repository: registrySource.repository,
    ref: registrySource.ref,
    path: spec.documentationPath
  };
}

export function githubBlobUrl(location) {
  if (!location?.repository || !location?.ref || !location?.path) return null;
  return `https://github.com/${location.repository}/blob/${encodeURIComponent(location.ref)}/${encodePath(location.path)}`;
}

export function locationLabel(location) {
  if (!location) return "Unavailable";
  const shortRef = /^[0-9a-f]{40}$/i.test(location.ref || "") ? location.ref.slice(0, 12) : location.ref;
  return `${location.repository}@${shortRef}`;
}

export function materializationLabel(spec) {
  return spec.materialization === "pinned-source" ? "Pinned source" : "Registry source";
}
