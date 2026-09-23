import { ACCESS_DEFAULT_ALLOW } from './access.default.allow.ts';
import { ACCESS_DEFAULT_DENY } from './access.default.deny.ts';

/** Defines the access default policy type. */
export type AccessDefaultPolicy = typeof ACCESS_DEFAULT_ALLOW | typeof ACCESS_DEFAULT_DENY;
