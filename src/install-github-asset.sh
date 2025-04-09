#!/bin/bash
# This generic script install a $GITHUB_ORG/$TOOL_NAME (corresponding asset) in the $PLATFORM_APP_DIR/bin folder of your app container
# in the "hooks.build" of your Upsun/Platform.sh YAML configuration, add the following:
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "<org/repo>" "[<release_version>]" "[<asset_name>]"
# examples: 
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "jgm/pandoc"
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "mikefarah/yq" "v4.45.1"
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "dunglas/frankenphp" "1.5.0" "frankenphp-linux-x86_64-gnu"
# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

RED='\033[0;31m'
RED_BOLD='\033[01;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
GREEN_BOLD='\033[01;32m'
NC='\033[0m'

# if envVar GITHUB_API_TOKEN is empty, only public repo can be accessed
if [ -n "$GITHUB_API_TOKEN" ]; then
  AUTH_HEADER="Authorization: Bearer $GITHUB_API_TOKEN"
else
  AUTH_HEADER=""
fi

run() {
  # Run the compilation process.
  cd $PLATFORM_CACHE_DIR || exit 1

  if [ -z "${ASSET_NAME_PARAM}" ] && [ ! -f "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${TOOL_NAME}" ] ||
     [ -n "${ASSET_NAME_PARAM}" ] && [ ! -f "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}/${TOOL_NAME}" ]; then
    ensure_source
    download_binary
    move_binary
  fi

  copy_lib "$TOOL_NAME" "$TOOL_VERSION"
  
  printf "✅ ${GREEN}$TOOL_NAME installation successful${NC}\n"

  echo "use it with command: $TOOL_NAME"
}

ensure_source() {
  echo "--------------------------------------------------------------------------------------"
  printf " ${GREEN}Ensuring that the $TOOL_NAME/$TOOL_VERSION binary folder is available and up to date${NC}\n"
  echo "--------------------------------------------------------------------------------------"

  mkdir -p "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION"

  cd "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION" || exit 1
  printf "✅ Success\n"
}

download_binary() {
  echo "--------------------------------------------------------------------------------------"
  printf " ${GREEN}Downloading $TOOL_NAME binary (version $TOOL_VERSION) source code${NC}\n"
  echo "--------------------------------------------------------------------------------------"

  get_asset_id

  curl -L \
    -H "Accept: application/octet-stream" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases/assets/$ASSET_ID" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -o "$TOOL_NAME-asset"
  
  # Extract accordingly
  case "$ASSET_CONTENT_TYPE" in
  application/zip)
    unzip "$TOOL_NAME-asset"
    ;;
  application/gzip | application/x-gzip | application/x-tar)
    tar -xzf "$TOOL_NAME-asset"
    ;;
  *)
    echo "No extraction needed for $ASSET_CONTENT_TYPE file"
    mv "$TOOL_NAME-asset" "$TOOL_NAME"
    ;;
  esac

  # Remove asset binary
  rm -Rf "$TOOL_NAME-asset"

  printf "✅ Success\n"
}

move_binary() {
  echo "--------------------------------------------------------------------------------------"
  printf " ${GREEN}Moving and caching ${TOOL_NAME} binary${NC}\n"
  echo "--------------------------------------------------------------------------------------"

  # Search for binary in the archive tree
  FOUND=$(find "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/" -type f -name "$TOOL_NAME" | head -n1)
  if [[ -z "$FOUND" ]]; then
    printf "❌ ${RED}Can't find $TOOL_NAME in the subtree of ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${NC}\n"
    exit 0
  fi

  echo "Found binary: $FOUND"

  # copy new version in cache
  if [ -z "${ASSET_NAME_PARAM}" ]; then
    cp -rf "${FOUND}" "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}"
  else 
    mkdir -p "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}"
    cp -rf "${FOUND}" "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}"
  fi
  printf "✅ Success\n"
}

copy_lib() {
  echo "--------------------------------------------------------------------------------------"
    
  if [ -z "${ASSET_NAME_PARAM}" ]; then
    printf " ${GREEN}Copying $TOOL_NAME version $TOOL_VERSION asset from ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${TOOL_NAME} to ${PLATFORM_APP_DIR}/.global/bin${NC}\n"
    cp -rf "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${TOOL_NAME}" "${PLATFORM_APP_DIR}/.global/bin"
  else 
    printf " ${GREEN}Copying $TOOL_NAME version $TOOL_VERSION asset from ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}/${TOOL_NAME} to ${PLATFORM_APP_DIR}/.global/bin${NC}\n"
    cp -rf "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}/${TOOL_NAME}" "${PLATFORM_APP_DIR}/.global/bin"
  fi
  echo "--------------------------------------------------------------------------------------"
  
  cd ${PLATFORM_APP_DIR}/.global/bin
  chmod +x "${TOOL_NAME}"
  printf "✅ Success\n"
}

