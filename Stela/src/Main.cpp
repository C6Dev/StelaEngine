#include <API/Window/SWindow.hpp>
#include <API/Input/SInput.hpp>

int main() {
   Stela::SWindow SWindow(800, 600, "Stela");
   Stela::SInput SInput;
   SInput.Init(SWindow.GetGLFWwindow());

   while (!SWindow.ShouldClose()) {
       SWindow.PollEvents();
       SWindow.ClearColor(0.2f, 0.3f, 0.3f, 1.0f);
       SWindow.ClearColorBuffer();
       SWindow.SwapBuffers();
       SInput.Input(GLFW_KEY_ESCAPE, [&] {
           glfwSetWindowShouldClose(SWindow.GetGLFWwindow(), true);
           });
   }
   return 0;
}