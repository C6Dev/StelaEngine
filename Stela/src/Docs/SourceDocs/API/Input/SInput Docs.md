# SInput Docs

**File:** `SInput.hpp / SInput.cpp`  
**Module:** `API/Input`  
**Purpose:** Minimal API for per-frame keyboard input handling via GLFW.

---

## Overview

`SInput` is a lightweight input interface for use inside the Stela engine. It is not meant for gameplay-level input binding, but rather serves as a utility for engine developers to check key states and execute immediate actions.

It provides:

- Initialization using a `GLFWwindow*`
- A single `Input()` function that checks if a key is pressed
- Ability to bind one-off functions or lambdas to key presses without hardcoding logic into engine loops

This abstraction helps keep input logic modular and separated from rendering or window code.

---

## Usage

Typical usage in the engine's main loop:

```cpp
#include <API/Window/SWindow.hpp>
#include <API/Input/SInput.hpp>

int main() {
    Stela::SWindow window(1280, 720, "Stela Editor");
    Stela::SInput input;
    input.Init(window.GetGLFWWindow());

    while (!window.ShouldClose()) {
        window.PollEvents();

        input.Input(GLFW_KEY_ESCAPE, [&]() {
            glfwSetWindowShouldClose(window.GetGLFWWindow(), true);
        });

        window.ClearColor(0.1f, 0.1f, 0.1f, 1.0f);
        window.ClearColorBuffer();
        window.SwapBuffers();
    }

    return 0;
}
```

---

## Constructor / Initialization

### `void Init(GLFWwindow* window);`

Stores a pointer to the active GLFW window, required for calling `glfwGetKey`.

Must be called before using `Input()`.

---

## Functions

### `void Input(int key, const std::function<void()>& action) const;`

- Checks whether the given `key` is currently pressed.
- If pressed, immediately executes the `action` lambda or function passed in.

#### Example:

```cpp
input.Input(GLFW_KEY_F, []() {
    std::cout << "F key was pressed." << std::endl;
});
```

---

## Internal Notes for Engine Developers

- Internally stores a `GLFWwindow* m_Window` for polling keys.
- Relies on `glfwGetKey(window, key)` to detect input state.
- Currently only handles key presses — no release/hold state tracking.
- Designed for engine-level tools, debugging, and editor shortcuts.

---

## Known Issues / TODOs

- No support for key release or held states.
- No mouse or gamepad input.
- No input remapping or key rebinding system.
- Not suitable for gameplay input handling — for that, a separate abstraction layer is needed.
- No handling for simultaneous key bindings or conditional logic chaining.

---

## When Not to Use

- **Game developers** should not use this for gameplay input. This is intended for debugging, editor tools, or engine-level operations.
- It does not provide input mapping, rebinding, or input profiles.

---

## Future Improvements

- Support for mouse input
- Support for key hold and release detection
- Input rebinding / named actions (e.g., `Input("Jump", ...)`)
- Centralized input event dispatching
- Context-based input layers (e.g., editor vs in-game)

