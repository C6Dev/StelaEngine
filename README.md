# Stela

Stela is a graphics application using OpenGL with GLFW and ImGui.

## Building the Project

### Prerequisites

- CMake 3.10 or higher
- C++17 compatible compiler
- Git (for cloning the repository)

### Building

#### Windows
```powershell
# Clone the repository
git clone https://github.com/yourusername/Stela.git
cd Stela

# Build the project
./build.bat
```

#### Linux/macOS
```bash
# Clone the repository
git clone https://github.com/yourusername/Stela.git
cd Stela

# Make build script executable
chmod +x build.sh

# Build the project
./build.sh
```

The executable will be located in the `build/Release` directory.

## Project Structure

- `src/` - Source code files
  - `API/` - Core API components
    - `Input/` - Input handling
    - `Render/` - Rendering system
    - `Window/` - Window management
  - `Shaders/` - GLSL shader files
- `Includes/` - External header files and libraries
  - `glfw/` - GLFW window management library
  - `imgui/` - Dear ImGui library
  - `glad/` - OpenGL loading library

## Dependencies

- GLFW - Window and input handling
- ImGui - Immediate mode GUI
- glad - OpenGL loading library

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.