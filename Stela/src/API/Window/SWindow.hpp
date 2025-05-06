#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include <string>
#include <iostream>

namespace Stela {
	class SWindow {
	public:
		SWindow(int width, int height, const std::string& title);
		~SWindow();

		void PollEvents();
		void SwapBuffers();
		void ClearColor(float red, float green, float blue, float alpha);
		void ClearColorBuffer();
		bool ShouldClose() const;

	private:
		GLFWwindow* m_Window;
		static void FramebufferSizeCallback(GLFWwindow* window, int width, int height);
	};
} // namespace Stela