# Stela

Stela is a graphics application using OpenGL with GLFW.

## Building the Project

### Using CMake (Recommended)

Stela now supports CMake as a build system. For detailed instructions, see [CMAKE_BUILD.md](CMAKE_BUILD.md).

Quick start:

#### Windows
```
./build.bat
```

#### Linux/macOS
```
./build.sh
```

### Using Visual Studio

The project can also be built using the provided Visual Studio solution file (Stela.sln).

## Project Structure

- `src/` - Source code files
  - `API/` - Core API components
    - `Input/` - Input handling
    - `Render/` - Rendering system
    - `Window/` - Window management
    - `Terminal/` - Terminal utilities
  - `Shaders/` - GLSL shader files
- `Includes/` - External header files
- `Libs/` - External libraries

## Dependencies

- GLFW - Window and input handling
- glad - OpenGL loading library