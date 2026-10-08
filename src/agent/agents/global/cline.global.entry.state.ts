/** Read-only view of Cline's registration for one project. */
export interface ClineGlobalEntryState {
  path: string;
  current: boolean;
  stale: string[];
}
