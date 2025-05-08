# SRender Docs

**File:** `SRender.hpp / SRender.cpp`  
**Module:** `API/Render`  
**Purpose:** Provides a wrapper for OpenGL rendering functions to simplify graphics operations.

---

## Overview

`SRender` is a wrapper class for OpenGL rendering functions that simplifies graphics rendering operations. It provides core functionality such as:

- Initializing OpenGL buffer objects (VBO, VAO, EBO)
- Managing shader compilation and linking
- Handling buffer data operations
- Configuring vertex attributes
- Drawing primitives

This class is designed to abstract away the complexity of direct OpenGL calls and provide a more intuitive interface for rendering operations.

---

## Usage

Typical usage inside the engine:

```cpp
#include <API/Render/SRender.hpp>

// In your rendering code
Stela::SRender renderer;

// Initialize buffers
renderer.initializeBuffers();

// Set up vertex data and configure attributes
float vertices[] = {
    // positions         // colors
    0.5f, -0.5f, 0.0f,  1.0f, 0.0f, 0.0f,  // bottom right
   -0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f,  // bottom left
    0.0f,  0.5f, 0.0f,  0.0f, 0.0f, 1.0f   // top
};

// Bind and set buffer data
renderer.BindBuffer(GL_ARRAY_BUFFER, renderer.VBO);
renderer.BufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

// Configure vertex attributes
renderer.setVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)0);
renderer.setVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));

// Load and compile shaders
const GLchar* vertexSource = renderer.loadShaderSource("shaders/vertex.glsl");
renderer.setShaderSource(renderer.vertexShader, &vertexSource);
renderer.CompileShader(renderer.vertexShader);

// Create and use shader program
unsigned int shaderProgram = renderer.createAndLinkProgram(renderer.vertexShader, renderer.FragmentShader);
renderer.UseProgram(shaderProgram);

// Draw elements
renderer.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
```

---

## Constructor / Initialization

### `void initializeBuffers();`

- Creates and initializes Vertex Buffer Object (VBO)
- Creates and initializes Vertex Array Object (VAO)
- Creates and initializes Element Buffer Object (EBO)
- Creates shader objects for vertex and fragment shaders

---

## Destructor

### `~SRender();`

- Cleans up OpenGL resources by deleting buffer objects and shader programs
- Prevents memory leaks by properly releasing GPU resources

---

## Functions

### Buffer Management Functions

#### `void BindVertexArray(unsigned int VAO);`
Binds the specified vertex array object for use.

---

#### `void BindBuffer(GLenum target, unsigned int buffer);`
Binds a buffer object to the specified target (e.g., GL_ARRAY_BUFFER).

---

#### `void BufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage);`
Creates and initializes a buffer object's data store.

---

#### `void setBufferData(GLenum target, GLsizeiptr size, const void* data, GLenum usage);`
Alternative name for BufferData function.

---

#### `void setVertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void* pointer);`
Specifies the location and data format of a vertex attribute and enables the vertex attribute array.

---

#### `void EnableVertexAttribArray(GLuint index);`
Enables a generic vertex attribute array.

---

### Shader Management Functions

#### `const GLchar* loadShaderSource(const std::string& filePath);`
Loads shader source code from a file and returns a pointer to the loaded source.

---

#### `void setShaderSource(GLuint shader, const GLchar* const* source);`
Sets the source code for a shader object.

---

#### `void CompileShader(GLuint shader);`
Compiles a shader object and outputs compilation status.

---

#### `unsigned int createAndLinkProgram(GLuint vertexShader, GLuint fragmentShader);`
Creates a program object, attaches the specified shaders, and links them.

---

#### `void UseProgram(unsigned int shaderProgram);`
Installs a program object as part of the current rendering state.

---

#### `void DeleteProgram(unsigned int shaderProgram);`
Deletes a program object and outputs deletion status.

---

### Drawing Functions

#### `void DrawElements(GLenum mode, GLsizei count, GLenum type, const void* indices);`
Renders primitives from array data using the specified mode (e.g., GL_TRIANGLES).

---

#### `void PolygonMode(GLenum face, GLenum mode);`
Sets the polygon rasterization mode (e.g., GL_FILL, GL_LINE).

---

## Member Variables

### OpenGL Buffer Objects

#### `unsigned int VBO;`
Vertex Buffer Object handle that stores vertex data in GPU memory.

---

#### `unsigned int VAO;`
Vertex Array Object handle that stores vertex attribute configurations and associated VBOs.

---

#### `unsigned int EBO;`
Element Buffer Object handle that stores indices for indexed rendering.

---

### Shader Objects

#### `unsigned int vertexShader;`
Vertex shader handle that processes individual vertices.

---

#### `unsigned int FragmentShader;`
Fragment shader handle that processes fragments (pixels) and determines their color.

---

## Internal Notes for Engine Developers

- The class provides a thin wrapper around OpenGL functions for easier use
- Error checking is included for shader compilation and program linking
- The class handles resource cleanup automatically in its destructor
- Uses ANSI color codes for console output when reporting shader status

---

## Known Issues / TODOs

- No support for geometry or compute shaders
- Limited error handling for buffer operations
- No uniform setting functions
- No texture management functions
- No framebuffer management

---

## When Not to Use

- For very complex rendering pipelines that need direct OpenGL access
- When more advanced features like instancing or transform feedback are needed
- When working with multiple rendering contexts