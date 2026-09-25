import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { TOOLKIT_CATALOG } from '../../src/agent/toolkits/catalog/toolkit.catalog.ts';
import type { ToolkitCommand } from '../../src/agent/toolkits/contracts/toolkit.command.ts';
import type { NativeRunResult } from '../../src/cli/commands/toolkit/native.run.result.ts';
import type { ToolkitIo } from '../../src/cli/commands/toolkit/toolkit.io.ts';

/** Files the fake Spec Kit creates per integration, mirroring research D3. */
const INTEGRATION_DIRS: Record<string, string> = {
  claude: '.claude/skills/speckit-plan',
  copilot: '.github/skills/speckit-plan',
  'cursor-agent': '.cursor/skills/speckit-plan',
  codex: '.agents/skills/speckit-plan',
  zed: '.agents/skills/speckit-plan',
  cline: '.clinerules/workflows/speckit-plan.md',
};

/** Options that steer the fake native toolkit. */
export interface FakeToolkitOptions {
  missing?: string[];
  failOn?: (command: ToolkitCommand) => number | undefined;
  globalVersion?: string | null;
  confirmAnswer?: boolean;
  releases?: string[];
  latest?: string;
}

/** A recording, file-simulating stand-in for Spec Kit, uv, the terminal and GitHub. */
export interface FakeToolkitIo extends ToolkitIo {
  calls: ToolkitCommand[];
  questions: string[];
  state: { globalVersion: string | null };
  /** Commands that are not version/prerequisite probes, rendered as strings. */
  executed(): string[];
}

/** Returns the `x.y.z` pinned in a `git+…@vX.Y.Z` argument, if any. */
function pinnedVersion(args: string[]): string | undefined {
  return args.map((arg) => /@v(\d+\.\d+\.\d+)$/.exec(arg)?.[1]).find(Boolean);
}

/** Builds a fake io rooted at `projectRoot`. */
export function createFakeToolkitIo(projectRoot: string, options: FakeToolkitOptions = {}): FakeToolkitIo {
  const calls: ToolkitCommand[] = [];
  const questions: string[] = [];
  const state = { globalVersion: options.globalVersion ?? null };
  const releases = new Set(options.releases ?? ['1.0.10', '1.0.11']);
  const latest = options.latest ?? '1.0.11';

  const ok = (stdout = ''): NativeRunResult => ({ status: 0, stdout, stderr: '' });

  const runner: ToolkitIo['runner'] = (command) => {
    calls.push(command);
    const { args } = command;
    if (options.missing?.includes(command.command)) return { status: 127, stdout: '', stderr: 'not found' };
    const forced = options.failOn?.(command);
    if (args.length === 1 && args[0] === '--version') {
      if (command.command === 'specify') {
        return state.globalVersion ? ok(`specify ${state.globalVersion}\n`) : { status: 127, stdout: '', stderr: '' };
      }
      return ok(`${command.command} 1.0.0`);
    }

    const specifyIndex = args.indexOf('specify');
    const specifyArgs = command.command === 'specify' ? args : args.slice(specifyIndex + 1);
    const version = pinnedVersion(args) ?? state.globalVersion ?? '0.0.0';

    if (command.command === 'uv' && args[0] === 'tool') {
      if (forced) return { status: forced, stdout: '', stderr: 'boom' };
      state.globalVersion = version;
      return ok();
    }
    if (specifyArgs[0] === 'init') {
      mkdirSync(path.join(projectRoot, '.specify', 'memory'), { recursive: true });
      writeFileSync(path.join(projectRoot, '.specify', 'init-options.json'), JSON.stringify({ speckit_version: version }));
      const integration = specifyArgs[specifyArgs.indexOf('--integration') + 1];
      if (specifyArgs.includes('--integration')) createIntegration(projectRoot, integration);
      if (forced) return { status: forced, stdout: '', stderr: 'boom' };
      return ok();
    }
    if (specifyArgs[0] === 'integration') {
      if (forced) return { status: forced, stdout: '', stderr: 'boom' };
      const target = path.join(projectRoot, INTEGRATION_DIRS[specifyArgs[2]] ?? '');
      if (specifyArgs[1] === 'install') createIntegration(projectRoot, specifyArgs[2]);
      else rmSync(target, { recursive: true, force: true });
      return ok();
    }
    return forced ? { status: forced, stdout: '', stderr: 'boom' } : ok();
  };

  const fakeFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const tag = /releases\/tags\/v(.+)$/.exec(url)?.[1];
    if (url.endsWith('/releases/latest')) {
      return new Response(JSON.stringify({ tag_name: `v${latest}` }), { status: 200 });
    }
    if (tag && releases.has(tag)) {
      return new Response(JSON.stringify({ tag_name: `v${tag}` }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  return {
    runner,
    confirm: async (question) => {
      questions.push(question);
      return options.confirmAnswer ?? false;
    },
    fetch: fakeFetch,
    platform: 'linux',
    catalog: TOOLKIT_CATALOG,
    calls,
    questions,
    state,
    executed: () => calls
      .filter((command) => !(command.args.length === 1 && command.args[0] === '--version'))
      .map((command) => [command.command, ...command.args].join(' ')),
  };
}

/** Creates the file tree an integration install would produce. */
function createIntegration(projectRoot: string, key: string): void {
  const relative = INTEGRATION_DIRS[key];
  if (!relative) return;
  const target = path.join(projectRoot, relative);
  if (relative.endsWith('.md')) {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '# plan\n');
  } else {
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'SKILL.md'), '# plan\n');
  }
}
