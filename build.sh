#!/bin/bash

echo "Building Stela with CMake..."

# Check if CMake is installed
if ! command -v cmake &> /dev/null; then
    echo "Error: CMake is not installed or not in PATH."
    echo "Please install CMake using your package manager:"
    echo "  - Ubuntu/Debian: sudo apt-get install cmake"
    echo "  - Fedora: sudo dnf install cmake"
    echo "  - macOS: brew install cmake"
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p build

# Configure with CMake
cmake -B build -DCMAKE_BUILD_TYPE=Release

# Build the project
cmake --build build --config Release

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Executable is located at: build/Stela"
else
    echo "Build failed with error code $?"
    exit $?
fi