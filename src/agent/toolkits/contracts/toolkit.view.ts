import type { ToolkitScope } from './toolkit.scope.ts';

/** Read-only description of a toolkit, shared by `maia toolkit ls` and the MCP tool. */
export interface ToolkitView {
  name: string;
  title: string;
  description: string;
  docsUrl: string;
  supportsGlobal: boolean;
  installed: boolean;
  version?: string;
  scope?: ToolkitScope;
  integrations?: string[];
  paths?: string[];
  installCommand: string;
}
