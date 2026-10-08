/** A legacy Maia proxy location that can be safely cleaned up during registration. */
export interface LegacyProxyLocation {
  path: string;
  format: 'mcp-servers' | 'servers' | 'zed-settings' | 'toml-mcp-servers';
}
