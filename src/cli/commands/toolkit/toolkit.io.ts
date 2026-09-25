import type { ToolkitDefinition } from '../../../agent/toolkits/contracts/toolkit.definition.ts';
import type { ConfirmFn } from './confirm.fn.ts';
import type { NativeRunner } from './native.runner.ts';

/** Every side effect toolkit commands need, injectable for tests. */
export interface ToolkitIo {
  runner: NativeRunner;
  confirm: ConfirmFn;
  fetch: typeof fetch;
  platform: NodeJS.Platform;
  catalog: readonly ToolkitDefinition[];
}
