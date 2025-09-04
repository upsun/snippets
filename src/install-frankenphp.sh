# install-frankenphp.sh

# contributors:
#  - Thomas DI LUCCIO <thomas.diluccio@platform.sh>
#  - Florent HUCK <florent.huck@platform.sh>

run() {
   # Run the compilation process.
   cd $PLATFORM_CACHE_DIR || exit 1;

   FRANKENPHP_PROJECT=$1;
   FRANKENPHP_VERSION=$2;

   FRANKENPHP_BINARY="${FRANKENPHP_PROJECT}_v$FRANKENPHP_VERSION"
   FRANKENPHP_BINARY="${FRANKENPHP_BINARY//\./_}"

   rm -Rf ${PLATFORM_CACHE_DIR}/${FRANKENPHP_BINARY}

   if [ ! -f "${PLATFORM_CACHE_DIR}/${FRANKENPHP_BINARY}" ]; then
       ensure_source "$FRANKENPHP_PROJECT" "$FRANKENPHP_VERSION";
       download_binary "$FRANKENPHP_PROJECT" "$FRANKENPHP_VERSION";
       move_binary "$FRANKENPHP_PROJECT" "$FRANKENPHP_BINARY";
   fi

   copy_lib "$FRANKENPHP_PROJECT" "$FRANKENPHP_BINARY";
   echo "FrankenPHP installation successful"
}

copy_lib() {
   echo "------------------------------------------------"
   echo " Copying compiled extension to PLATFORM_APP_DIR "
   echo "------------------------------------------------"

   FRANKENPHP_PROJECT=$1;
   FRANKENPHP_BINARY=$2;

   cp "${PLATFORM_CACHE_DIR}/${FRANKENPHP_BINARY}" "${PLATFORM_APP_DIR}/${FRANKENPHP_PROJECT}";
   cd ${PLATFORM_APP_DIR};
   chmod +x ${FRANKENPHP_PROJECT};
   echo "Success"
}

ensure_source() {
   echo "-----------------------------------------------------------------------------------"
   echo " Ensuring that the $FRANKENPHP_PROJECT binary folder is available and up to date "
   echo "-----------------------------------------------------------------------------------"

   FRANKENPHP_PROJECT=$1;
   FRANKENPHP_VERSION=$2;

   mkdir -p "$PLATFORM_CACHE_DIR/$FRANKENPHP_PROJECT/$FRANKENPHP_VERSION";
   cd "$PLATFORM_CACHE_DIR/$FRANKENPHP_PROJECT/$FRANKENPHP_VERSION" || exit 1;
   echo "Success"
}

download_binary() {
   echo "---------------------------------------------------------------------"
   echo " Downloading FRANKENPHP_PROJECT binary source code "
   echo "---------------------------------------------------------------------"
   FRANKENPHP_PROJECT=$1;
   FRANKENPHP_VERSION=$2;
   wget https://github.com/php/frankenphp/releases/download/$FRANKENPHP_VERSION/frankenphp-linux-x86_64
   mv frankenphp-linux-x86_64 ${FRANKENPHP_PROJECT}
   echo "Success"
}

move_binary() {
   echo "-----------------------------------------------------"
   echo " Moving and caching ${FRANKENPHP_PROJECT} binary "
   echo "-----------------------------------------------------"
   FRANKENPHP_PROJECT=$1;
   FRANKENPHP_BINARY=$2;
   cp "${PLATFORM_CACHE_DIR}/${FRANKENPHP_PROJECT}/${FRANKENPHP_VERSION}/${FRANKENPHP_PROJECT}" "${PLATFORM_CACHE_DIR}/${FRANKENPHP_BINARY}";
   chmod +x "${PLATFORM_CACHE_DIR}/${FRANKENPHP_BINARY}";
   echo "Success"
}

ensure_environment() {
   # If not running in an Upsun/Platform.sh build environment, do nothing.
   if [ -z "${PLATFORM_CACHE_DIR}" ]; then
       echo "Not running in an Upsun/Platform.sh build environment. Aborting FrankenPHP installation.";
       exit 0;
   fi
}

ensure_environment
# Get Latest version from php repo
VERSION=$(curl --silent "https://api.github.com/repos/dunglas/frankenphp/releases" | jq -r '.[0].name');
run "frankenphp" "$VERSION"
