import { inputValue } from './input.value.ts';
import type { RegistryInput } from './registry.input.ts';

/** Performs the input map operation. */
export function inputMap(serverName: string, inputs: RegistryInput[] = []): Record<string, string> {
  return Object.fromEntries(
    inputs
      .filter((input): input is RegistryInput & { name: string } => Boolean(input.name))
      .map((input) => [input.name, inputValue(serverName, input)]),
  );
}
