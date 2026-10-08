import type { AgentRegistration } from '../../../agent/agents/contracts/agent.registration.ts';

/** Summary of the read-only Cline settings scan. */
export interface ClineRegistrationInspection {
  registration: AgentRegistration;
  candidatePaths: string[];
  entryKey: string;
  staleKeys: string[];
  invalidSettings: boolean;
}
