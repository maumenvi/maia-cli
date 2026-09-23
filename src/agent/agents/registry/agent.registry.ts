import type { AgentTarget } from '../contracts/agent.target.ts';
import { claude } from './claude.ts';
import { cline } from './cline.ts';
import { codex } from './codex.ts';
import { continueAgent } from './continue.agent.ts';
import { copilot } from './copilot.ts';
import { cursor } from './cursor.ts';
import { zed } from './zed.ts';

/** Defines the agent registry value. */
export const agentRegistry: AgentTarget[] = [claude, copilot, cursor, zed, cline, continueAgent, codex];
