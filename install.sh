#!/bin/bash
set -e

SWARM_DIR="$(cd "$(dirname "$0")" && pwd)"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo "Installing Brain Swarm..."

if [ ! -f "$SWARM_DIR/dist/index.ts" ] || [ "$SWARM_DIR/src/index.ts" -nt "$SWARM_DIR/dist/index.js" ]; then
  echo "  Building..."
  cd "$SWARM_DIR" && npm install && npm run build
fi

mkdir -p "$HOME/.claude"
[ -f "$SETTINGS_FILE" ] || echo '{}' > "$SETTINGS_FILE"

node -e "
const fs = require('fs');
const path = '$SETTINGS_FILE';
const swarmPath = '$SWARM_DIR/dist/index.js';
const settings = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!settings.mcpServers) settings.mcpServers = {};
settings.mcpServers['brain-swarm'] = {
  command: 'node',
  args: [swarmPath],
  env: { PATH: [process.env.HOME + '/.local/bin', '/usr/local/bin', '/usr/bin', '/bin', '/opt/homebrew/bin'].join(':') }
};
if (!settings.permissions) settings.permissions = {};
if (!settings.permissions.allow) settings.permissions.allow = [];
if (!settings.permissions.allow.includes('mcp__brain-swarm')) {
  settings.permissions.allow.push('mcp__brain-swarm');
}
fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
console.log('  Added brain-swarm MCP to settings');
"

echo ""
echo "Done! Restart Claude Code."
echo "  Try: \"Swarm this codebase with the dev team\""
