import { ACCESS_ALL } from './access.all.ts';

/** Performs the list allows value operation. */
export function listAllowsValue(list: string[], value: string): boolean {
  return list.includes(ACCESS_ALL) || list.includes(value);
}
