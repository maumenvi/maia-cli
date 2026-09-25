import { TOOLKIT_CATALOG } from '../../../agent/toolkits/catalog/toolkit.catalog.ts';
import { promptConfirm } from './prompt.confirm.ts';
import { runNativeCommand } from './run.native.command.ts';
import type { ToolkitIo } from './toolkit.io.ts';

/** Real process, terminal, network and catalog used outside tests. */
export const defaultToolkitIo: ToolkitIo = {
  runner: runNativeCommand,
  confirm: promptConfirm,
  fetch: (...args) => fetch(...args),
  platform: process.platform,
  catalog: TOOLKIT_CATALOG,
};
