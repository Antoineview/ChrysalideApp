#!/bin/sh
set -e

echo "Running ci_post_clone.sh..."

# Only run pod install for branches starting with "build"
if [[ "$CI_BRANCH" == build* ]]; then
    echo "Branch '$CI_BRANCH' starts with 'build' - preparing environment..."
    
    # 1. Install Node.js (Homebrew is available in Xcode Cloud)
    echo "Installing Node.js..."
    brew install node

    # 2. Install JS dependencies
    # CI_PRIMARY_REPOSITORY_PATH is the root of the repo
    echo "Navigating to repository root: $CI_PRIMARY_REPOSITORY_PATH"
    cd "$CI_PRIMARY_REPOSITORY_PATH"
    
    echo "Installing npm dependencies..."
    npm ci
    
    # 3. Install Pods
    echo "Navigating to ios directory..."
    cd ios
    
    echo "Running pod install..."
    pod install
    
    echo "Pod install completed successfully!"
else
    echo "Branch '$CI_BRANCH' does not start with 'build' - skipping pod install."
fi
