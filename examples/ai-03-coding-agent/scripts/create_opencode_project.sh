#!/bin/bash

# Create opencode project file if it doesn't exist
set -xe

PROJECT_DIR="/app/.local/share/opencode/storage/project"
PROJECT_FILE_PATH="/app/project"

# Check if any project file already exists
if ! ls "$PROJECT_DIR"/*.json >/dev/null 2>&1; then
  # Generate UUID and timestamp
  UUID=$(openssl rand -hex 20)
  TIMESTAMP=$(date +%s%3N)

  # Create project JSON
  PROJECT_JSON="{\"id\":\"${UUID}\",\"worktree\":\"${PROJECT_FILE_PATH}\",\"vcs\":\"git\",\"sandboxes\":[],\"time\":{\"created\":${TIMESTAMP},\"updated\":${TIMESTAMP}},\"icon\":{\"color\":\"mint\"}}"

  # Write to project file
  echo "$PROJECT_JSON" > "$PROJECT_DIR/${UUID}.json"

  echo "Created opencode project file: $PROJECT_DIR/${UUID}.json"
else
  echo "Opencode project file already exists"
fi