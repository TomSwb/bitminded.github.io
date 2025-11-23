#!/bin/bash
# Docker Installation Script for Linux Mint/Ubuntu
# This script installs Docker using the official Docker repository

set -e

echo "🐳 Installing Docker..."
echo ""

# Step 1: Update package index
echo "📦 Step 1: Updating package index..."
sudo apt-get update

# Step 2: Install prerequisites
echo "📦 Step 2: Installing prerequisites..."
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Step 3: Add Docker's official GPG key
echo "🔑 Step 3: Adding Docker's official GPG key..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Step 4: Set up the repository
echo "📚 Step 4: Setting up Docker repository..."
# Detect Linux Mint and map to Ubuntu codename (Docker doesn't support Mint codenames directly)
DISTRO_CODENAME=$(lsb_release -cs)
if [ -f /etc/linuxmint/info ]; then
    # Linux Mint detected - check codename directly
    if [ "$DISTRO_CODENAME" = "zara" ] || [ "$DISTRO_CODENAME" = "wilma" ]; then
        DISTRO_CODENAME="noble"  # Linux Mint Zara/Wilma are based on Ubuntu Noble
        echo "   Detected Linux Mint, using Ubuntu Noble codename"
    else
        echo "   Warning: Unknown Linux Mint codename: $DISTRO_CODENAME, using as-is"
    fi
fi
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $DISTRO_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Step 5: Update package index again
echo "📦 Step 5: Updating package index with Docker repository..."
sudo apt-get update

# Step 6: Install Docker Engine, CLI, and Containerd
echo "📦 Step 6: Installing Docker Engine, CLI, and Containerd..."
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Step 7: Add current user to docker group (so you don't need sudo)
echo "👤 Step 7: Adding user to docker group..."
sudo usermod -aG docker $USER

# Step 8: Start Docker service
echo "🚀 Step 8: Starting Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

echo ""
echo "✅ Docker installation complete!"
echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in (or restart) for the docker group changes to take effect."
echo ""
echo "After logging back in, verify installation with:"
echo "  docker --version"
echo "  docker run hello-world"
echo ""
echo "If you don't want to log out, you can use 'newgrp docker' to activate the group in the current session."

