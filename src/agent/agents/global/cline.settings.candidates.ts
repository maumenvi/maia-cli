import path from 'node:path';
import type { ClineSettingsCandidateInput } from './cline.settings.candidate.input.ts';

const EDITORS = ['Code', 'Code - Insiders', 'VSCodium', 'Cursor', 'Windsurf'] as const;
const EXTENSION_STORAGE = ['User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'];

/** Returns explicit, CLI-data, and common editor locations in preference order. */
export function listClineSettingsCandidates(input: ClineSettingsCandidateInput): string[] {
  const pathApi = input.platform === 'win32' ? path.win32 : path.posix;
  const candidates: string[] = [];
  const explicitPath = input.env.CLINE_MCP_SETTINGS_PATH;
  if (explicitPath) candidates.push(explicitPath);

  const dataDir = input.env.CLINE_DATA_DIR ?? pathApi.join(input.home, '.cline', 'data');
  candidates.push(pathApi.join(dataDir, 'settings', 'cline_mcp_settings.json'));

  const configRoot = input.platform === 'win32'
    ? input.env.APPDATA ?? pathApi.join(input.home, 'AppData', 'Roaming')
    : input.platform === 'darwin'
      ? pathApi.join(input.home, 'Library', 'Application Support')
      : input.env.XDG_CONFIG_HOME ?? pathApi.join(input.home, '.config');
  for (const editor of EDITORS) {
    candidates.push(pathApi.join(configRoot, editor, ...EXTENSION_STORAGE));
  }

  return [...new Set(candidates)];
}
