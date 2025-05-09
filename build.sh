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
cd build

# Configure the project
echo "Configuring project..."
cmake ..
if [ $? -ne 0 ]; then
    echo "Error: CMake configuration failed."
    exit 1
fi

# Build the project
echo "Building project..."
cmake --build .
if [ $? -ne 0 ]; then
    echo "Error: Build failed."
    exit 1
fi

echo ""
echo "Build completed successfully!"
echo "The executable is located in build/Stela"
echo ""

cd ..