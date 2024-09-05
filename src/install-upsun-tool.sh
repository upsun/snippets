# curl -fsS https://raw.githubusercontent.com/upsun/snippets/main/src/install-upsun-tool.sh | bash /dev/stdin "scalsun" 

# contributors:
#  - Florent HUCK <florent.huck@platform.sh>

run() {
   # Run the compilation process.
   cd $PLATFORM_CACHE_DIR || exit 1;

   UPSUN_TOOL=$1;
   UPSUN_VERSION=$2;

   UPSUN_BINARY="${UPSUN_TOOL}"

   rm -Rf ${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}

   if [ ! -f "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}" ]; then
       ensure_source "$UPSUN_TOOL" "$UPSUN_VERSION";
       download_binary "$UPSUN_TOOL" "$UPSUN_VERSION";
       move_binary "$UPSUN_TOOL" "$UPSUN_BINARY";
   fi

   copy_lib "$UPSUN_TOOL" "$UPSUN_BINARY";
   echo "$UPSUN_TOOL installation successful"
}

copy_lib() {
   echo "------------------------------------------------"
   echo " Copying compiled extension to PLATFORM_APP_DIR "
   echo "------------------------------------------------"

   UPSUN_TOOL=$1;
   UPSUN_BINARY=$2;

   cp "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}/${UPSUN_TOOL}" "${PLATFORM_APP_DIR}/bin/${UPSUN_TOOL}";
   cd ${PLATFORM_APP_DIR}/bin;
   chmod +x ${UPSUN_TOOL};
   echo "Success"
}

ensure_source() {
   echo "-----------------------------------------------------------------------------------"
   echo " Ensuring that the $UPSUN_TOOL binary folder is available and up to date "
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
     -H "Accept: application/octet-stream" \
     -H "Authorization: Bearer $GITHUB_API_TOKEN" \
     "https://api.github.com/repos/upsun/$TOOL/releases/assets/$ASSET_ID" \
     -o $BINARY_NAME 
   tar -xvf $BINARY_NAME

   echo "Success" 
}

get_asset_id() {  
   ASSET_ID=$(curl --silent -L \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_API_TOKEN" "https://api.github.com/repos/upsun/$UPSUN_TOOL/releases" \
    | jq -r --arg VERSION "$VERSION" --arg BINARY_NAME "$BINARY_NAME" 'map(select(.name==$VERSION)) | .[0].assets | map(select(.name==$BINARY_NAME)) | .[].id')
}

move_binary() {
   echo "-----------------------------------------------------"
   echo " Moving and caching ${UPSUN_TOOL} binary "
   echo "-----------------------------------------------------"
   UPSUN_TOOL=$1;
   UPSUN_BINARY=$2;
   cp -r "${PLATFORM_CACHE_DIR}/${UPSUN_TOOL}/${UPSUN_VERSION}/${UPSUN_TOOL}" "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}";
   chmod +x "${PLATFORM_CACHE_DIR}/${UPSUN_BINARY}";
   echo "Success"
}

ensure_environment() {
   # If not running in an Upsun/Platform.sh build environment, do nothing.
   if [ -z "${PLATFORM_CACHE_DIR}" ]; then
       echo "Not running in an Upsun/Platform.sh build environment. Aborting $UPSUN_TOOL installation.";
       exit 0;
   fi
}

if [ -z "$1" ]; then
  echo "Please define parameter for the tool you want to install: scalsun, ... ";
  echo "See https://github.com/upsun --> '***sun' repos ";
else 
  TOOL=$1;
fi

ensure_environment

# Install Upsun CLI as all of the tools need it 
curl -fsSL https://raw.githubusercontent.com/platformsh/cli/main/installer.sh | VENDOR=upsun bash

# Get Latest version from Upsun $TOOL repo
VERSION=$(curl --silent -H "Authorization: token $GITHUB_API_TOKEN" \
  -H 'Accept: application/vnd.github.v3.raw' \
  -L https://api.github.com/repos/upsun/$TOOL/tags | jq -r '.[0].name');
  
run "$TOOL" "$VERSION"