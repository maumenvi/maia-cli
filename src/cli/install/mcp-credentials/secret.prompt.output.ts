import { Writable } from 'node:stream';

/** Coordinates the secret prompt output behavior. */
export class SecretPromptOutput extends Writable {
  readonly isTTY = true;
  readonly columns = process.stdout.columns ?? 80;
  private muted = false;

  /** Performs the set muted operation. */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Performs the write operation. */
  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.muted) {
      callback();
      return;
    }
    process.stdout.write(chunk, encoding, callback);
  }
}
