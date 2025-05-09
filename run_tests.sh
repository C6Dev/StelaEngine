#!/bin/bash

echo "Running Stela CMake Tests..."

# Check if CMake is installed
if ! command -v cmake &> /dev/null; then
    echo "Error: CMake is not installed or not in PATH."
    echo "Please install CMake using your package manager:"
    echo "  - Ubuntu/Debian: sudo apt-get install cmake"
    echo "  - Fedora: sudo dnf install cmake"
    echo "  - macOS: brew install cmake"
    exit 1
fi

# Create test build directory
mkdir -p test_build
cd test_build

# Copy the test CMakeLists.txt to use for testing
echo "Preparing test configuration..."
cp ../CMakeLists.txt.test CMakeLists.txt

# Configure the project with testing enabled
echo "Configuring test project..."
cmake .
if [ $? -ne 0 ]; then
    echo "Error: CMake test configuration failed."
    exit 1
fi

# Run the tests
echo "Running tests..."
ctest --output-on-failure
if [ $? -ne 0 ]; then
    echo "Error: Some tests failed."
    exit 1
fi

echo ""
echo "All tests completed successfully!"
echo ""

cd ..