#!/bin/bash

# Install Upsun CLI
set -xe

# Define version and URLs
UPSUN_VERSION="5.8.0"
UPSUN_URL="https://github.com/platformsh/cli/releases/download/${UPSUN_VERSION}/upsun_${UPSUN_VERSION}_linux_amd64.tar.gz"
INSTALL_DIR="/app/.global/bin"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Download and extract Upsun CLI
curl -L "$UPSUN_URL" -o "/tmp/upsun.tar.gz"
tar -xzf "/tmp/upsun.tar.gz" -C "/tmp"

# Move binary to install directory
mv "/tmp/upsun" "$INSTALL_DIR/upsun"

# Make executable
chmod +x "$INSTALL_DIR/upsun"

# Add to PATH if not already there
export PATH="$INSTALL_DIR:$PATH"

# Verify installation
"$INSTALL_DIR/upsun" --version

echo "Upsun CLI installed successfully"