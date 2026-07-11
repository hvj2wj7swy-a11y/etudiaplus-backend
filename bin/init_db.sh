#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "⚙️  Initialisation PostgreSQL idempotente..."
node "$ROOT_DIR/bin/init_db.js"
echo "Terminé."
