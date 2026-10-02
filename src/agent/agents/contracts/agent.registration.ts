/** Outcome of registering the Maia proxy in one agent's config file. */
export type AgentRegistration =
  | { status: 'registered'; configPath: string }
  | { status: 'skipped'; reason: string };
