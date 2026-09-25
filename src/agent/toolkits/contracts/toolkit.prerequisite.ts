/** A command that must succeed before a toolkit's native installer can run. */
export interface ToolkitPrerequisite {
  command: string;
  args: string[];
  hint: string;
}
