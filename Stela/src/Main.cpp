#include <API/Window/SWindow.hpp>
#include <API/Input/SInput.hpp>
#include <API/Terminal/ANSI/ANSIcolorCode.hpp>
#include <API/Render/SRender.hpp>
#include <API/UI/Theme.hpp>
#include "API/Config.hpp"

#include <imgui/imgui.h>
#include <imgui/backends/imgui_impl_glfw.h>
#include <imgui/backends/imgui_impl_opengl3.h>

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

   // Load window position and size from config
   if (Stela::Config::ConfigManager::GetInstance().LoadConfig()) {
       glfwSetWindowPos(SWindow.GetGLFWwindow(), 
           Stela::Config::ConfigManager::GetInstance().GetValue<int>("WindowPosX", 100),
           Stela::Config::ConfigManager::GetInstance().GetValue<int>("WindowPosY", 100));
       glfwSetWindowSize(SWindow.GetGLFWwindow(),
           Stela::Config::ConfigManager::GetInstance().GetValue<int>("WindowWidth", 800),
           Stela::Config::ConfigManager::GetInstance().GetValue<int>("WindowHeight", 600));
   }

   const GLchar* vertexShaderSource = SRender.loadShaderSource("Shaders/VertexShader.vert");
   const GLchar* fragmentShaderSource = SRender.loadShaderSource("Shaders/FragmentShader.frag");

   // Setup Dear ImGui context
   IMGUI_CHECKVERSION();
   ImGui::CreateContext();
   ImGuiIO& io = ImGui::GetIO();
   io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls
   io.ConfigFlags |= ImGuiConfigFlags_NavEnableGamepad;      // Enable Gamepad Controls
   io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;         // Enable Docking
   io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;       // Enable Multi-Viewport / Platform Windows

   // Setup Platform/Renderer backends
   ImGui_ImplGlfw_InitForOpenGL(SWindow.GetGLFWwindow(), true);
   ImGui_ImplOpenGL3_Init();

   // Setup custom theme
   Stela::UI::SetupTheme();

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

   bool wireframe = Stela::Config::ConfigManager::GetInstance().GetValue<bool>("Wireframe", false);
   bool show_properties = Stela::Config::ConfigManager::GetInstance().GetValue<bool>("ShowProperties", false);

   while (!SWindow.ShouldClose()) {
	   SWindow.PollEvents();

       // Save window position and size when they change
       int xpos, ypos, width, height;
       glfwGetWindowPos(SWindow.GetGLFWwindow(), &xpos, &ypos);
       glfwGetWindowSize(SWindow.GetGLFWwindow(), &width, &height);
       
       auto& config = Stela::Config::ConfigManager::GetInstance();
       if (xpos != config.GetValue<int>("WindowPosX", 100) || 
           ypos != config.GetValue<int>("WindowPosY", 100) ||
           width != config.GetValue<int>("WindowWidth", 800) || 
           height != config.GetValue<int>("WindowHeight", 600)) {
           config.SetValue("WindowPosX", xpos);
           config.SetValue("WindowPosY", ypos);
           config.SetValue("WindowWidth", width);
           config.SetValue("WindowHeight", height);
       }

	   // Start the Dear ImGui frame
	   ImGui_ImplOpenGL3_NewFrame();
	   ImGui_ImplGlfw_NewFrame();
	   ImGui::NewFrame();

       // Create the main menu bar
       if (ImGui::BeginMainMenuBar()) {
           if (ImGui::BeginMenu("File")) {
               if (ImGui::MenuItem("Exit", "Alt+F4")) {
                   glfwSetWindowShouldClose(SWindow.GetGLFWwindow(), true);
               }
               ImGui::EndMenu();
           }
           if (ImGui::BeginMenu("Tools")) {
               ImGui::MenuItem("Properties", NULL, &show_properties);
               if (ImGui::IsItemEdited()) {
                   config.SetValue("ShowProperties", show_properties);
               }
               ImGui::EndMenu();
           }
           ImGui::EndMainMenuBar();
       }

	   // Create a fullscreen window for the dockspace
	   ImGuiWindowFlags window_flags = ImGuiWindowFlags_NoDocking;
	   ImGuiViewport* viewport = ImGui::GetMainViewport();
	   ImGui::SetNextWindowPos(viewport->WorkPos);
	   ImGui::SetNextWindowSize(viewport->WorkSize);
	   ImGui::SetNextWindowViewport(viewport->ID);
	   ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0f);
	   ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
	   window_flags |= ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove;
	   window_flags |= ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoNavFocus;
	   window_flags |= ImGuiWindowFlags_NoBackground;

	   ImGui::Begin("Editor", nullptr, window_flags);
	   ImGui::PopStyleVar(2);

	   // DockSpace ID
	   ImGuiID dockspace_id = ImGui::GetID("EditorDockspace");
	   ImGui::DockSpace(dockspace_id, ImVec2(0.0f, 0.0f), ImGuiDockNodeFlags_PassthruCentralNode);

	   ImGui::End();
	   
       // Properties window
       if (show_properties) {
           ImGuiWindowFlags properties_flags = ImGuiWindowFlags_NoCollapse;
           ImGui::Begin("Properties", &show_properties, properties_flags);
           ImGui::Text("Wireframe Mode");
           ImGui::Checkbox("Wireframe", &wireframe);
           if (ImGui::IsItemEdited()) {
               config.SetValue("Wireframe", wireframe);
           }
           ImGui::End();
       }

	   // Render OpenGL content
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

	   // Render ImGui
	   ImGui::Render();
	   ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

       // Update and Render additional Platform Windows
       if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) {
           GLFWwindow* backup_current_context = glfwGetCurrentContext();
           ImGui::UpdatePlatformWindows();
           ImGui::RenderPlatformWindowsDefault();
           glfwMakeContextCurrent(backup_current_context);
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
           config.SetValue("Wireframe", wireframe);
		   });
   }

   ImGui_ImplOpenGL3_Shutdown();
   ImGui_ImplGlfw_Shutdown();
   ImGui::DestroyContext();
   SRender.~SRender();
   SWindow.~SWindow();
   std::cout << RESET;
   return 0;
}