



/** Describes the app config contract. */
export interface AppConfig {
  catalog: {
    skillsRegistryUrl: string;
    mcpRegistryUrl: string;
  };
  paths: {
    rootDir: string;
    skillsRoot: string;
    toolsRoot: string;
    mcpRoot: string;
  };
}
