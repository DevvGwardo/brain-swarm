#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const teamsDir = join(__dirname, '..', 'teams');

// ── Types ──

interface AgentDef {
  role: string;
  color: string;
  delay?: number;
  prompt: string;
}

interface PipelinePhase {
  phase: string;
  agents: string[];
  parallel: boolean;
}

interface TeamDef {
  name: string;
  description: string;
  pipeline: PipelinePhase[];
  agents: Record<string, AgentDef>;
}

// ── Load teams ──

function loadTeams(): Record<string, TeamDef> {
  const teams: Record<string, TeamDef> = {};
  try {
    const files = readdirSync(teamsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const team = JSON.parse(readFileSync(join(teamsDir, file), 'utf8')) as TeamDef;
      teams[team.name] = team;
    }
  } catch { /* teams dir might not exist yet */ }
  return teams;
}

// ── MCP Server ──

const server = new McpServer(
  { name: 'brain-swarm', version: '1.0.0' },
  {
    instructions: `Brain Swarm — Pipeline-Model Agent Orchestration

This server provides team templates for orchestrating multiple Claude Code agents via brain-mcp.
Each team defines agents with specific roles that work in a pipeline: plan → implement → test → review → ship.

WHEN TO USE:
- When the user says "swarm this", "use the dev team", "pipeline", "run a team on this"
- When the user wants structured multi-agent work with defined roles

HOW IT WORKS:
1. swarm_teams — list available team templates
2. swarm_team_info — see the agents and pipeline for a team
3. swarm_launch — get the orchestration prompt for a team + task, then use brain_wake to spawn each agent

The swarm tools generate prompts — you still use brain_wake from brain-mcp to actually spawn the agents.`,
  }
);

server.tool(
  'swarm_teams',
  'List all available team templates with their descriptions.',
  async () => {
    const teams = loadTeams();
    const list = Object.values(teams).map(t => ({
      name: t.name,
      description: t.description,
      agents: Object.keys(t.agents).length,
      phases: t.pipeline.map(p => p.phase),
    }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
    };
  }
);

server.tool(
  'swarm_team_info',
  'Get detailed info about a team — agents, roles, colors, pipeline phases.',
  {
    team: z.string().describe('Team name (e.g. "dev-team", "audit-team")'),
  },
  async ({ team }) => {
    const teams = loadTeams();
    const t = teams[team];
    if (!t) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `Team "${team}" not found. Available: ${Object.keys(teams).join(', ')}` }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(t, null, 2) }],
    };
  }
);

server.tool(
  'swarm_launch',
  'Generate the brain_wake calls needed to launch a team on a task. Returns the agent names, tasks, delays, and layout — you then call brain_wake for each one.',
  {
    team: z.string().describe('Team name (e.g. "dev-team", "audit-team")'),
    task: z.string().describe('The high-level task for the team to work on'),
  },
  async ({ team, task }) => {
    const teams = loadTeams();
    const t = teams[team];
    if (!t) {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `Team "${team}" not found` }) }],
        isError: true,
      };
    }

    const wakeCommands = [];

    for (const phase of t.pipeline) {
      for (const agentName of phase.agents) {
        const agent = t.agents[agentName];
        if (!agent) continue;

        const fullPrompt = [
          `ROLE: ${agent.role}`,
          `TEAM: ${t.name}`,
          `PHASE: ${phase.phase}`,
          ``,
          `TASK CONTEXT:`,
          task,
          ``,
          `YOUR INSTRUCTIONS:`,
          agent.prompt,
          ``,
          `PIPELINE RULES:`,
          `- You are part of a ${Object.keys(t.agents).length}-agent team`,
          `- Use brain_claim before editing files, brain_release when done`,
          `- Post your results to the brain with brain_post so the next phase can read them`,
          `- Read brain messages from previous phases with brain_read before starting`,
          agent.delay ? `- Wait ${agent.delay} seconds before starting (let previous phase finish)` : '',
        ].filter(Boolean).join('\n');

        wakeCommands.push({
          name: agentName,
          role: agent.role,
          color: agent.color,
          phase: phase.phase,
          parallel: phase.parallel,
          delay: agent.delay || 0,
          task: fullPrompt,
          brain_wake_call: `brain_wake(name="${agentName}", task="...${agent.role} instructions...")`,
        });
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          team: t.name,
          description: t.description,
          pipeline: t.pipeline.map(p => `${p.phase}: ${p.agents.join(' + ')}${p.parallel ? ' (parallel)' : ''}`),
          agents: wakeCommands,
          instructions: [
            `Launch these ${wakeCommands.length} agents using brain_wake with layout "tiled":`,
            ...wakeCommands.map(w => `  brain_wake(name="${w.name}", task=<the task field above>)`),
            ``,
            `The agents will self-coordinate via brain timing (delays) and brain_read/brain_post.`,
          ].join('\n'),
        }, null, 2),
      }],
    };
  }
);

// ── Start ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Brain Swarm MCP server failed:', err);
  process.exit(1);
});
