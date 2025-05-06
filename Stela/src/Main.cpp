#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include <iostream>
#include <API/Window/SWindow.hpp>

int main() {
	Stela::SWindow SWindow(800, 600, "Stela");

	while (!SWindow.ShouldClose()) {
		SWindow.PollEvents();
		SWindow.ClearColor(0.2f, 0.3f, 0.3f, 1.0f);
		SWindow.ClearColorBuffer();
		SWindow.SwapBuffers();
	}
	return 0;
}