# install-scalsun.sh

# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

run() {
   # Run the compilation process.
   cd $PLATFORM_CACHE_DIR || exit 1;

   UPSUN_PROJECT=$1;
   UPSUN_VERSION=$2;

   UPSUN_BINARY="${UPSUN_PROJECT}"

   #DEBUG rm -Rf ${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}

   if [ ! -f "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}" ]; then
       ensure_source "$UPSUN_PROJECT" "$UPSUN_VERSION";
       download_binary "$UPSUN_PROJECT" "$UPSUN_VERSION";
       move_binary "$UPSUN_PROJECT" "$UPSUN_BINARY";
   fi

   copy_lib "$UPSUN_PROJECT" "$UPSUN_BINARY";
   echo "$UPSUN_PROJECT installation successful"
}

copy_lib() {
   echo "------------------------------------------------"
   echo " Copying compiled extension to PLATFORM_APP_DIR "
   echo "------------------------------------------------"

   UPSUN_PROJECT=$1;
   UPSUN_BINARY=$2;

   cp "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}" "${PLATFORM_APP_DIR}/${UPSUN_PROJECT}";
   cd ${PLATFORM_APP_DIR};
   chmod +x ${UPSUN_PROJECT};
   echo "Success"
}

ensure_source() {
   echo "-----------------------------------------------------------------------------------"
   echo " Ensuring that the $UPSUN_PROJECT binary folder is available and up to date "
   echo "-----------------------------------------------------------------------------------"

   UPSUN_PROJECT=$1;
   UPSUN_VERSION=$2;

   mkdir -p "$PLATFORM_CACHE_DIR/$UPSUN_PROJECT/$UPSUN_VERSION";
   cd "$PLATFORM_CACHE_DIR/$UPSUN_PROJECT/$UPSUN_VERSION" || exit 1;
   echo "Success"
}

download_binary() {
   echo "---------------------------------------------------------------------"
   echo " Downloading $UPSUN_PROJECT binary source code "
   echo "---------------------------------------------------------------------"
   UPSUN_PROJECT=$1;
   UPSUN_VERSION=$2;
   
   BINARY_NAME="$UPSUN_PROJECT-$UPSUN_VERSION-linux-amd64.tar.gz"
   
   get_asset_id
   
   echo "assetId $ASSET_ID"
   
   curl -L \
     -H "Accept: application/octet-stream" \
     -H "Authorization: Bearer $GITHUB_API_TOKEN" \
     "https://api.github.com/repos/upsun/scalsun/releases/assets/$ASSET_ID" \
     -o $BINARY_NAME 
   pwd
   ls -la
   tar -xvf $BINARY_NAME

   echo "Success" 
}

get_asset_id() {
  
   ASSET_ID=$(curl --silent -L \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_API_TOKEN" \                                                                                                 
    "https://api.github.com/repos/upsun/$UPSUN_PROJECT/releases" \
    | jq 'map(select(.name == "$VERSION")) | .[0].assets | map(select(.name == "$BINARY_NAME")) | .[].id')
    
    echo "assetID = $ASSET_ID";
}

move_binary() {
   echo "-----------------------------------------------------"
   echo " Moving and caching ${UPSUN_PROJECT} binary "
   echo "-----------------------------------------------------"
   UPSUN_PROJECT=$1;
   UPSUN_BINARY=$2;
   cp "${PLATFORM_CACHE_DIR}/${UPSUN_PROJECT}/${UPSUN_VERSION}/${UPSUN_PROJECT}" "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}";
   chmod +x "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}";
   echo "Success"
}

ensure_environment() {
   # If not running in an Upsun/Platform.sh build environment, do nothing.
   if [ -z "${PLATFORM_CACHE_DIR}" ]; then
       echo "Not running in an Upsun/Platform.sh build environment. Aborting $UPSUN_PROJECT installation.";
       exit 0;
   fi
}

ensure_environment
# Get Latest version from Upsun scalsun repo
VERSION=$(curl --silent -H "Authorization: token $GITHUB_API_TOKEN" \
  -H 'Accept: application/vnd.github.v3.raw' \
  -L https://api.github.com/repos/upsun/scalsun/tags | jq -r '.[0].name');
  
run "scalsun" "$VERSION"