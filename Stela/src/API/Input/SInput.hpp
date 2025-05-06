#pragma once

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include <functional>

namespace Stela {
	class SInput {
	public:
	void Init(GLFWwindow* window);
	void Input(int key, const std::function<void()>& action) const;
	private:
		GLFWwindow* m_Window = nullptr;
	};
}