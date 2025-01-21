#!/bin/bash
# This script install pandoc in the $PLATFORM_APP_DIR/bin folder
# installation in the hooks.build of your Upsun/Platform.sh project: 
# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-pandoc.sh | bash
# then execute pandoc: bin/pandoc -v 
# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

run() {
   # Run the compilation process.
   cd $PLATFORM_CACHE_DIR || exit 1;

   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;

   if [ ! -f "${PLATFORM_CACHE_DIR}/${UPSUN_TOOL}/${UPSUN_VERSION}/${UPSUN_TOOL}-${UPSUN_VERSION}/bin/${UPSUN_TOOL}" ]; then
       ensure_source "$UPSUN_TOOL" "$UPSUN_VERSION";
       download_binary "$UPSUN_TOOL" "$UPSUN_VERSION";
       move_binary "$UPSUN_TOOL" "$UPSUN_VERSION";
   fi

   copy_lib "$UPSUN_TOOL" "$UPSUN_VERSION";
   echo "$UPSUN_TOOL installation successful"
}

copy_lib() {
   echo "------------------------------------------------"
   echo " Copying compiled extension from PLATFORM_CACHE_DIR to PLATFORM_APP_DIR "
   echo "------------------------------------------------"

   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;

   mkdir -p ${PLATFORM_APP_DIR}/bin
   cp -r "${PLATFORM_CACHE_DIR}/${UPSUN_TOOL}/${UPSUN_TOOL}" "${PLATFORM_APP_DIR}/bin";
   cd ${PLATFORM_APP_DIR}/bin;
   chmod +x "${UPSUN_TOOL}";
   echo "Success"
}

ensure_source() {
   echo "-----------------------------------------------------------------------------------"
   echo " Ensuring that the $UPSUN_TOOL/$UPSUN_VERSION binary folder is available and up to date "
   echo "-----------------------------------------------------------------------------------"

   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;

   mkdir -p "$PLATFORM_CACHE_DIR/$UPSUN_TOOL/$UPSUN_VERSION";

   cd "$PLATFORM_CACHE_DIR/$UPSUN_TOOL/$UPSUN_VERSION" || exit 1;
   echo "Success"
}

download_binary() {
   echo "---------------------------------------------------------------------"
   echo " Downloading $UPSUN_TOOL binary source code "
   echo "---------------------------------------------------------------------"
   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;

   BINARY_NAME="$UPSUN_TOOL-$UPSUN_VERSION-linux-amd64.tar.gz"
   get_asset_id
      
   curl -L \
     -H "Accept: application/octet-stream" "https://api.github.com/repos/jgm/$TOOL/releases/assets/$ASSET_ID" \
     -o $BINARY_NAME
   tar -xvf $BINARY_NAME

   echo "Success"
}

get_asset_id() {
   ASSET_ID=$(curl --silent -L \
    -H "Accept: application/vnd.github+json" "https://api.github.com/repos/jgm/$UPSUN_TOOL/releases" \
    | jq -r --arg BINARY_NAME "$BINARY_NAME" '.[0].assets | map(select(.name==$BINARY_NAME)) | .[].id')
}

move_binary() {
   echo "-----------------------------------------------------"
   echo " Moving and caching ${UPSUN_TOOL} binary "
   echo "-----------------------------------------------------"
   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;
   
   # copy new version in cache
   cp -r "${PLATFORM_CACHE_DIR}/${UPSUN_TOOL}/${UPSUN_VERSION}/${UPSUN_TOOL}-${UPSUN_VERSION}/bin/${UPSUN_TOOL}" "${PLATFORM_CACHE_DIR}/${UPSUN_TOOL}";
   echo "Success"
}

ensure_environment() {
   # If not running in an Upsun/Platform.sh build environment, do nothing.
   if [ -z "${PLATFORM_CACHE_DIR}" ]; then
       echo "Not running in an Upsun/Platform.sh build environment. Aborting $UPSUN_TOOL installation.";
       exit 0;
   fi
}

get_latest_version() {
  # Get Latest version from jqm $TOOL repo
  VERSION=$(curl --silent -H 'Accept: application/vnd.github.v3.raw' \
    -L https://api.github.com/repos/jgm/$TOOL/releases | jq -r '.[0].tag_name');
}

set -e

TOOL="pandoc";
ensure_environment
get_latest_version

# FHK override
echo "Latest $TOOL version found is $VERSION"
run "$TOOL" "$VERSION"
