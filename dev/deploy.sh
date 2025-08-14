#!/bin/bash

# Deployment script for BitMinded.ch
# This script syncs files from development to production repository
# WARNING: This will make production exactly match development (removes old files)

echo "🚀 Deploying BitMinded.ch to production..."

# Define paths
DEV_DIR="/home/tomswb/bitminded-dev"
PROD_DIR="/home/tomswb/bitminded.github.io"

# Check if production directory exists
if [ ! -d "$PROD_DIR" ]; then
    echo "❌ Production directory not found: $PROD_DIR"
    exit 1
fi

echo "📁 Syncing files to production (this will remove old files)..."

# Backup approach: Remove all website files and copy fresh
# This ensures production exactly matches development

# Remove old website files (but keep .git, README, etc.)
echo "🗑️  Removing old website files..."
cd "$PROD_DIR" || exit 1

# Remove HTML files (except README.md)
find . -maxdepth 1 -name "*.html" -delete 2>/dev/null || true

# Remove directories we manage
rm -rf css js images 2>/dev/null || true

# Remove CNAME (will be re-copied if needed)
rm -f CNAME 2>/dev/null || true

# Copy all files from development
echo "� Copying fresh files from development..."

# Copy HTML files
cp "$DEV_DIR"/*.html "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No HTML files to copy"

# Copy directories
cp -r "$DEV_DIR"/css "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No CSS directory to copy"
cp -r "$DEV_DIR"/js "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No JS directory to copy"
cp -r "$DEV_DIR"/images "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No images directory to copy"

# Copy CNAME (important for custom domain)
cp "$DEV_DIR"/CNAME "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No CNAME file to copy"

echo "✅ Files copied successfully!"

# Navigate to production directory
cd "$PROD_DIR" || exit 1

# Check git status
echo "📊 Checking git status..."
git status

# Ask for confirmation before committing
read -p "🤔 Do you want to commit and push these changes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add all changes
    git add .
    
    # Commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "Deploy changes from development - $TIMESTAMP"
    
    # Push to production
    git push origin main
    
    echo "🎉 Deployment complete! Changes should be live shortly."
else
    echo "⏸️  Deployment cancelled. Files have been copied but not committed."
fi
