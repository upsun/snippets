#!/usr/bin/env bash

# This script can be used from GitLab CI to push code to an Upsun environment.
# It always force-pushes and activates the environment.

set -e -o pipefail

# Config.
if [ -z "$UPSUN_PROJECT_ID" ]; then
  echo >&2 '$UPSUN_PROJECT_ID is required'
  exit 1
fi
BRANCH=${UPSUN_TARGET_BRANCH:-$CI_COMMIT_REF_SLUG}
if [ -z "$BRANCH" ]; then
  echo >&2 'Target branch ($UPSUN_TARGET_BRANCH or $CI_COMMIT_REF_SLUG) not defined'
  exit 1
fi
UPSUN_PARENT_ENV=${UPSUN_PARENT_ENV:-$CI_MERGE_REQUEST_TARGET_BRANCH_NAME}
if [ -z "$UPSUN_PARENT_ENV" ]; then
  UPSUN_PARENT_ENV=${CI_DEFAULT_BRANCH:-main}
fi

CLI_COMMAND=${UPSUN_CLI_COMMAND:-upsun}

$CLI_COMMAND project:set-remote --no-interaction "$UPSUN_PROJECT_ID"

# Build and run the push command.
push_command="$CLI_COMMAND push --no-interaction --force --target=${BRANCH}"
if [ "$UPSUN_PARENT_ENV" != "$BRANCH" ]; then
  push_command="$push_command --activate --parent=${UPSUN_PARENT_ENV}"
  if [ "$BRANCH" != main ]; then
    push_command="$push_command --resources-init=default"
  fi
fi
if [ -n "$UPSUN_NO_CLONE_PARENT" ]; then
  push_command="$push_command --no-clone-parent"
fi

$push_command

# Write the environment's primary URL to a dotenv file.
# This can be used by a GitLab job via the "dotenv" artifact type.
echo "PRIMARY_URL=$($CLI_COMMAND url --primary --pipe --no-interaction --environment="$BRANCH")" > environment.env
