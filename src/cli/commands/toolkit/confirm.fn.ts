/** Asks the user a yes/no question; resolves false when it cannot ask. */
export type ConfirmFn = (question: string) => Promise<boolean>;
