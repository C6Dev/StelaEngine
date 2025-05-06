#include "SInput.hpp"
#include <API/Window/SWindow.hpp>

namespace Stela {
	void SInput::Init(GLFWwindow* window) {
		m_Window = window;
	}

	void SInput::Input(int key, const std::function<void()>& action) const {
		if (glfwGetKey(m_Window, key) == GLFW_PRESS)
			action();
	}
}