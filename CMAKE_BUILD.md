# Building Stela with CMake

This document provides instructions for building the Stela project using CMake.

## Prerequisites

- CMake (version 3.10 or higher)
- A C++ compiler with C++17 support
- GLFW dependencies (automatically handled on Windows, may require additional packages on other platforms)

## Building on Windows

1. Create a build directory:
   ```
   mkdir build
   cd build
   ```

2. Configure the project:
   ```
   cmake ..
   ```

3. Build the project:
   ```
   cmake --build . --config Release
   ```

4. The executable will be created in the `build\Release` directory along with the required shader files.

## Building on Linux/macOS

1. Install GLFW development packages (if not already installed):
   - On Ubuntu/Debian: `sudo apt-get install libglfw3-dev`
   - On macOS with Homebrew: `brew install glfw`

2. Create a build directory:
   ```
   mkdir build
   cd build
   ```

3. Configure the project:
   ```
   cmake ..
   ```

4. Build the project:
   ```
   cmake --build .
   ```

5. The executable will be created in the `build` directory along with the required shader files.

## Running the Application

After building, you can run the application from the build directory:

```
./Stela
```

## Customizing the Build

You can customize the build by passing options to CMake:

- To build in debug mode: `cmake --build . --config Debug`
- To specify a different compiler: `cmake -DCMAKE_CXX_COMPILER=clang++ ..`

## Installing

To install the application:

```
cmake --install .
```

This will install the executable and shader files to the default installation directory.

## Testing

Stela includes a testing framework to verify the build system and installation process. To run the tests:

### Windows
```
run_tests.bat
```

### Linux/macOS
```
./run_tests.sh
```

Alternatively, you can manually set up testing:

1. Copy `CMakeLists.txt.test` to a test directory as `CMakeLists.txt`
2. Configure with CMake: `cmake .`
3. Run the tests: `ctest --output-on-failure`

The tests verify:
- Successful build of the executable
- Proper copying of shader files to the build directory
- Successful installation
- Presence of all required files in the installation directory