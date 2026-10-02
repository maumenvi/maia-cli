/** Either the agents to authorize, or the need to ask the user first. */
export type AllowedLlmsDecision = { allowedLlms: string[] } | { ask: true };
