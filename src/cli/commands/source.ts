import { isValidGitSourceUrl } from '../../agent/catalog/source/is-valid-git-source-url.ts';
import type { CommandHandler } from '../contracts/command-handler.ts';
import { parseFlags } from '../shared/flags/parse-flags.ts';

/** Performs the source command operation. */
export const sourceCommand: CommandHandler = async (args, { store }) => {
  const action = args[0];
  if (action === 'add') {
    const alias = args[1];
    const repo = args[2];
    const { flags } = parseFlags(args.slice(3));
    if (!alias || !repo) {
      throw new Error('Usage: maia source add <alias> <repo-url> [--ref <ref>] [--trusted true|false]');
    }
    if (!isValidGitSourceUrl(repo)) {
      throw new Error(`"${repo}" is not a valid Git source URL. Expected a URL starting with https://, git@, ssh://, git://, or ending in .git.`);
    }
    store.addSource(alias, {
      type: 'git',
      url: repo,
      ref: flags.ref ?? 'main',
      trusted: flags.trusted === 'true',
    });
    store.buildLock();
    console.log(`Added source ${alias}`);
    return;
  }

  if (action === 'ls') {
    const manifest = store.loadManifest();
    console.log(JSON.stringify({
      registries: manifest.registries,
      sources: manifest.sources,
    }, null, 2));
    return;
  }

  throw new Error('Usage: maia source add|ls ...');
};
