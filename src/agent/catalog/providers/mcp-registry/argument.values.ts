import type { RegistryArgument } from './registry.argument.ts';

/** Performs the argument values operation. */
export function argumentValues(argumentsList: RegistryArgument[] = []): string[] {
  return argumentsList.flatMap((argument) => {
    const value = argument.value ?? argument.default;
    if (!value) {
      return [];
    }
    if (argument.type === 'named' && argument.name) {
      return [argument.name.includes('{value}') ? argument.name.replace('{value}', value) : `${argument.name}=${value}`];
    }
    return [value];
  });
}
