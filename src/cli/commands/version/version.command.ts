import { readMaiaPackageVersion } from '../../../shared/package/read.maia.package.version.ts';
import type { CommandHandler } from '../../contracts/command.handler.ts';

/** Performs the version command operation. */
export const versionCommand: CommandHandler = async () => {
  console.log(readMaiaPackageVersion());
};
