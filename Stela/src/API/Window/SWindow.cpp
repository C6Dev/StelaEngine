// Include the header for the SWindow class
#include "SWindow.hpp"

namespace Stela {

    // Constructor: initializes GLFW, creates the window, sets up OpenGL context, and loads GLAD
    SWindow::SWindow(int width, int height, const std::string& title) {
        // Initialize GLFW
        glfwInit();

        // Set the OpenGL version to 3.3 and use the core profile
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

        // Create the GLFW window
        m_Window = glfwCreateWindow(width, height, title.c_str(), nullptr, nullptr);
        if (!m_Window) {
            glfwTerminate();
            throw std::runtime_error("Failed to create GLFW window");
        }

        // Make the context of the window current for OpenGL rendering
        glfwMakeContextCurrent(m_Window);

        // Load all OpenGL function pointers using GLAD
        if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
            glfwTerminate();
            throw std::runtime_error("Failed to initialize GLAD");
        }

        // Set the callback for when the window is resized
        glfwSetFramebufferSizeCallback(m_Window, FramebufferSizeCallback);
    }

    // Destructor: properly destroys the window and terminates GLFW
    SWindow::~SWindow() {
        glfwDestroyWindow(m_Window);
        glfwTerminate();
    }

    // Callback function that adjusts the OpenGL viewport when the window size changes
    void SWindow::FramebufferSizeCallback(GLFWwindow*, int width, int height) {
        glViewport(0, 0, width, height);
    }

    // Polls for window events (e.g., input, window move, resize)
    void SWindow::PollEvents() {
        glfwPollEvents();
    }

    GLFWwindow* SWindow::GetGLFWwindow() const {
        return m_Window;
    }

    // Swaps the front and back buffers (used for double buffering)
    void SWindow::SwapBuffers() {
        glfwSwapBuffers(m_Window);
    }

    // Sets the color used when clearing the color buffer
    void SWindow::ClearColor(float red, float green, float blue, float alpha) {
        glClearColor(red, green, blue, alpha);
    }

    // Clears the color buffer using the color set by glClearColor
    void SWindow::ClearColorBuffer() {
        glClear(GL_COLOR_BUFFER_BIT);
    }

    // Checks whether the window should close (typically triggered by the user pressing the close button or ESC)
    bool SWindow::ShouldClose() const {
        return glfwWindowShouldClose(m_Window);
    }

}
