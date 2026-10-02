import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { resolveGlobalConfigDir } from '../../src/config/core/resolve.global.config.dir.ts';

describe('resolveGlobalConfigDir', () => {
  it('honours MAIA_CONFIG_HOME first', () => {
    assert.equal(resolveGlobalConfigDir({ MAIA_CONFIG_HOME: '/x/maia', XDG_CONFIG_HOME: '/y' }, 'linux', '/home/u'), '/x/maia');
  });

  it('uses XDG_CONFIG_HOME, then ~/.config, on POSIX', () => {
    assert.equal(resolveGlobalConfigDir({ XDG_CONFIG_HOME: '/xdg' }, 'linux', '/home/u'), path.join('/xdg', 'maia'));
    assert.equal(resolveGlobalConfigDir({}, 'darwin', '/home/u'), path.join('/home/u', '.config', 'maia'));
  });

  it('uses APPDATA on Windows', () => {
    assert.equal(resolveGlobalConfigDir({ APPDATA: 'C:\\Users\\u\\AppData\\Roaming' }, 'win32', 'C:\\Users\\u'), path.join('C:\\Users\\u\\AppData\\Roaming', 'maia'));
  });

  it('never resolves to ~/.maia', () => {
    for (const platform of ['linux', 'darwin', 'win32'] as const) {
      assert.equal(resolveGlobalConfigDir({}, platform, '/home/u').endsWith(`${path.sep}.maia`), false);
    }
  });
});
