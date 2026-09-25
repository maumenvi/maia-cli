import type { AgentCatalogStore } from '../../../agent/catalog/store/agent.catalog.store.ts';
import { buildToolkitInstallCommands } from '../../../agent/toolkits/plan/build.toolkit.install.commands.ts';
import { collectToolkitPathPatterns } from '../../../agent/toolkits/plan/collect.toolkit.path.patterns.ts';
import { normalizeToolkitVersion } from '../../../agent/toolkits/plan/normalize.toolkit.version.ts';
import { resolveEffectiveScope } from '../../../agent/toolkits/plan/resolve.effective.scope.ts';
import { resolveToolkitIntegrations } from '../../../agent/toolkits/plan/resolve.toolkit.integrations.ts';
import { GuardrailBlockedError } from '../../shared/guardrail/guardrail.blocked.error.ts';
import { assertToolkitPathsAllowed } from './assert.toolkit.paths.allowed.ts';
import { checkToolkitPrerequisites } from './check.toolkit.prerequisites.ts';
import { detectToolkitState } from './detect.toolkit.state.ts';
import { enabledAgentIds } from './enabled.agent.ids.ts';
import { findToolkitOrThrow } from './find.toolkit.or.throw.ts';
import { formatToolkitCommand } from './format.toolkit.command.ts';
import type { InstallToolkitRequest } from './install.toolkit.request.ts';
import { recordToolkit } from './record.toolkit.ts';
import { resolveToolkitRelease } from './resolve.toolkit.release.ts';
import { rollbackNewToolkitPaths } from './rollback.new.toolkit.paths.ts';
import { runToolkitCommands } from './run.toolkit.commands.ts';
import { snapshotToolkitPaths } from './snapshot.toolkit.paths.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/**
 * `maia toolkit i`: validates, resolves scope and version, checks
 * prerequisites, asks for confirmation, runs the toolkit's native installer
 * and records the result — manifest and lock are only written after the
 * installer succeeds (FR-009). Follows data-model §5.
 */
export async function installToolkit(store: AgentCatalogStore, request: InstallToolkitRequest, io: ToolkitIo): Promise<void> {
  const definition = findToolkitOrThrow(request.name, io.catalog);
  const { scope, warning } = resolveEffectiveScope(definition, request.global);
  if (warning) console.warn(`warning: ${warning}`);

  const version = await resolveToolkitRelease(definition, request.version, io);
  const projectRoot = store.getPaths().projectRoot;
  checkToolkitPrerequisites(definition, projectRoot, io);

  const manifest = store.loadManifest();
  const registered = manifest.toolkits[definition.name];
  const detected = detectToolkitState(definition, { version, scope }, projectRoot, io);

  if (detected.state === 'installed') {
    if (registered?.version === version && registered.scope === scope) {
      console.log(`${definition.name}@${version} is already installed`);
      return;
    }
    await recordToolkit(store, definition.name, { version, scope });
    console.log(`Adopted existing ${definition.name}@${version}`);
    return;
  }

  const { integrations, warnings } = resolveToolkitIntegrations(definition, enabledAgentIds(manifest));
  for (const message of warnings) console.warn(`warning: ${message}`);
  const patterns = collectToolkitPathPatterns(definition, integrations);

  // Switching versions re-runs an installer that overwrites existing files,
  // so the guardrail decides before anything runs (FR-027).
  const switching = detected.state === 'mismatch';
  if (switching) {
    const existing = snapshotToolkitPaths(projectRoot, patterns);
    const { blocked } = assertToolkitPathsAllowed(store, existing, 'file-overwrite', `maia toolkit i ${definition.name} --version ${version}`);
    if (blocked.length > 0) {
      throw new GuardrailBlockedError(`Blocked by guardrail, not overwriting: ${blocked.join(', ')}`, 1);
    }
  }

  const globalToolReady = scope === 'global'
    && detected.globalToolVersion !== null
    && normalizeToolkitVersion(detected.globalToolVersion) === version;
  const context = { version, scope, integrations, platform: io.platform, repository: definition.repository, globalToolReady };
  const commands = buildToolkitInstallCommands(definition, context, detected.state);

  for (const command of commands) console.log(`Will run: ${formatToolkitCommand(command)}`);
  console.log(`Source: ${definition.repository}@v${version}`);
  if (switching) {
    console.log(`Existing ${definition.name} files will be overwritten (edits will be lost).`);
  }
  if (!request.yes && !(await io.confirm('Proceed? [y/N]'))) {
    throw new Error('Aborted');
  }

  const before = snapshotToolkitPaths(projectRoot, patterns);
  const { failed, completed } = runToolkitCommands(commands, projectRoot, true, io);
  if (failed) {
    const { kept } = rollbackNewToolkitPaths(store, before, patterns);
    const globalToolCommand = formatToolkitCommand(definition.commands.installGlobalTool(context));
    const installedGlobalTool = scope === 'global'
      && completed.some((command) => formatToolkitCommand(command) === globalToolCommand);
    const details = [
      `Toolkit ${definition.name} failed to install (exit ${failed.status})`,
      ...(failed.stderr ? [failed.stderr.trim()] : []),
      ...(kept.length > 0 ? [`Blocked by guardrail, kept: ${kept.join(', ')}`] : []),
      ...(installedGlobalTool ? [`Global tool kept; to uninstall: ${definition.commands.uninstallGlobalToolHint()}`] : []),
      ...(switching ? [`Files may be partially at v${version}; re-run "maia toolkit i ${definition.name} --version <x>" to settle on a version.`] : []),
    ];
    throw new Error(details.join('\n'));
  }

  await recordToolkit(store, definition.name, { version, scope });
  console.log(`Installed toolkit:${definition.name}@${version} (${scope})`);
}
