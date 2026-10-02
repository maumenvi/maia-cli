/** Upper bounds for one skill folder, so a remote source cannot flood the project. */
export const SKILL_SIZE_LIMITS = { maxFiles: 200, maxBytes: 5 * 1024 * 1024 } as const;
