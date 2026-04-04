<div align="center">

<br>

# Brain Swarm

**Pipeline-model agent orchestration for Claude Code**

Define teams of specialized agents. Launch them in parallel.<br>Watch them plan, build, test, review, and ship — all coordinated through [Brain MCP](https://github.com/DevvGwardo/brain-mcp).

<br>

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-7C3AED)](https://modelcontextprotocol.io)
[![Requires Brain MCP](https://img.shields.io/badge/Requires-Brain_MCP-9333EA)](https://github.com/DevvGwardo/brain-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/DevvGwardo/brain-swarm?style=flat&logo=github)](https://github.com/DevvGwardo/brain-swarm)

<br>

[Install](#install) · [Teams](#teams) · [Pipeline Model](#pipeline-model) · [Custom Teams](#custom-teams) · [How It Works](#how-it-works)

<br>

</div>

---

## Install

**Requires [Brain MCP](https://github.com/DevvGwardo/brain-mcp)** — install it first if you haven't.

```bash
git clone https://github.com/DevvGwardo/brain-swarm.git ~/brain-swarm && cd ~/brain-swarm && npm install && npm run build && ./install.sh
```

Restart Claude Code. Done.

---

## Usage

Just say what you want:

```
Swarm this codebase with the dev team
```

```
Run the audit team on this project
```

```
Launch the dev team to add authentication to this app
```

Claude reads the team template, spawns 6 agents in tmux split panes, and they work through the pipeline automatically.

---

## Pipeline Model

Each team runs as a **pipeline** — agents execute in phases, with each phase feeding into the next:

```mermaid
graph LR
    subgraph "Phase 1: Plan"
        P["Planner"]
    end

    subgraph "Phase 2: Implement"
        B["Backend Dev"]
        F["Frontend Dev"]
    end

    subgraph "Phase 3: Quality"
        T["Tester"]
        R["Reviewer"]
    end

    subgraph "Phase 4: Ship"
        D["Deployer"]
    end

    P -->|plan posted to brain| B
    P -->|plan posted to brain| F
    B -->|changes posted| T
    F -->|changes posted| T
    B -->|changes posted| R
    F -->|changes posted| R
    T -->|results posted| D
    R -->|review posted| D

    style P fill:#3B82F6,stroke:#2563EB,color:#fff
    style B fill:#10B981,stroke:#059669,color:#fff
    style F fill:#F59E0B,stroke:#D97706,color:#000
    style T fill:#EF4444,stroke:#DC2626,color:#fff
    style R fill:#8B5CF6,stroke:#7C3AED,color:#fff
    style D fill:#EC4899,stroke:#DB2777,color:#fff
```

<div align="center">

**Parallel within phases, sequential across phases.**<br>
Agents self-coordinate through timed delays and brain messaging.

</div>

---

## Teams

### Dev Team

6-agent full-stack development pipeline.

| Agent | Role | Phase | Color |
|:------|:-----|:------|:------|
| `planner` | Analyzes task, creates implementation plan | Plan | Blue |
| `backend-dev` | Implements API/server changes | Implement | Emerald |
| `frontend-dev` | Implements UI/component changes | Implement | Amber |
| `tester` | Writes and runs tests | Quality | Red |
| `reviewer` | Reviews all code changes | Quality | Violet |
| `deployer` | Runs build, generates report | Ship | Pink |

### Audit Team

6-agent security and quality audit pipeline.

| Agent | Role | Phase | Color |
|:------|:-----|:------|:------|
| `security-scanner` | OWASP top 10 vulnerability scan | Scan | Red |
| `type-checker` | TypeScript type safety audit | Scan | Blue |
| `perf-auditor` | Performance and optimization audit | Scan | Amber |
| `fixer` | Fixes top issues from each scanner | Fix | Emerald |
| `verifier` | Verifies fixes are correct | Verify | Violet |
| `reporter` | Generates comprehensive audit report | Verify | Pink |

---

## How It Works

```mermaid
sequenceDiagram
    participant User
    participant Lead as Lead Agent
    participant Swarm as Brain Swarm MCP
    participant Brain as Brain MCP
    participant Agents as Agent Panes

    User->>Lead: "Swarm this with the dev team"
    Lead->>Swarm: swarm_launch(team, task)
    Swarm-->>Lead: Agent configs + prompts

    Lead->>Brain: brain_register("lead")
    Lead->>Brain: brain_set("plan-context", ...)

    loop For each agent
        Lead->>Brain: brain_wake(name, task)
        Brain-->>Agents: Spawns tmux pane
    end

    Note over Agents: Phase 1 — Planner works
    Agents->>Brain: brain_post("plan ready")

    Note over Agents: Phase 2 — Devs work in parallel
    Agents->>Brain: brain_claim(files)
    Agents->>Brain: brain_post("changes done")
    Agents->>Brain: brain_release(files)

    Note over Agents: Phase 3 — Test + Review
    Agents->>Brain: brain_read() → see changes
    Agents->>Brain: brain_post("tests pass / review done")

    Note over Agents: Phase 4 — Deploy
    Agents->>Brain: brain_read() → full report
    Agents->>Brain: brain_post("build OK, report ready")

    Lead->>Brain: brain_read() → final summary
    Lead-->>User: All phases complete
```

### The Pipeline Loop

Agents coordinate through **timing and brain messaging**:

1. **Phase 1** agents start immediately
2. **Phase 2** agents wait (delay) for Phase 1 to finish, then read the brain
3. **Phase 3** agents wait longer, then read all previous results
4. **Phase 4** agents wait longest, then compile everything

Each agent:
- Reads previous phase results via `brain_read`
- Claims files with `brain_claim` (prevents conflicts)
- Posts its work to the brain with `brain_post`
- Releases files with `brain_release`

---

## Custom Teams

Create your own team by adding a JSON file to `~/brain-swarm/teams/`:

```json
{
  "name": "my-team",
  "description": "Custom 4-agent team",
  "pipeline": [
    { "phase": "analyze", "agents": ["scanner"], "parallel": false },
    { "phase": "fix", "agents": ["fixer-a", "fixer-b"], "parallel": true },
    { "phase": "verify", "agents": ["checker"], "parallel": false }
  ],
  "agents": {
    "scanner": {
      "role": "Code Scanner",
      "color": "#3B82F6",
      "prompt": "Scan the codebase for issues..."
    },
    "fixer-a": {
      "role": "Fixer A",
      "color": "#10B981",
      "delay": 30,
      "prompt": "Fix backend issues found by scanner..."
    },
    "fixer-b": {
      "role": "Fixer B",
      "color": "#F59E0B",
      "delay": 30,
      "prompt": "Fix frontend issues found by scanner..."
    },
    "checker": {
      "role": "Verification",
      "color": "#8B5CF6",
      "delay": 90,
      "prompt": "Verify all fixes are correct..."
    }
  }
}
```

Fields:
- `delay` — seconds to wait before starting (lets previous phase finish)
- `color` — hex color for the tmux pane border
- `parallel` — whether agents in this phase run simultaneously

---

## Architecture

```
┌──────────────────────────────────────────┐
│              Brain Swarm MCP             │
│  (team templates + orchestration logic)  │
└────────────────┬─────────────────────────┘
                 │ swarm_launch → agent configs
                 ▼
┌──────────────────────────────────────────┐
│               Brain MCP                  │
│  (communication + coordination layer)    │
│                                          │
│  brain_wake → spawns tmux panes          │
│  brain_post/read → messaging             │
│  brain_claim/release → file locking      │
│  brain_set/get → shared state            │
└────────────────┬─────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Agent 1│ │ Agent 2│ │ Agent 3│  ...
│ (tmux) │ │ (tmux) │ │ (tmux) │
└────────┘ └────────┘ └────────┘
```

---

<div align="center">

<br>

Node.js 18+ &nbsp;&middot;&nbsp; [Brain MCP](https://github.com/DevvGwardo/brain-mcp) &nbsp;&middot;&nbsp; tmux &nbsp;&middot;&nbsp; Claude Code

[MIT License](LICENSE)

<br>

</div>