get_asset_id() {
  if [ -z "${ASSET_NAME_PARAM}" ]; then
    echo "W: You didn't define an asset name (as 3rd parameter) for installing $TOOL_NAME, getting first asset that contains 'linux' and 'x86|amd64|arm64' in it's asset name."
    ASSET=$(curl --silent -L \
      ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
      -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" |
      jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[]
          | select(.tag_name==$TOOL_VERSION)
          | .assets | map(select(
          (.name | test("linux")) and
          (.name | test("x86|amd64|arm64"))
        ))
      | .[0]')
  else
    echo "W: You define an asset name (as 3rd parameter) for installing $TOOL_NAME, getting '${ASSET_NAME_PARAM}' asset name."
    ASSET=$(curl --silent -L \
      ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
      -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" |
      jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[] | select(.tag_name==$TOOL_VERSION) | .assets' |
      jq -r --arg BINARY_NAME "${ASSET_NAME_PARAM}" '.[] | select(.name==$BINARY_NAME)')
  fi

  ASSET_ID=$(echo "$ASSET" | jq -r '.id')
  ASSET_NAME=$(echo "$ASSET" | jq -r '.name')
  ASSET_CONTENT_TYPE=$(echo "$ASSET" | jq -r '.content_type')
}

ensure_environment() {
  # If not running in an Upsun/Platform.sh build environment, do nothing.
  if [ -z "${PLATFORM_CACHE_DIR}" ]; then
    printf "${RED_BOLD}Not running in an Upsun/Platform.sh build environment. Aborting $TOOL_NAME installation.${NC}\n"
    exit 0
  else
    printf "${GREEN_BOLD}On an Upsun/Platform.sh environment.${NC}\n"
  fi
}

get_repo_latest_version() {
  # Get Latest version from GITHUB_ORG/$TOOL repo
  local response=$(curl --silent -H 'Accept: application/vnd.github.v3.raw' \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -L https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases/latest | jq -r '.tag_name')

  if [ "$response" != "null" ] && [ -n "$response" ]; then
    TOOL_VERSION=$response
  fi
}

check_version_exists() {
  # Check if version from GITHUB_ORG/$TOOL repo exists
  VERSION_FOUND=$(curl --silent -L \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" |
    jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[] | select(.tag_name==$TOOL_VERSION) | .tag_name ')
}

check_repository_auth() {
  # Make the API request and capture both body and HTTP status code
  response=$(curl --silent --write-out "HTTPSTATUS:%{http_code}" -L \
    -H "Accept: application/vnd.github+json" \
    ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
    "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME")
  
  # Separate the response body and HTTP status
  body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
  status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
  
  # Handle 404 or other HTTP errors
  if [ "$status" -eq 404 ]; then
    if [ -z "$GITHUB_API_TOKEN" ]; then
      printf "❌ Repository not accessible (404).\n"
      echo "💡 It might be a private repository. Please set the GITHUB_API_TOKEN environment variable."
    else
      printf "❌ Repository not found or inaccessible. Make sure the token has the correct permissions.\n"
    fi
    exit 0
  elif [ "$status" -ge 400 ]; then
    printf "❌ GitHub API request failed with status $status\n"
    exit 0
  fi
  
  # Extract the repository visibility
  is_private=$(echo "$body" | jq -r '.private')

  # Inform the user whether the repo is public or private
  if [ "$is_private" = "true" ]; then
    echo "🔒 This repository is private."
    if [ -z "$GITHUB_API_TOKEN" ]; then
      echo "💡 Please export a valid GITHUB_API_TOKEN to access private repositories."
      exit 0
    fi
  else
    printf "✅ This repository is public.\n"
  fi
}


# Get first parameter as the Github identifier: <org>/<repo>
if [ -z "$1" ]; then
  printf "${RED}Please define first parameter for the Github organization and the repository where to find the tool, ex: jgm/pandoc, ... ${NC}\n"
else
  GITHUB_ORG=$(echo "$1" | awk -F '/' '{print $1}')
  TOOL_NAME=$(echo "$1" | awk -F '/' '{print $2}')
fi

printf "\n"
printf "Install $1 asset.\n"

# check if we are on an Upsun/Platform.sh
ensure_environment
check_repository_auth

# If a specific version $2 is defined, install this $2 version
if [ -z "$2" ]; then
  echo "W: You didn't pass any version (as 2nd parameter) for installing $TOOL_NAME, getting latest version of $1."
  get_repo_latest_version
  echo "Latest $TOOL_NAME version found is $TOOL_VERSION"
else
  TOOL_VERSION="$2"
  check_version_exists
  if [ -z "$VERSION_FOUND" ]; then
    echo "Select version for $GITHUB_ORG/$TOOL_NAME ($2) does not exist."
    echo "Please check available releases on https://github.com/$GITHUB_ORG/$TOOL_NAME/releases"
    TOOL_VERSION=""
  else
    echo "You fix a specific version for $GITHUB_ORG/$TOOL_NAME: $2"
    TOOL_VERSION="$VERSION_FOUND"
  fi
fi

if [ -z "$TOOL_VERSION" ]; then
  printf "${RED_BOLD}Warning: No valid release version founded for $1, aborting installation.${NC}\n"
  exit 0
fi


# If a specific asset_name $3 is defined, install corresponding ASSET_NAME_PARAM asset
if [ -n "$3" ]; then
  ASSET_NAME_PARAM="$3"
fi

run
