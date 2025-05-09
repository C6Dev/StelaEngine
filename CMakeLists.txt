cmake_minimum_required(VERSION 3.10)
project(Stela VERSION 1.0)

# Specify C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define source files
set(SOURCES
    Stela/src/Main.cpp
    Stela/src/API/Input/SInput.cpp
    Stela/src/API/Render/SRender.cpp
    Stela/src/API/Window/SWindow.cpp
    Stela/src/glad.c
    
    # ImGui source files
    Stela/Includes/imgui/imgui.cpp
    Stela/Includes/imgui/imgui_demo.cpp
    Stela/Includes/imgui/imgui_draw.cpp
    Stela/Includes/imgui/imgui_tables.cpp
    Stela/Includes/imgui/imgui_widgets.cpp
    Stela/Includes/imgui/backends/imgui_impl_glfw.cpp
    Stela/Includes/imgui/backends/imgui_impl_opengl3.cpp
)

# Define include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/Stela/Includes
    ${CMAKE_SOURCE_DIR}/Stela/src
    ${CMAKE_SOURCE_DIR}/Stela/Includes/imgui
    ${CMAKE_SOURCE_DIR}/Stela/Includes/imgui/backends
)

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES})

# Add preprocessor definitions for ImGui
target_compile_definitions(${PROJECT_NAME} PRIVATE
    IMGUI_IMPL_OPENGL_LOADER_GLAD
)

# Find and link GLFW
if(WIN32)
    # On Windows, use the provided GLFW library
    target_link_directories(${PROJECT_NAME} PRIVATE ${CMAKE_SOURCE_DIR}/Stela/Libs)
    target_link_libraries(${PROJECT_NAME} glfw3)
    
    # Windows-specific libraries needed for GLFW and ImGui
    target_link_libraries(${PROJECT_NAME} opengl32 gdi32 user32 shell32)
else()
    # On other platforms, try to find GLFW using CMake's find_package
    find_package(glfw3 REQUIRED)
    target_link_libraries(${PROJECT_NAME} glfw3)
    
    # Link OpenGL
    find_package(OpenGL REQUIRED)
    target_link_libraries(${PROJECT_NAME} OpenGL::GL)
endif()

# Copy shader files to build directory
add_custom_command(
    TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/Stela/src/Shaders $<TARGET_FILE_DIR:${PROJECT_NAME}>/Shaders
    COMMENT "Copying shader files to build directory"
)

# Installation rules
install(TARGETS ${PROJECT_NAME} DESTINATION bin)
install(DIRECTORY ${CMAKE_SOURCE_DIR}/Stela/src/Shaders/ DESTINATION bin/Shaders)