import type { ToolkitCommand } from '../../../agent/toolkits/contracts/toolkit.command.ts';

/** Renders a command for display, quoting arguments that contain spaces. */
export function formatToolkitCommand({ command, args }: ToolkitCommand): string {
  return [command, ...args].map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(' ');
}
