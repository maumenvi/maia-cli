
/** Coordinates the mcp message decoder behavior. */
export class McpMessageDecoder {
  private buffer = '';

  /** Performs the push operation. */
  push(chunk: Buffer): unknown[] {
    this.buffer += chunk.toString('utf8');
    const messages: unknown[] = [];

    let lineEnd = this.buffer.indexOf('\n');
    while (lineEnd !== -1) {
      const line = this.buffer.substring(0, lineEnd).trim();
      if (line.length > 0) {
        try {
          const payload = JSON.parse(line);
          messages.push(payload);
        } catch (err) {
          console.error('Failed to parse MCP message:', line, err);
        }
      }
      this.buffer = this.buffer.substring(lineEnd + 1);
      lineEnd = this.buffer.indexOf('\n');
    }

    return messages;
  }
}
