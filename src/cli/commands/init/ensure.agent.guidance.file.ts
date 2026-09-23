import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { AGENT_GUIDANCE_MARKER } from './agent.guidance.marker.ts';
import { AGENT_GUIDANCE_TEXT } from './agent.guidance.text.ts';

/** Performs the ensure agent guidance file operation. */
export function ensureAgentGuidanceFile(targetPath: string): void {
  const template = AGENT_GUIDANCE_TEXT;
  const fileExists = existsSync(targetPath);
  const current = fileExists ? readFileSync(targetPath, 'utf8') : '';

  if (!current.includes(AGENT_GUIDANCE_MARKER)) {
    const next = fileExists ? `${current.trimEnd()}\n\n${template}\n` : `${template}\n`;
    writeFileSync(targetPath, next, 'utf8');
    return;
  }

  const replacement = new RegExp(`${AGENT_GUIDANCE_MARKER}[\\s\\S]*?(?=\\n*# |$)`, 'm');
  const updated = current.replace(replacement, template.trim());
  writeFileSync(targetPath, updated, 'utf8');
}
