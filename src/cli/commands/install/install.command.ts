import { hasStaleLocalSourceRef } from '../../../agent/catalog/manifest/migrate/has.stale.local.source.ref.ts';
import { migrateStaleLocalSourceRef } from '../../../agent/catalog/manifest/migrate/migrate.stale.local.source.ref.ts';
import { STALE_LOCAL_SOURCE_REF } from '../../../agent/catalog/manifest/migrate/stale.local.source.ref.ts';
import { readMaiaPackageVersion } from '../../../shared/package/read.maia.package.version.ts';
import type { CommandHandler } from '../../contracts/command.handler.ts';
import { parseFlags } from '../../shared/flags/parse.flags.ts';
import { reinstallFromLock } from '../../shared/workspace/reinstall.from.lock.ts';
import { ensureInitialized } from '../init/ensure.initialized.ts';
import { restoreConfiguredAgents } from '../init/restore.configured.agents.ts';
import { defaultToolkitIo } from '../toolkit/default.toolkit.io.ts';
import { restoreToolkits } from '../toolkit/restore.toolkits.ts';
import type { ToolkitIo } from '../toolkit/toolkit.io.ts';
import { installNamedCapability } from './install.named.capability.ts';
import { upgradeSingleFileSkills } from './upgrade.single.file.skills.ts';

/** Builds the install command over the given toolkit side effects. */
export function createInstallCommand(io: ToolkitIo): CommandHandler {
  return async (args, { store, interaction }) => {
    ensureInitialized(store);
    const { positional, flags } = parseFlags(args);

    if (positional.length === 0) {
      // Projects created while Maia shipped a hand-written 1.5.2 still pin that
      // unpublished version; a bare install rewrites it before relocking (feature 007).
      const manifest = store.loadManifest();
      const migrateLocalRef = hasStaleLocalSourceRef(manifest);
      if (migrateLocalRef) {
        store.saveManifest(migrateStaleLocalSourceRef(manifest, readMaiaPackageVersion()));
      }
      await upgradeSingleFileSkills(store);
      const lock = store.buildLock();
      if (migrateLocalRef) {
        console.log(
          `Updated maia.json source "local" ref from ${STALE_LOCAL_SOURCE_REF} (never published) `
          + `to ${readMaiaPackageVersion()}; maia.lock.json regenerated.`,
        );
      }
      const result = await reinstallFromLock(store, lock);
      const toolkits = restoreToolkits(store, lock, 'install', io);
      restoreConfiguredAgents(store);
      console.log(`Bootstrapped maia.lock.json with ${Object.keys(lock.packages).length} locked entries`);
      console.log(`Installed ${result.skills.length} skills and synced MCP config`);
      console.log(`Installed ${toolkits.installed.length} toolkits`);
      return;
    }

    await installNamedCapability(store, positional, flags, interaction);
  };
}

/** Performs the install command operation. */
export const installCommand: CommandHandler = createInstallCommand(defaultToolkitIo);
