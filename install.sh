#!/bin/bash
# Brain Swarm — Install Script
set -e

SWARM_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Brain Swarm..."

if [ ! -f "$SWARM_DIR/dist/index.js" ]; then
  echo "  Building..."
  cd "$SWARM_DIR" && npm install && npm run build
fi

claude mcp add brain-swarm -s user -- node "$SWARM_DIR/dist/index.js" 2>/dev/null && echo "  Registered brain-swarm MCP server" || echo "  brain-swarm already registered (or claude CLI not found)"

echo ""
echo "Done! Restart Claude Code."
echo ""
echo "  Verify:  claude mcp list | grep swarm"
echo "  Try:     \"Swarm this codebase with the dev team\""
