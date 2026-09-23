










/** Defines the web socket ctor type. */
export type WebSocketCtor = new (url: string) => {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: unknown) => void): void;
};
