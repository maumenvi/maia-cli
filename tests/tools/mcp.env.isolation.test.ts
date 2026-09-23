import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertRequiredEnv } from '../../src/agent/mcp/runtime/transport/stdio/assert.required.env.ts';
import { collectReferencedEnvNames } from '../../src/agent/mcp/runtime/transport/stdio/collect.referenced.env.names.ts';
import { redactSecretsFromStream } from '../../src/agent/mcp/runtime/transport/stdio/redact.secrets.from.stream.ts';

describe('redactSecretsFromStream', () => {
  it('replaces an injected secret with its variable name', () => {
    const text = 'starting with token=super-secret-token-value done';
    const result = redactSecretsFromStream(text, { API_TOKEN: 'super-secret-token-value' });

    assert.equal(result.includes('super-secret-token-value'), false);
    assert.match(result, /\[REDACTED:API_TOKEN\]/);
  });

  it('leaves values shorter than 8 characters untouched', () => {
    const text = 'mode=dev and level=3';
    const result = redactSecretsFromStream(text, { MODE: 'dev', LEVEL: '3' });

    assert.equal(result, text);
  });

  it('passes through text containing no injected value', () => {
    const text = 'server listening on stdio, no credentials here';
    const result = redactSecretsFromStream(text, { API_TOKEN: 'super-secret-token-value' });

    assert.equal(result, text);
  });

  it('redacts every occurrence of a repeated value', () => {
    const secret = 'super-secret-token-value';
    const text = `first=${secret} second=${secret} third=${secret}`;
    const result = redactSecretsFromStream(text, { API_TOKEN: secret });

    assert.equal(result.includes(secret), false);
    assert.equal(result.split('[REDACTED:API_TOKEN]').length - 1, 3);
  });

  it('redacts values from several variables in one chunk', () => {
    const text = 'a=aaaaaaaaaaaa b=bbbbbbbbbbbb';
    const result = redactSecretsFromStream(text, { FIRST: 'aaaaaaaaaaaa', SECOND: 'bbbbbbbbbbbb' });

    assert.equal(result, 'a=[REDACTED:FIRST] b=[REDACTED:SECOND]');
  });
});

describe('collectReferencedEnvNames', () => {
  it('collects names from the ${env:NAME} syntax', () => {
    assert.deepEqual(collectReferencedEnvNames('${env:API_TOKEN}'), ['API_TOKEN']);
  });

  it('collects names from the bare {NAME} syntax', () => {
    assert.deepEqual(collectReferencedEnvNames('{API_TOKEN}'), ['API_TOKEN']);
  });

  it('collects every name in a composite value', () => {
    assert.deepEqual(
      collectReferencedEnvNames('${env:FIRST}/and/{SECOND}'),
      ['FIRST', 'SECOND'],
    );
  });

  it('returns nothing for a value with no placeholder', () => {
    assert.deepEqual(collectReferencedEnvNames('plain-literal-value'), []);
  });
});

describe('assertRequiredEnv', () => {
  const previous: Record<string, string | undefined> = {};

  function setEnv(name: string, value: string | undefined): void {
    if (!(name in previous)) previous[name] = process.env[name];
    if (typeof value === 'undefined') delete process.env[name];
    else process.env[name] = value;
  }

  function restoreEnv(): void {
    for (const [name, value] of Object.entries(previous)) {
      if (typeof value === 'undefined') delete process.env[name];
      else process.env[name] = value;
    }
  }

  it('names the single missing variable', () => {
    setEnv('MAIA_TEST_MISSING_ONE', undefined);
    try {
      assert.throws(
        () => assertRequiredEnv({ TOKEN: '${env:MAIA_TEST_MISSING_ONE}' }),
        /MAIA_TEST_MISSING_ONE/,
      );
    } finally {
      restoreEnv();
    }
  });

  it('reports all missing variables in one message', () => {
    for (const name of ['MAIA_TEST_MISS_A', 'MAIA_TEST_MISS_B', 'MAIA_TEST_MISS_C']) {
      setEnv(name, undefined);
    }
    try {
      let message = '';
      try {
        assertRequiredEnv({
          A: '${env:MAIA_TEST_MISS_A}',
          B: '${env:MAIA_TEST_MISS_B}',
          C: '${env:MAIA_TEST_MISS_C}',
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      assert.match(message, /MAIA_TEST_MISS_A/);
      assert.match(message, /MAIA_TEST_MISS_B/);
      assert.match(message, /MAIA_TEST_MISS_C/);
    } finally {
      restoreEnv();
    }
  });

  it('treats a present but empty variable as missing', () => {
    setEnv('MAIA_TEST_EMPTY', '');
    try {
      assert.throws(
        () => assertRequiredEnv({ TOKEN: '${env:MAIA_TEST_EMPTY}' }),
        /MAIA_TEST_EMPTY/,
      );
    } finally {
      restoreEnv();
    }
  });

  it('never puts a resolved value in the error message', () => {
    setEnv('MAIA_TEST_PRESENT', 'super-secret-token-value');
    setEnv('MAIA_TEST_ABSENT', undefined);
    try {
      let message = '';
      try {
        assertRequiredEnv({
          PRESENT: '${env:MAIA_TEST_PRESENT}',
          ABSENT: '${env:MAIA_TEST_ABSENT}',
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      assert.equal(message.includes('super-secret-token-value'), false);
      assert.match(message, /MAIA_TEST_ABSENT/);
    } finally {
      restoreEnv();
    }
  });

  it('passes when every referenced variable resolves', () => {
    setEnv('MAIA_TEST_OK', 'a-value');
    try {
      assert.doesNotThrow(() => assertRequiredEnv({ TOKEN: '${env:MAIA_TEST_OK}' }));
    } finally {
      restoreEnv();
    }
  });

  it('passes when the config declares no variables', () => {
    assert.doesNotThrow(() => assertRequiredEnv(undefined));
    assert.doesNotThrow(() => assertRequiredEnv({}));
  });
});
