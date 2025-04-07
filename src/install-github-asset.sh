#!/bin/bash
# This generic script install a $GITHUB_ORG/$TOOL_NAME (corresponding asset) in the $PLATFORM_APP_DIR/bin folder of your app container
# in the hooks.build of your Upsun/Platform.sh configuration: 
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-github-asset.sh | bash /dev/stdin "jgm/pandoc" "[<version>]" 
# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

run() {
   # Run the compilation process.
   cd $PLATFORM_CACHE_DIR || exit 1;
   if [ ! -f "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/bin/${TOOL_NAME}" ]; then
       ensure_source 
       download_binary;
       move_binary;
   fi

   copy_lib "$TOOL_NAME" "$TOOL_VERSION";
   echo "$TOOL_NAME installation successful"
   echo "use it using command: $TOOL_NAME"
}

ensure_source() {
   echo "--------------------------------------------------------------------------------------"
   echo " Ensuring that the $TOOL_NAME/$TOOL_VERSION binary folder is available and up to date "
   echo "--------------------------------------------------------------------------------------"

   mkdir -p "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION";

   cd "$PLATFORM_CACHE_DIR/$TOOL_NAME/$TOOL_VERSION" || exit 1;
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
       tar -xzf "$TOOL_NAME-asset"
       ;;
     *)
       echo "No extraction needed for $ASSET_CONTENT_TYPE file"
       ;;
   esac

   pwd
   ls -la 
   
   echo "Success"
}

move_binary() {
   echo "--------------------------------------------------------------------------------------"
   echo " Moving and caching ${TOOL_NAME} binary "
   echo "--------------------------------------------------------------------------------------"
   
   # copy new version in cache
   ls -la ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/
   
   # Recherche du binaire dans l'arborescence
   FOUND=$(find "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/" -type f -name "$TOOL_NAME" | head -n1)
   
   if [[ -z "$FOUND" ]]; then
     echo "❌ Binaire $TOOL_NAME introuvable dans ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_VERSION}/"
     exit 1
   fi
   
   echo "✅ Binaire trouvé: $FOUND"
   
   cp -r "${FOUND}" "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/";
   
   echo "Success"
}

copy_lib() {
   echo "--------------------------------------------------------------------------------------"
   echo " Copying $TOOL_NAME version $TOOL_VERSION asset from PLATFORM_CACHE_DIR to PLATFORM_APP_DIR "
   echo "--------------------------------------------------------------------------------------"

   #mkdir -p ${PLATFORM_APP_DIR}/.global/bin
   
   ls -la ${PLATFORM_APP_DIR}/.global/bin
   
   ls -la ${PLATFORM_CACHE_DIR}/${TOOL_NAME}
   ls -la ${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_NAME}
   
   cp -r "${PLATFORM_CACHE_DIR}/${TOOL_NAME}/${TOOL_NAME}" "${PLATFORM_APP_DIR}/.global/bin";
   cd ${PLATFORM_APP_DIR}/.global/bin;
   chmod +x "${TOOL_NAME}";
   echo "Success"
}

get_asset_id() {
#   ASSET_ID=$(curl --silent -L \
#    -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" \
#    | jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[] | select(.tag_name==$TOOL_VERSION) | .assets'  \
#    | jq -r --arg BINARY_NAME "$BINARY_NAME" '.[] | select(.name==$BINARY_NAME) | .id');
#    
  ASSET=$(curl --silent -L \
      -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" \
      | jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[]
          | select(.tag_name==$TOOL_VERSION)
          | .assets | map(select(
          (.name | test("linux")) and
          (.name | test("x86|amd64|arm64"))
        ))
      | .[0]')
  echo $ASSET
  
  ASSET_ID=$(echo "$ASSET" | jq -r '.id')
  ASSET_NAME=$(echo "$ASSET" | jq -r '.name')
  ASSET_CONTENT_TYPE=$(echo "$ASSET" | jq -r '.content_type')  
  
  echo $ASSET_ID
  echo $ASSET_NAME
  echo $ASSET_CONTENT_TYPE
}

ensure_environment() {
   # If not running in an Upsun/Platform.sh build environment, do nothing.
   if [ -z "${PLATFORM_CACHE_DIR}" ]; then
       echo "Not running in an Upsun/Platform.sh build environment. Aborting $TOOL_NAME installation.";
       exit 0;
   else 
     echo "On an Upsun/Platform.sh environment";
   fi
}

get_latest_version() {
  # Get Latest version from GITHUB_ORG/$TOOL repo
  TOOL_VERSION=$(curl --silent -H 'Accept: application/vnd.github.v3.raw' \
    -L https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases/latest | jq -r '.tag_name');
}

check_version_exists() {
  # Check if version from GITHUB_ORG/$TOOL repo exists
  VERSION_FOUNDED=$(curl --silent -L \
    -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$GITHUB_ORG/$TOOL_NAME/releases" \
    | jq -r --arg TOOL_VERSION "$TOOL_VERSION" '.[] | select(.tag_name==$TOOL_VERSION) | .tag_name ');  
}

# check if we are on an Upsun/Platform.sh 
ensure_environment;

# Get first parameter as the Github identifier: <org>/<repo>
if [ -z "$1" ]; then
  echo "Please define first parameter for the Github organization and the repository where to find the tool, ex: jgm/pandoc, ... ";
else
  GITHUB_ORG=$(echo "$1" | awk -F '/' '{print $1}');
  TOOL_NAME=$(echo "$1" | awk -F '/' '{print $2}');
fi

# If a specific version $2 is defined, install this $2 version
if [ -z "$2" ]; then
  echo "W: You didn't pass any version (as 2nd parameter) for installing $TOOL_NAME, getting latest version of $1"
  get_latest_version
  echo "Latest $TOOL_NAME version found is $TOOL_VERSION"
else
  TOOL_VERSION="$2"
  check_version_exists;
  if [ -z "$VERSION_FOUNDED" ]; then
    echo "Select version for $GITHUB_ORG/$TOOL_NAME ($2) does not exist.";
    echo "Please check available releases on https://github.com/$GITHUB_ORG/$TOOL_NAME/releases"
    TOOL_VERSION="";
  else 
    echo "You fix a specific version for $GITHUB_ORG/$TOOL_NAME: $2"
    TOOL_VERSION="$VERSION_FOUNDED"
  fi
fi

if [ -z "$TOOL_VERSION" ]; then
  echo "Warning: No valid release version founded for $1, aborting installation."
else 
  run
fi
