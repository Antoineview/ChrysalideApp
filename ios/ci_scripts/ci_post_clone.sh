#!/bin/sh
set -e

echo "Running ci_post_clone.sh..."

# Only run pod install for branches starting with "build"
if [[ "$CI_BRANCH" == build* ]]; then
    echo "Branch '$CI_BRANCH' starts with 'build' - running pod install..."
    
    # Navigate to the ios directory where the Podfile is located
    # CI_PRIMARY_REPOSITORY_PATH is provided by Xcode Cloud
    cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
    
    # Install CocoaPods dependencies
    pod install
    
    echo "Pod install completed successfully!"
else
    echo "Branch '$CI_BRANCH' does not start with 'build' - skipping pod install."
fi
