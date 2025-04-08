#!/bin/bash
# This generic script install a $GITHUB_ORG/$TOOL_NAME (corresponding asset) in the $PLATFORM_APP_DIR/bin folder of your app container
# in the "hooks.build" of your Upsun/Platform.sh YAML configuration, add the following:
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "<org/repo>" "[<version>]" "[<asset_name>]"
# example: 
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "dunglas/frankenphp" "1.5.0" "frankenphp-linux-x86_64-gnu"
# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

run() {
  # Run the compilation process.
  cd $PLATFORM_CACHE_DIR || exit 1

  if { [ -n "$ASSET_NAME_PARAM" ] && [ -f "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}/${TOOL_NAME}" ]; } ||
     { [ -z "$ASSET_NAME_PARAM" ] && [ -f "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${TOOL_NAME}" ]; }; then
    ensure_source
    download_binary
    move_binary
  fi

  copy_lib "$TOOL_NAME" "$TOOL_VERSION"
  echo "$TOOL_NAME installation successful"
  echo "use it using command: $TOOL_NAME"
}

ensure_source() {
  echo "--------------------------------------------------------------------------------------"
  echo " Ensuring that the $TOOL_NAME/$TOOL_VERSION binary folder is available and up to date "
  echo "--------------------------------------------------------------------------------------"

  mkdir -p "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION"

  cd "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION" || exit 1
  echo "Success"
}

download_binary() {
  echo "--------------------------------------------------------------------------------------"
  echo " Downloading $TOOL_NAME binary (version $TOOL_VERSION) source code "
  echo "--------------------------------------------------------------------------------------"

  get_asset_id

  curl -L \
    -H "Accept: application/octet-stream" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases/assets/$ASSET_ID" \
    -o "$TOOL_NAME-asset"
  
  # Extract accordingly
  case "$ASSET_CONTENT_TYPE" in
  application/zip)
    unzip "$TOOL_NAME-asset"
    ;;
  application/gzip | application/x-gzip | application/x-tar)
    tar -xzvf "$TOOL_NAME-asset"
    ;;
  *)
    echo "No extraction needed for $ASSET_CONTENT_TYPE file"
    mv "$TOOL_NAME-asset" "$TOOL_NAME"
    ;;
  esac

  # Remove asset binary
  rm -Rf "$TOOL_NAME-asset"

  echo "Success"
}

move_binary() {
  echo "--------------------------------------------------------------------------------------"
  echo " Moving and caching ${TOOL_NAME} binary "
  echo "--------------------------------------------------------------------------------------"

  # Search for binary in the archive tree
  FOUND=$(find "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/" -type f -name "$TOOL_NAME" | head -n1)
  if [[ -z "$FOUND" ]]; then
    echo "❌ Can't find $TOOL_NAME in the subtree of ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/"
    exit 1
  fi

  echo "✅ Found binary: $FOUND"

  # copy new version in cache
  if [ -z "$ASSET_NAME_PARAM" ]; then
    cp -r "${FOUND}" "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}"
  else 
    mkdir -p "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}"
    cp -r "${FOUND}" "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}"
  fi
  echo "Success"
}

copy_lib() {
  echo "--------------------------------------------------------------------------------------"
  echo " Copying $TOOL_NAME version $TOOL_VERSION asset from PLATFORM_CACHE_DIR to PLATFORM_APP_DIR "
  echo "--------------------------------------------------------------------------------------"

  if [ -z "$ASSET_NAME_PARAM" ]; then
    cp -r "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${TOOL_NAME}" "${PLATFORM_APP_DIR}/.global/bin"
  else 
    cp -r "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/${ASSET_NAME_PARAM}/${TOOL_NAME}" "${PLATFORM_APP_DIR}/.global/bin"
  fi
  
  cd ${PLATFORM_APP_DIR}/.global/bin
  chmod +x "${TOOL_NAME}"
  echo "Success"
}

get_asset_id() {
  if [ -z "${ASSET_NAME_PARAM}" ]; then
    echo "W: You didn't define an asset name (as 3rd parameter) for installing $TOOL_NAME, getting first asset that contains 'linux' and 'x86|amd64|arm64' in it's asset name."
    ASSET=$(curl --silent -L \
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
    echo "Not running in an Upsun/Platform.sh build environment. Aborting $TOOL_NAME installation."
    exit 0
  else
    echo "On an Upsun/Platform.sh environment"
  fi
}

get_repo_latest_version() {
  # Get Latest version from GITHUB_ORG/$TOOL repo
  local response=$(curl --silent -H 'Accept: application/vnd.github.v3.raw' \
    -L https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases/latest | jq -r '.tag_name')

  if [ "$response" != "null" ] && [ -n "$response" ]; then
    TOOL_VERSION=$response
  fi
}

check_version_exists() {
  # Check if version from GITHUB_ORG/$TOOL repo exists
  VERSION_FOUND=$(curl --silent -L \
    -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" |
    jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[] | select(.tag_name==$TOOL_VERSION) | .tag_name ')
}

# check if we are on an Upsun/Platform.sh
ensure_environment

# Get first parameter as the Github identifier: <org>/<repo>
if [ -z "$1" ]; then
  echo "Please define first parameter for the Github organization and the repository where to find the tool, ex: jgm/pandoc, ... "
else
  GITHUB_ORG=$(echo "$1" | awk -F '/' '{print $1}')
  TOOL_NAME=$(echo "$1" | awk -F '/' '{print $2}')
fi

# If a specific version $2 is defined, install this $2 version
if [ -z "$2" ]; then
  echo "W: You didn't pass any version (as 2nd parameter) for installing $TOOL_NAME, getting latest version of $1"
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
  echo "Warning: No valid release version founded for $1, aborting installation."
  exit 0
fi

# If a specific asset_name $3 is defined, install corresponding ASSET_NAME_PARAM asset
if [ -n "$3" ]; then
  ASSET_NAME_PARAM="$3"
fi

run
