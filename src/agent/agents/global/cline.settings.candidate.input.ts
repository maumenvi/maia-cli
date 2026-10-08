/** Inputs needed to resolve Cline settings on a specific platform. */
export interface ClineSettingsCandidateInput {
  env: NodeJS.ProcessEnv;
  home: string;
  platform: NodeJS.Platform;
}
