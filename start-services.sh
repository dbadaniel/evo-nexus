#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"
cd /mnt/d/ExpertSA DEV/evo-nexus

# Kill existing services
pkill -f 'terminal-server/bin/server.js' 2>/dev/null
pkill -f 'dashboard/backend.*app.py' 2>/dev/null
sleep 1

# Clean stale sessions — old sessions cause agent persona issues
rm -f $HOME/.claude-code-web/sessions.json 2>/dev/null

# Start terminal-server (must run FROM the project root for agent discovery)
nohup node dashboard/terminal-server/bin/server.js > /mnt/d/ExpertSA DEV/evo-nexus/logs/terminal-server.log 2>&1 &

# Start Flask dashboard
cd dashboard/backend
nohup /mnt/d/ExpertSA DEV/evo-nexus/.venv/bin/python app.py > /mnt/d/ExpertSA DEV/evo-nexus/logs/dashboard.log 2>&1 &
