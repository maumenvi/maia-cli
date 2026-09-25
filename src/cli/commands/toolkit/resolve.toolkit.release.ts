import { createGitHubHeaders } from '../../../agent/catalog/providers/github/create.git.hub.headers.ts';
import type { ToolkitDefinition } from '../../../agent/toolkits/contracts/toolkit.definition.ts';
import { normalizeToolkitVersion } from '../../../agent/toolkits/plan/normalize.toolkit.version.ts';
import { parseRequestedVersion } from '../../../agent/toolkits/plan/parse.requested.version.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** HTTP status GitHub returns for a release tag that does not exist. */
const NOT_FOUND = 404;

/**
 * Resolves the exact version to install: the latest stable release when
 * none is requested, or the requested one after checking it exists
 * (research D4). Drafts and pre-releases never count as "latest".
 */
export async function resolveToolkitRelease(
  definition: ToolkitDefinition,
  requested: string | undefined,
  io: Pick<ToolkitIo, 'fetch'>,
): Promise<string> {
  const repository = new URL(definition.repository).pathname.replace(/^\/|\.git$/g, '');
  const version = requested === undefined ? undefined : parseRequestedVersion(requested);
  const endpoint = version === undefined ? 'releases/latest' : `releases/tags/v${version}`;

  let response: Response;
  try {
    response = await io.fetch(`https://api.github.com/repos/${repository}/${endpoint}`, {
      headers: createGitHubHeaders(),
    });
  } catch (error) {
    throw new Error(`Unable to resolve ${definition.name} release: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (version !== undefined && response.status === NOT_FOUND) {
    throw new Error(`Toolkit ${definition.name} has no release v${version}`);
  }
  if (!response.ok) {
    throw new Error(`Unable to resolve ${definition.name} release: HTTP ${response.status}`);
  }

  const { tag_name: tagName } = await response.json() as { tag_name?: string };
  const resolved = tagName ? normalizeToolkitVersion(tagName) : null;
  if (!resolved) {
    throw new Error(`Unable to resolve ${definition.name} release: unexpected tag "${tagName ?? ''}"`);
  }
  return resolved;
}
