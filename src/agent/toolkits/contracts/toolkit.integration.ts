/** How a Maia agent maps onto a toolkit's own agent integration. */
export interface ToolkitIntegration {
  key: string;
  /** Whether the toolkit allows this integration alongside others. */
  multiInstallSafe: boolean;
}
