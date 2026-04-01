#!/usr/bin/env bash

# This script deletes a specific Upsun environment.

set -e -o pipefail

# Config.
if [ -z "$UPSUN_PROJECT_ID" ]; then
  echo >&2 '$UPSUN_PROJECT_ID is required'
  exit 1
fi
BRANCH=${UPSUN_TARGET_BRANCH:-$CI_COMMIT_REF_SLUG}
if [ -z "$BRANCH" ]; then
  echo >&2 'Branch name ($UPSUN_TARGET_BRANCH or $CI_COMMIT_REF_SLUG) not defined'
  exit 1
fi

CLI_COMMAND=${UPSUN_CLI_COMMAND:-upsun}

$CLI_COMMAND environment:delete --no-interaction --no-wait --project="$UPSUN_PROJECT_ID" --environment="$BRANCH"
