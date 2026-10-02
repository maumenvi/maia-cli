import { listSingleFileSkills } from '../../../agent/catalog/manifest/migrate/list.single.file.skills.ts';
import { migrateSkillPathToDirectory } from '../../../agent/catalog/manifest/migrate/migrate.skill.path.to.directory.ts';
import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import type { SkillDependency } from '../../../agent/catalog/types/dependencies/skill.dependency.ts';
import { materializeRemoteSkill } from '../../shared/workspace/materialize.remote.skill.ts';

/**
 * Upgrades remote skills installed as a single SKILL.md to their whole folder,
 * from the same pinned source, and points the manifest at the folder (FR-014).
 */
export async function upgradeSingleFileSkills(store: AgentCatalogStore): Promise<void> {
  for (const name of listSingleFileSkills(store.loadManifest())) {
    const manifest = store.loadManifest();
    const dependency = manifest.skills[name] as SkillDependency;
    const source = manifest.sources[dependency.source];
    if (!source) continue;
    await materializeRemoteSkill(store, dependency.sourceName ?? name, source, `skills/${name}`);
    store.saveManifest(migrateSkillPathToDirectory(manifest, name));
    console.log(`Upgraded skill:${name} to include its supporting files.`);
  }
}
