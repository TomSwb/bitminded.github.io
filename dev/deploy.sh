#!/bin/bash

# Deployment script for BitMinded.ch
# This script copies files from development to production repository

echo "🚀 Deploying BitMinded.ch to production..."

# Define paths
DEV_DIR="/home/tomswb/bitminded-dev"
PROD_DIR="/home/tomswb/bitminded.github.io"

# Check if production directory exists
if [ ! -d "$PROD_DIR" ]; then
    echo "❌ Production directory not found: $PROD_DIR"
    exit 1
fi

# Copy files (excluding development-specific files)
echo "📁 Copying files to production..."

# Copy HTML files
cp "$DEV_DIR"/*.html "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No HTML files to copy"

# Copy CSS
cp -r "$DEV_DIR"/css "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No CSS directory to copy"

# Copy JavaScript
cp -r "$DEV_DIR"/js "$PROD_DIR"/ 2>/dev/null || echo "⚠️  No JS directory to copy"

# Copy images
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
