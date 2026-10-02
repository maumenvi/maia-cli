import type { SourcesManifest } from '../../types/manifest/sources.manifest.ts';

/**
 * Remote skills still recorded as a single SKILL.md (installed before skill
 * folders). Local registry skills are not remote and are left alone.
 */
export function listSingleFileSkills(manifest: SourcesManifest): string[] {
  return Object.entries(manifest.skills ?? {})
    .filter(([, dependency]) => dependency.source !== 'local' && (dependency.path ?? '').toLowerCase().endsWith('skill.md'))
    .map(([name]) => name);
}
