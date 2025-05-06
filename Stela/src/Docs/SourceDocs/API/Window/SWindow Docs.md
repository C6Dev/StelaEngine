# SWindow Docs

**File:** `SWindow.hpp / SWindow.cpp`
**Module:** `API/Window`
**Purpose:** Manages GLFW window creation and OpenGL context setup.

---

## Overview

`SWindow` is a minimal wrapper around GLFW that handles the creation and management of an OpenGL window context. It provides core functionality such as:

- Creating a window with specified width, height, and title
- Initializing OpenGL (via GLAD)
- Handling input polling and buffer swapping
- Managing window lifecycle (cleanup on destruction)
- Providing a framebuffer resize callback
- Exposing whether the window should close

This class is designed to be the entry point for initializing a rendering window and must be created before any rendering operations.

---

## Usage

Typical usage inside the engine’s `main` function looks like this:

```cpp
#include <API/Window/SWindow.hpp>

int main() {
    Stela::SWindow window(1280, 720, "Stela Editor");

    while (!window.ShouldClose()) {
        window.PollEvents();
        window.ClearColor(0.1f, 0.1f, 0.1f, 1.0f);
        window.ClearColorBuffer();
        window.SwapBuffers();
    }

    return 0;
}
```

---

## Constructor

```cpp
SWindow(int width, int height, const std::string& title);
```

- Initializes GLFW
- Configures OpenGL context to 3.3 Core
- Creates a window with the specified size and title
- Loads OpenGL functions using GLAD
- Sets a framebuffer resize callback

If any step fails, an exception is thrown and the engine will terminate.

---

## Destructor

```cpp
~SWindow();
```

- Cleans up and properly shuts down GLFW and the created window.
- Should never be called manually—let RAII handle cleanup.

---

## Functions

### `void PollEvents();`
Calls `glfwPollEvents()` to update input and window events.

---

### `void SwapBuffers();`
Swaps the front and back buffers, allowing the frame rendered this tick to be shown on screen.

---

### `void ClearColor(float r, float g, float b, float a);`
Sets the color used when clearing the screen. Must be called before `ClearColorBuffer()` to take effect.

---

### `void ClearColorBuffer();`
Clears the color buffer using the color previously set with `ClearColor()`.

---

### `bool ShouldClose() const;`
Returns `true` if the user has attempted to close the window.

---

### `static void FramebufferSizeCallback(GLFWwindow*, int width, int height);`
Automatically resizes the OpenGL viewport to match the window size when the user resizes it.

This is set via `glfwSetFramebufferSizeCallback` during construction.

---

## Internal Notes for Engine Developers

- `glfwInit()` and `glfwTerminate()` are handled internally. You should **not** call them outside this class unless adding multi-window support.
- All OpenGL function pointers are loaded through GLAD. This class assumes GLAD is statically included in the engine.
- Future improvements could include:
  - VSync toggle
  - Fullscreen/windowed mode switch
  - Window icon support
  - DPI awareness or scaling

---

## Known Issues / TODOs

- Currently only supports one window. Multi-window support will require decoupling from singleton-style assumptions.
- Does not expose input handling or window callbacks beyond resize.
- No logging integration—errors only throw exceptions.

---

## When Not to Use

- **Game developers** should not directly interact with this class.
- All windowing should be abstracted by higher-level engine systems (e.g., `Engine::Application`, `Editor::ViewportManager`, etc.)
