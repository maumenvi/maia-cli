/** Type declarations for the pure helpers exported by tag-release.mjs. */
export type TagAction = 'refuse-dirty' | 'create' | 'already-at-head' | 'refuse-moved';

export declare function releaseTagName(version: string): string;

export declare function decideTagAction(state: { dirty: boolean; existingSha: string; headSha: string }): TagAction;

export type PublishSkip = 'dry-run' | 'staged';

export declare function decidePublishSkip(env: { npm_config_dry_run?: string; npm_command?: string }): PublishSkip | null;
