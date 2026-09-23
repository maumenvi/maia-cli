




/** Performs the order by platform operation. */
export function orderByPlatform(paths: { linux?: string; darwin?: string; win32?: string }): string[] {
  const preferred = paths[process.platform as keyof typeof paths];
  const all = [preferred, paths.linux, paths.darwin, paths.win32].filter((value): value is string => Boolean(value));
  return [...new Set(all)];
}
