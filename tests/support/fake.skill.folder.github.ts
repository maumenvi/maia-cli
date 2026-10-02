const COMMIT = '0123456789abcdef0123456789abcdef01234567';

/**
 * A fake GitHub serving one repository (`acme/skills`) whose skill folder
 * `skills/<name>/` holds `files`. Returns the fetch to install as globalThis.fetch.
 */
export function fakeSkillFolderGitHub(name: string, files: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === 'https://api.github.com/repos/acme/skills') return Response.json({ default_branch: 'main' });
    if (url === 'https://api.github.com/repos/acme/skills/commits/main') return Response.json({ sha: COMMIT });
    if (url.startsWith(`https://api.github.com/repos/acme/skills/git/trees/${COMMIT}`)) {
      return Response.json({ tree: files.map((file) => ({ type: 'blob', mode: '100644', path: `skills/${name}/${file}` })) });
    }
    const raw = `https://raw.githubusercontent.com/acme/skills/${COMMIT}/skills/${name}/`;
    if (url.startsWith(raw)) return new Response(`# ${url.slice(raw.length)}`);
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
}
