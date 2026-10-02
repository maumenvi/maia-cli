import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/**
 * Whether any skill dependency is a folder (its path does not end in
 * SKILL.md). Decided from the manifest alone, so a lock regenerated before
 * the skills are restored keeps the same version.
 */
export function manifestHasDirectorySkills(manifest: SourcesManifest): boolean {
  return Object.values(manifest.skills ?? {}).some((dependency) => {
    const dependencyPath = dependency.path ?? '';
    return dependencyPath.length > 0 && !dependencyPath.toLowerCase().endsWith('skill.md');
  });
}
