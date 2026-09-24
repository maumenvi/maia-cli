/** A native installer invocation as argv; never a shell string. */
export interface ToolkitCommand {
  command: string;
  args: string[];
}
