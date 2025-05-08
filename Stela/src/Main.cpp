#include <API/Window/SWindow.hpp>
#include <API/Input/SInput.hpp>
#include <API/Terminal/ANSI/ANSIcolorCode.hpp>
#include <API/Render/SRender.hpp>

float vertices[] = {
	 0.0f,  0.5f, 0.0f,  // Top center
	-0.5f, -0.5f, 0.0f,  // Bottom left
	 0.5f, -0.5f, 0.0f   // Bottom right
};
unsigned int indices[] = {  // note that we start from 0!
    0, 1, 2,   // first triangle
};

int main() {

   Stela::SRender SRender;
   Stela::SWindow SWindow(800, 600, "Stela");
   Stela::SInput SInput;
   SInput.Init(SWindow.GetGLFWwindow());
   const GLchar* vertexShaderSource = SRender.loadShaderSource("Shaders/VertexShader.vert");
   const GLchar* fragmentShaderSource = SRender.loadShaderSource("Shaders/FragmentShader.frag");

   SRender.initializeBuffers();
   unsigned int VBO = SRender.VBO;
   SRender.setBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

   unsigned int VAO = SRender.VAO;

   unsigned int EBO = SRender.EBO;

   unsigned int vertexShader = SRender.vertexShader;

   SRender.setShaderSource(vertexShader, &vertexShaderSource);
   SRender.CompileShader(vertexShader);

   unsigned int fragmentShader = SRender.FragmentShader;
   SRender.setShaderSource(fragmentShader, &fragmentShaderSource);
   SRender.CompileShader(fragmentShader);


   unsigned int shaderProgram = SRender.createAndLinkProgram(vertexShader, fragmentShader);

   SRender.UseProgram(shaderProgram);
   SRender.DeleteProgram(vertexShader);
   SRender.DeleteProgram(fragmentShader);

   SRender.setVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);


   SRender.BindVertexArray(VAO);

   SRender.BindBuffer(GL_ARRAY_BUFFER, VBO);
   SRender.BufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

   SRender.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
   SRender.BufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

   SRender.setVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
   SRender.EnableVertexAttribArray(0);

   bool wireframe = false;

   while (!SWindow.ShouldClose()) {
	   SWindow.PollEvents();
	   SWindow.ClearColor(0.2f, 0.3f, 0.3f, 1.0f);
	   SWindow.ClearColorBuffer();
	   SRender.UseProgram(shaderProgram);
	   SRender.BindVertexArray(VAO);
	   SRender.DrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
	   SRender.BindVertexArray(0);
	   if (wireframe == true) {
		   SRender.PolygonMode(GL_FRONT_AND_BACK, GL_LINE);
	   }
	   else {
		   SRender.PolygonMode(GL_FRONT_AND_BACK, GL_FILL);
	   }
       SWindow.SwapBuffers();
       SInput.Input(GLFW_KEY_ESCAPE, [&] {
           glfwSetWindowShouldClose(SWindow.GetGLFWwindow(), true);
           });
	   SInput.Input(GLFW_KEY_W, [&] {
		   if (wireframe == true) {
			   wireframe = false;
		   }
		   else if (wireframe == false) {
			   wireframe = true;
		   }
		   });
   }

   SRender.~SRender();
   SWindow.~SWindow();
   std::cout << RESET;
   return 0;
}