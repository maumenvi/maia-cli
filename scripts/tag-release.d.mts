/** Type declarations for the pure helpers exported by tag-release.mjs. */
export type TagAction = 'refuse-dirty' | 'create' | 'already-at-head' | 'refuse-moved';

export declare function releaseTagName(version: string): string;

export declare function decideTagAction(state: { dirty: boolean; existingSha: string; headSha: string }): TagAction;
