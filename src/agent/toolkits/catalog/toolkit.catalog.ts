import type { ToolkitDefinition } from '../contracts/toolkit.definition.ts';
import { SPECKIT_TOOLKIT } from './speckit.ts';

/** Maia's built-in, curated toolkit catalog (FR-003); user-defined toolkits are out of scope. */
export const TOOLKIT_CATALOG: readonly ToolkitDefinition[] = [SPECKIT_TOOLKIT];
