import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { listClineSettingsCandidates } from '../../../src/agent/agents/global/cline.settings.candidates.ts';

describe('listClineSettingsCandidates', () => {
  it('returns explicit, Cline data, and existing-editor candidate paths in order without duplicates', () => {
    const candidates = listClineSettingsCandidates({
      env: {
        CLINE_MCP_SETTINGS_PATH: '/custom/cline.json',
        CLINE_DATA_DIR: '/custom/cline-data',
        XDG_CONFIG_HOME: '/custom/config',
      },
      home: '/home/test',
      platform: 'linux',
    });

    assert.deepEqual(candidates, [
      '/custom/cline.json',
      '/custom/cline-data/settings/cline_mcp_settings.json',
      ...['Code', 'Code - Insiders', 'VSCodium', 'Cursor', 'Windsurf'].map((editor) =>
        path.join('/custom/config', editor, 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json')),
    ]);
  });

  it('uses platform-specific editor data directories', () => {
    const mac = listClineSettingsCandidates({ env: {}, home: '/Users/test', platform: 'darwin' });
    const win = listClineSettingsCandidates({
      env: { APPDATA: 'C:\\Users\\test\\Roaming' },
      home: 'C:\\Users\\test',
      platform: 'win32',
    });

    assert.ok(mac.some((candidate) => candidate.startsWith('/Users/test/Library/Application Support/Code/')));
    assert.ok(win.some((candidate) => candidate.startsWith('C:\\Users\\test\\Roaming\\Code\\')));
  });
});
