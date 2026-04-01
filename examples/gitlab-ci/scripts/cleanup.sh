#!/usr/bin/env bash

# This script cleans up Upsun environments that have been merged with their parent.

set -e -o pipefail

# Config.
if [ -z "$UPSUN_PROJECT_ID" ]; then
  echo >&2 '$UPSUN_PROJECT_ID is required'
  exit 1
fi
if [ -z "$UPSUN_PARENT_ENV" ]; then
  UPSUN_PARENT_ENV=${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-${CI_DEFAULT_BRANCH:-main}}
fi

CLI_COMMAND=${UPSUN_CLI_COMMAND:-upsun}

# Clean up environments if they are merged with their parent.
$CLI_COMMAND environment:delete --no-interaction --project="$UPSUN_PROJECT_ID" --merged --no-wait --exclude-type production,staging --exclude "$UPSUN_PARENT_ENV"
