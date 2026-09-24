/** Result of running one native toolkit command. */
export interface NativeRunResult {
  status: number;
  stdout: string;
  stderr: string;
}
