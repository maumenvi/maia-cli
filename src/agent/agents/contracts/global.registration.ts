import type { ClineGlobalEntry } from '../global/cline.global.entry.contract.ts';

/** Agent config stored outside the project, such as Cline's user-level settings. */
export interface GlobalRegistration {
  /** Returns candidate settings paths in write preference order. */
  candidates(): string[];
  /** Returns the stable key associated with the project root. */
  entryKey(projectRoot: string): string;
  /** Returns the native registration entry for the project root. */
  entry(projectRoot: string): ClineGlobalEntry;
}
