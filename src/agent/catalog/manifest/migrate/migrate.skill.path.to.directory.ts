import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/** Returns a manifest whose skill `name` points at its folder (`skills/<name>`). */
export function migrateSkillPathToDirectory(manifest: SourcesManifest, name: string): SourcesManifest {
  const dependency = manifest.skills[name];
  if (!dependency) return manifest;
  return { ...manifest, skills: { ...manifest.skills, [name]: { ...dependency, path: `skills/${name}` } } };
}
